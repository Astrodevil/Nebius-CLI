/**
 * @license
 * Copyright 2025 Nebius
 * SPDX-License-Identifier: Apache-2.0
 */
import crypto from 'crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import * as os from 'os';
import open from 'open';
import { EventEmitter } from 'events';
import { randomUUID } from 'node:crypto';
// OAuth Endpoints
const QWEN_OAUTH_BASE_URL = 'https://chat.qwen.ai';
const QWEN_OAUTH_DEVICE_CODE_ENDPOINT = `${QWEN_OAUTH_BASE_URL}/api/v1/oauth2/device/code`;
const QWEN_OAUTH_TOKEN_ENDPOINT = `${QWEN_OAUTH_BASE_URL}/api/v1/oauth2/token`;
// OAuth Client Configuration
const QWEN_OAUTH_CLIENT_ID = 'f0304373b74a44d2b584a3fb70ca9e56';
const QWEN_OAUTH_SCOPE = 'openid profile email model.completion';
const QWEN_OAUTH_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';
// File System Configuration
const QWEN_DIR = '.nebius';
const QWEN_CREDENTIAL_FILENAME = 'oauth_creds.json';
// Token Configuration
const TOKEN_REFRESH_BUFFER_MS = 30 * 1000; // 30 seconds
/**
 * PKCE (Proof Key for Code Exchange) utilities
 * Implements RFC 7636 - Proof Key for Code Exchange by OAuth Public Clients
 */
/**
 * Generate a random code verifier for PKCE
 * @returns A random string of 43-128 characters
 */
export function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}
/**
 * Generate a code challenge from a code verifier using SHA-256
 * @param codeVerifier The code verifier string
 * @returns The code challenge string
 */
export function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256');
  hash.update(codeVerifier);
  return hash.digest('base64url');
}
/**
 * Generate PKCE code verifier and challenge pair
 * @returns Object containing code_verifier and code_challenge
 */
export function generatePKCEPair() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  return { code_verifier: codeVerifier, code_challenge: codeChallenge };
}
/**
 * Convert object to URL-encoded form data
 * @param data The object to convert
 * @returns URL-encoded string
 */
function objectToUrlEncoded(data) {
  return Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&');
}
/**
 * Type guard to check if device authorization was successful
 */
export function isDeviceAuthorizationSuccess(response) {
  return 'device_code' in response;
}
/**
 * Type guard to check if device token response was successful
 */
export function isDeviceTokenSuccess(response) {
  return (
    'access_token' in response &&
    response.access_token !== null &&
    response.access_token !== undefined &&
    typeof response.access_token === 'string' &&
    response.access_token.length > 0
  );
}
/**
 * Type guard to check if device token response is pending
 */
export function isDeviceTokenPending(response) {
  return 'status' in response && response.status === 'pending';
}
/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response) {
  return 'error' in response;
}
/**
 * Nebius OAuth2 client implementation
 */
