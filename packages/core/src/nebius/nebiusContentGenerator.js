/**
 * @license
 * Copyright 2025 Nebius
 * SPDX-License-Identifier: Apache-2.0
 */
import { OpenAIContentGenerator } from '../core/openaiContentGenerator.js';
import { isErrorResponse } from './nebiusOAuth2.js';
// Default fallback base URL if no endpoint is provided
const DEFAULT_QWEN_BASE_URL =
  'https://dashscope.aliyuncs.com/compatible-mode/v1';
/**
 * Nebius Content Generator that uses Nebius OAuth tokens with automatic refresh
 */
export class NebiusContentGenerator extends OpenAIContentGenerator {
  qwenClient;
  // Token management (integrated from NebiusTokenManager)
  currentToken = null;
  currentEndpoint = null;
  refreshPromise = null;
  constructor(qwenClient, model, config) {
    // Initialize with empty API key, we'll override it dynamically
    super('', model, config);
    this.qwenClient = qwenClient;
    // Set default base URL, will be updated dynamically
    this.client.baseURL = DEFAULT_QWEN_BASE_URL;
  }
  /**
   * Get the current endpoint URL with proper protocol and /v1 suffix
   */
  getCurrentEndpoint() {
    const baseEndpoint = this.currentEndpoint || DEFAULT_QWEN_BASE_URL;
    const suffix = '/v1';
    // Normalize the URL: add protocol if missing, ensure /v1 suffix
    const normalizedUrl = baseEndpoint.startsWith('http')
      ? baseEndpoint
      : `https://${baseEndpoint}`;
    return normalizedUrl.endsWith(suffix)
      ? normalizedUrl
      : `${normalizedUrl}${suffix}`;
  }
  /**
   * Override error logging behavior to suppress auth errors during token refresh
   */
  shouldSuppressErrorLogging(error, _request) {
    // Suppress logging for authentication errors that we handle with token refresh
    return this.isAuthError(error);
  }
  /**
   * Override to use dynamic token and endpoint
   */
  async generateContent(request, userPromptId) {
    return this.withValidToken(async (token) => {
      // Temporarily update the API key and base URL
      const originalApiKey = this.client.apiKey;
      const originalBaseURL = this.client.baseURL;
      this.client.apiKey = token;
      this.client.baseURL = this.getCurrentEndpoint();
      try {
        return await super.generateContent(request, userPromptId);
      } finally {
        // Restore original values
        this.client.apiKey = originalApiKey;
        this.client.baseURL = originalBaseURL;
      }
    });
  }
  /**
   * Override to use dynamic token and endpoint
   */
  async generateContentStream(request, userPromptId) {
    return this.withValidTokenForStream(async (token) => {
      // Update the API key and base URL before streaming
      const originalApiKey = this.client.apiKey;
      const originalBaseURL = this.client.baseURL;
      this.client.apiKey = token;
      this.client.baseURL = this.getCurrentEndpoint();
      try {
        return await super.generateContentStream(request, userPromptId);
      } catch (error) {
        // Restore original values on error
        this.client.apiKey = originalApiKey;
        this.client.baseURL = originalBaseURL;
        throw error;
      }
      // Note: We don't restore the values in finally for streaming because
      // the generator may continue to be used after this method returns
    });
  }
  /**
   * Override to use dynamic token and endpoint
   */
  async countTokens(request) {
    return this.withValidToken(async (token) => {
      const originalApiKey = this.client.apiKey;
      const originalBaseURL = this.client.baseURL;
      this.client.apiKey = token;
      this.client.baseURL = this.getCurrentEndpoint();
      try {
        return await super.countTokens(request);
      } finally {
        this.client.apiKey = originalApiKey;
        this.client.baseURL = originalBaseURL;
      }
    });
  }
  /**
   * Override to use dynamic token and endpoint
   */
  async embedContent(request) {
    return this.withValidToken(async (token) => {
      const originalApiKey = this.client.apiKey;
      const originalBaseURL = this.client.baseURL;
      this.client.apiKey = token;
      this.client.baseURL = this.getCurrentEndpoint();
      try {
        return await super.embedContent(request);
      } finally {
        this.client.apiKey = originalApiKey;
        this.client.baseURL = originalBaseURL;
      }
    });
  }
  /**
   * Execute operation with a valid token, with retry on auth failure
   */
  async withValidToken(operation) {
    const token = await this.getTokenWithRetry();
    try {
      return await operation(token);
    } catch (error) {
      // Check if this is an authentication error
      if (this.isAuthError(error)) {
        // Refresh token and retry once silently
        const newToken = await this.refreshToken();
        return await operation(newToken);
      }
      throw error;
    }
  }
  /**
   * Execute operation with a valid token for streaming, with retry on auth failure
   */
  async withValidTokenForStream(operation) {
    const token = await this.getTokenWithRetry();
    try {
      return await operation(token);
    } catch (error) {
      // Check if this is an authentication error
      if (this.isAuthError(error)) {
        // Refresh token and retry once silently
        const newToken = await this.refreshToken();
        return await operation(newToken);
      }
      throw error;
    }
  }
  /**
   * Get token with retry logic
   */
  async getTokenWithRetry() {
    try {
      return await this.getValidToken();
    } catch (error) {
      console.error('Failed to get valid token:', error);
      throw new Error(
        'Failed to obtain valid Nebius access token. Please re-authenticate.',
      );
    }
  }
  // Token management methods (integrated from NebiusTokenManager)
  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidToken() {
    // If there's already a refresh in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    try {
      const { token } = await this.qwenClient.getAccessToken();
      if (token) {
        this.currentToken = token;
        // Also update endpoint from current credentials
        const credentials = this.qwenClient.getCredentials();
        if (credentials.resource_url) {
          this.currentEndpoint = credentials.resource_url;
        }
        return token;
      }
    } catch (error) {
      console.warn('Failed to get access token, attempting refresh:', error);
    }
    // Start a new refresh operation
    this.refreshPromise = this.performTokenRefresh();
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }
  /**
   * Force refresh the access token
   */
  async refreshToken() {
    this.refreshPromise = this.performTokenRefresh();
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }
  async performTokenRefresh() {
    try {
      const response = await this.qwenClient.refreshAccessToken();
      if (isErrorResponse(response)) {
        const errorData = response;
        throw new Error(
          `${errorData?.error || 'Unknown error'} - ${errorData?.error_description || 'No details provided'}`,
        );
      }
      const tokenData = response;
      if (!tokenData.access_token) {
        throw new Error('Failed to refresh access token: no token returned');
      }
      this.currentToken = tokenData.access_token;
      // Update endpoint if provided
      if (tokenData.resource_url) {
        this.currentEndpoint = tokenData.resource_url;
      }
      return tokenData.access_token;
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  /**
   * Check if an error is related to authentication/authorization
   */
  isAuthError(error) {
    if (!error) return false;
    const errorMessage =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();
    // Define a type for errors that might have status or code properties
    const errorWithCode = error;
    const errorCode = errorWithCode?.status || errorWithCode?.code;
    return (
      errorCode === 400 ||
      errorCode === 401 ||
      errorCode === 403 ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('invalid api key') ||
      errorMessage.includes('invalid access token') ||
      errorMessage.includes('token expired') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('access denied') ||
      (errorMessage.includes('token') && errorMessage.includes('expired'))
    );
  }
  /**
   * Get the current cached token (may be expired)
   */
  getCurrentToken() {
    return this.currentToken;
  }
  /**
   * Clear the cached token and endpoint
   */
  clearToken() {
    this.currentToken = null;
    this.currentEndpoint = null;
    this.refreshPromise = null;
  }
}
//# sourceMappingURL=nebiusContentGenerator.js.map