export class NebiusOAuth2Client {
  credentials = {};
  proxy;
  constructor(options) {
    this.proxy = options.proxy;
  }
  setCredentials(credentials) {
    this.credentials = credentials;
  }
  getCredentials() {
    return this.credentials;
  }
  async getAccessToken() {
    if (this.credentials.access_token && this.isTokenValid()) {
      return { token: this.credentials.access_token };
    }
    if (this.credentials.refresh_token) {
      const refreshResponse = await this.refreshAccessToken();
      const tokenData = refreshResponse;
      return { token: tokenData.access_token };
    }
    return { token: undefined };
  }
  async requestDeviceAuthorization(options) {
    const bodyData = {
      client_id: QWEN_OAUTH_CLIENT_ID,
      scope: options.scope,
      code_challenge: options.code_challenge,
      code_challenge_method: options.code_challenge_method,
    };
    const response = await fetch(QWEN_OAUTH_DEVICE_CODE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'x-request-id': randomUUID(),
      },
      body: objectToUrlEncoded(bodyData),
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Device authorization failed: ${response.status} ${response.statusText}. Response: ${errorData}`,
      );
    }
    const result = await response.json();
    console.log('Device authorization result:', result);
    // Check if the response indicates success
    if (!isDeviceAuthorizationSuccess(result)) {
      const errorData = result;
      throw new Error(
        `Device authorization failed: ${errorData?.error || 'Unknown error'} - ${errorData?.error_description || 'No details provided'}`,
      );
    }
    return result;
  }
  async pollDeviceToken(options) {
    const bodyData = {
      grant_type: QWEN_OAUTH_GRANT_TYPE,
      client_id: QWEN_OAUTH_CLIENT_ID,
      device_code: options.device_code,
      code_verifier: options.code_verifier,
    };
    const response = await fetch(QWEN_OAUTH_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: objectToUrlEncoded(bodyData),
    });
    if (!response.ok) {
      // Parse the response as JSON to check for OAuth RFC 8628 standard errors
      try {
        const errorData = await response.json();
        // According to OAuth RFC 8628, handle standard polling responses
        if (
          response.status === 400 &&
          errorData.error === 'authorization_pending'
        ) {
          // User has not yet approved the authorization request. Continue polling.
          return { status: 'pending' };
        }
        if (response.status === 429 && errorData.error === 'slow_down') {
          // Client is polling too frequently. Return pending with slowDown flag.
          return {
            status: 'pending',
            slowDown: true,
          };
        }
        // Handle other 400 errors (access_denied, expired_token, etc.) as real errors
        // For other errors, throw with proper error information
        const error = new Error(
          `Device token poll failed: ${errorData.error || 'Unknown error'} - ${errorData.error_description || 'No details provided'}`,
        );
        error.status = response.status;
        throw error;
      } catch (_parseError) {
        // If JSON parsing fails, fall back to text response
        const errorData = await response.text();
        const error = new Error(
          `Device token poll failed: ${response.status} ${response.statusText}. Response: ${errorData}`,
        );
        error.status = response.status;
        throw error;
      }
    }
    return await response.json();
  }
  async refreshAccessToken() {
    if (!this.credentials.refresh_token) {
      throw new Error('No refresh token available');
    }
    const bodyData = {
      grant_type: 'refresh_token',
      refresh_token: this.credentials.refresh_token,
      client_id: QWEN_OAUTH_CLIENT_ID,
    };
    const response = await fetch(QWEN_OAUTH_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: objectToUrlEncoded(bodyData),
    });
    if (!response.ok) {
      const errorData = await response.text();
      // Handle 401 errors which might indicate refresh token expiry
      if (response.status === 400) {
        await clearNebiusCredentials();
        throw new Error(
          "Refresh token expired or invalid. Please use '/auth' to re-authenticate.",
        );
      }
      throw new Error(
        `Token refresh failed: ${response.status} ${response.statusText}. Response: ${errorData}`,
      );
    }
    const responseData = await response.json();
    // Check if the response indicates success
    if (isErrorResponse(responseData)) {
      const errorData = responseData;
      throw new Error(
        `Token refresh failed: ${errorData?.error || 'Unknown error'} - ${errorData?.error_description || 'No details provided'}`,
      );
    }
    // Handle successful response
    const tokenData = responseData;
    const tokens = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      // Use new refresh token if provided, otherwise preserve existing one
      refresh_token: tokenData.refresh_token || this.credentials.refresh_token,
      resource_url: tokenData.resource_url, // Include resource_url if provided
      expiry_date: Date.now() + tokenData.expires_in * 1000,
    };
    this.setCredentials(tokens);
    // Cache the updated credentials to file
    await cacheNebiusCredentials(tokens);
    return responseData;
  }
  isTokenValid() {
    if (!this.credentials.expiry_date) {
      return false;
    }
    // Check if token expires within the refresh buffer time
    return Date.now() < this.credentials.expiry_date - TOKEN_REFRESH_BUFFER_MS;
  }
}
export var NebiusOAuth2Event;
(function (NebiusOAuth2Event) {
  NebiusOAuth2Event['AuthUri'] = 'auth-uri';
  NebiusOAuth2Event['AuthProgress'] = 'auth-progress';
  NebiusOAuth2Event['AuthCancel'] = 'auth-cancel';
})(NebiusOAuth2Event || (NebiusOAuth2Event = {}));
/**
 * Global event emitter instance for NebiusOAuth2 authentication events
 */
export const nebiusOAuth2Events = new EventEmitter();
// Backward compatibility alias during rebrand
export const qwenOAuth2Events = nebiusOAuth2Events;
export async function getNebiusOAuthClient(config) {
  const client = new NebiusOAuth2Client({
    proxy: config.getProxy(),
  });
  // If there are cached creds on disk, they always take precedence
  if (await loadCachedNebiusCredentials(client)) {
    console.log('Loaded cached Nebius credentials.');
    try {
      await client.refreshAccessToken();
      return client;
    } catch (error) {
      // Handle refresh token errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isInvalidToken = errorMessage.includes(
        'Refresh token expired or invalid',
      );
      const userMessage = isInvalidToken
        ? 'Cached credentials are invalid. Please re-authenticate.'
        : `Token refresh failed: ${errorMessage}`;
      const throwMessage = isInvalidToken
        ? 'Cached Nebius credentials are invalid. Please re-authenticate.'
        : `Nebius token refresh failed: ${errorMessage}`;
      // Emit token refresh error event
      qwenOAuth2Events.emit(
        NebiusOAuth2Event.AuthProgress,
        'error',
        userMessage,
      );
      throw new Error(throwMessage);
    }
  }
  // Use device authorization flow for authentication (single attempt)
  const result = await authWithNebiusDeviceFlow(client, config);
  if (!result.success) {
    // Only emit timeout event if the failure reason is actually timeout
    // Other error types (401, 429, etc.) have already emitted their specific events
    if (result.reason === 'timeout') {
      qwenOAuth2Events.emit(
        NebiusOAuth2Event.AuthProgress,
        'timeout',
        'Authentication timed out. Please try again or select a different authentication method.',
      );
    }
    // Throw error with appropriate message based on failure reason
    switch (result.reason) {
      case 'timeout':
        throw new Error('Nebius OAuth authentication timed out');
      case 'cancelled':
        throw new Error('Nebius OAuth authentication was cancelled by user');
      case 'rate_limit':
        throw new Error(
          'Too many request for Nebius OAuth authentication, please try again later.',
        );
      case 'error':
      default:
        throw new Error('Nebius OAuth authentication failed');
    }
  }
  return client;
}
async function authWithNebiusDeviceFlow(client, config) {
  let isCancelled = false;
  // Set up cancellation listener
  const cancelHandler = () => {
    isCancelled = true;
  };
  nebiusOAuth2Events.once(NebiusOAuth2Event.AuthCancel, cancelHandler);
  try {
    // Generate PKCE code verifier and challenge
    const { code_verifier, code_challenge } = generatePKCEPair();
    // Request device authorization
    const deviceAuth = await client.requestDeviceAuthorization({
      scope: QWEN_OAUTH_SCOPE,
      code_challenge,
      code_challenge_method: 'S256',
    });
    // Ensure we have a successful authorization response
    if (!isDeviceAuthorizationSuccess(deviceAuth)) {
      const errorData = deviceAuth;
      throw new Error(
        `Device authorization failed: ${errorData?.error || 'Unknown error'} - ${errorData?.error_description || 'No details provided'}`,
      );
    }
    // Emit device authorization event for UI integration immediately
    nebiusOAuth2Events.emit(NebiusOAuth2Event.AuthUri, deviceAuth);
    const showFallbackMessage = () => {
      console.log('\n=== Nebius OAuth Device Authorization ===');
      console.log(
        'Please visit the following URL in your browser to authorize:',
      );
      console.log(`\n${deviceAuth.verification_uri_complete}\n`);
      console.log('Waiting for authorization to complete...\n');
    };
    // If browser launch is not suppressed, try to open the URL
    if (!config.isBrowserLaunchSuppressed()) {
      try {
        const childProcess = await open(deviceAuth.verification_uri_complete);
        // IMPORTANT: Attach an error handler to the returned child process.
        // Without this, if `open` fails to spawn a process (e.g., `xdg-open` is not found
        // in a minimal Docker container), it will emit an unhandled 'error' event,
        // causing the entire Node.js process to crash.
        if (childProcess) {
          childProcess.on('error', () => {
            console.log('Failed to open browser. Visit this URL to authorize:');
            showFallbackMessage();
          });
        }
      } catch (_err) {
        showFallbackMessage();
      }
    } else {
      // Browser launch is suppressed, show fallback message
      showFallbackMessage();
    }
    // Emit auth progress event
    nebiusOAuth2Events.emit(
      NebiusOAuth2Event.AuthProgress,
      'polling',
      'Waiting for authorization...',
    );
    console.log('Waiting for authorization...\n');
    // Poll for the token
    let pollInterval = 2000; // 2 seconds, can be increased if slow_down is received
    const maxAttempts = Math.ceil(
      deviceAuth.expires_in / (pollInterval / 1000),
    );
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check if authentication was cancelled
      if (isCancelled) {
        console.log('\nAuthentication cancelled by user.');
        nebiusOAuth2Events.emit(
          NebiusOAuth2Event.AuthProgress,
          'error',
          'Authentication cancelled by user.',
        );
        return { success: false, reason: 'cancelled' };
      }
      try {
        console.log('polling for token...');
        const tokenResponse = await client.pollDeviceToken({
          device_code: deviceAuth.device_code,
          code_verifier,
        });
        // Check if the response is successful and contains token data
        if (isDeviceTokenSuccess(tokenResponse)) {
          const tokenData = tokenResponse;
          // Convert to NebiusCredentials format
          const credentials = {
            access_token: tokenData.access_token, // Safe to assert as non-null due to isDeviceTokenSuccess check
            refresh_token: tokenData.refresh_token || undefined,
            token_type: tokenData.token_type,
            resource_url: tokenData.resource_url,
            expiry_date: tokenData.expires_in
              ? Date.now() + tokenData.expires_in * 1000
              : undefined,
          };
          client.setCredentials(credentials);
          // Cache the new tokens
          await cacheNebiusCredentials(credentials);
          // Emit auth progress success event
          nebiusOAuth2Events.emit(
            NebiusOAuth2Event.AuthProgress,
            'success',
            'Authentication successful! Access token obtained.',
          );
          console.log('Authentication successful! Access token obtained.');
          return { success: true };
        }
        // Check if the response is pending
        if (isDeviceTokenPending(tokenResponse)) {
          const pendingData = tokenResponse;
          // Handle slow_down error by increasing poll interval
          if (pendingData.slowDown) {
            pollInterval = Math.min(pollInterval * 1.5, 10000); // Increase by 50%, max 10 seconds
            console.log(
              `\nServer requested to slow down, increasing poll interval to ${pollInterval}ms`,
            );
          } else {
            pollInterval = 2000; // Reset to default interval
          }
          // Emit polling progress event
          nebiusOAuth2Events.emit(
            NebiusOAuth2Event.AuthProgress,
            'polling',
            `Polling... (attempt ${attempt + 1}/${maxAttempts})`,
          );
          process.stdout.write('.');
          // Wait with cancellation check every 100ms
          await new Promise((resolve) => {
            const checkInterval = 100; // Check every 100ms
            let elapsedTime = 0;
            const intervalId = setInterval(() => {
              elapsedTime += checkInterval;
              // Check for cancellation during wait
              if (isCancelled) {
                clearInterval(intervalId);
                resolve();
                return;
              }
              // Complete wait when interval is reached
              if (elapsedTime >= pollInterval) {
                clearInterval(intervalId);
                resolve();
                return;
              }
            }, checkInterval);
          });
          // Check for cancellation after waiting
          if (isCancelled) {
            console.log('\nAuthentication cancelled by user.');
            nebiusOAuth2Events.emit(
              NebiusOAuth2Event.AuthProgress,
              'error',
              'Authentication cancelled by user.',
            );
            return { success: false, reason: 'cancelled' };
          }
          continue;
        }
        // Handle error response
        if (isErrorResponse(tokenResponse)) {
          const errorData = tokenResponse;
          throw new Error(
            `Token polling failed: ${errorData?.error || 'Unknown error'} - ${errorData?.error_description || 'No details provided'}`,
          );
        }
      } catch (error) {
        // Handle specific error cases
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const statusCode = error instanceof Error ? error.status : null;
        if (errorMessage.includes('401') || statusCode === 401) {
          const message =
            'Device code expired or invalid, please restart the authorization process.';
          // Emit error event
          nebiusOAuth2Events.emit(
            NebiusOAuth2Event.AuthProgress,
            'error',
            message,
          );
          return { success: false, reason: 'error' };
        }
        // Handle 429 Too Many Requests error
        if (errorMessage.includes('429') || statusCode === 429) {
          const message =
            'Too many requests. The server is rate limiting our requests. Please select a different authentication method or try again later.';
          // Emit rate limit event to notify user
          nebiusOAuth2Events.emit(
            NebiusOAuth2Event.AuthProgress,
            'rate_limit',
            message,
          );
          console.log('\n' + message);
          // Return false to stop polling and go back to auth selection
          return { success: false, reason: 'rate_limit' };
        }
        const message = `Error polling for token: ${errorMessage}`;
        // Emit error event
        qwenOAuth2Events.emit(NebiusOAuth2Event.AuthProgress, 'error', message);
        // Check for cancellation before waiting
        if (isCancelled) {
          return { success: false, reason: 'cancelled' };
        }
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }
    const timeoutMessage = 'Authorization timeout, please restart the process.';
    // Emit timeout error event
    nebiusOAuth2Events.emit(
      NebiusOAuth2Event.AuthProgress,
      'timeout',
      timeoutMessage,
    );
    console.error('\n' + timeoutMessage);
    return { success: false, reason: 'timeout' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Device authorization flow failed:', errorMessage);
    return { success: false, reason: 'error' };
  } finally {
    // Clean up event listener
    nebiusOAuth2Events.off(NebiusOAuth2Event.AuthCancel, cancelHandler);
  }
}
async function loadCachedNebiusCredentials(client) {
  try {
    const keyFile = getNebiusCachedCredentialPath();
    const creds = await fs.readFile(keyFile, 'utf-8');
    const credentials = JSON.parse(creds);
    client.setCredentials(credentials);
    // Verify that the credentials are still valid
    const { token } = await client.getAccessToken();
    if (!token) {
      return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}
async function cacheNebiusCredentials(credentials) {
  const filePath = getNebiusCachedCredentialPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const credString = JSON.stringify(credentials, null, 2);
  await fs.writeFile(filePath, credString);
}
/**
 * Clear cached Nebius credentials from disk
 * This is useful when credentials have expired or need to be reset
 */
export async function clearNebiusCredentials() {
  try {
    const filePath = getNebiusCachedCredentialPath();
    await fs.unlink(filePath);
    console.log('Cached Nebius credentials cleared successfully.');
  } catch (error) {
    // If file doesn't exist or can't be deleted, we consider it cleared
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // File doesn't exist, already cleared
      return;
    }
    // Log other errors but don't throw - clearing credentials should be non-critical
    console.warn('Warning: Failed to clear cached Nebius credentials:', error);
  }
}
function getNebiusCachedCredentialPath() {
  return path.join(os.homedir(), QWEN_DIR, QWEN_CREDENTIAL_FILENAME);
}
//# sourceMappingURL=nebiusOAuth2.js.map
