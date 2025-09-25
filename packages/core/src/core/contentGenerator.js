/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { DEFAULT_GEMINI_MODEL, DEFAULT_QWEN_MODEL } from '../config/models.js';
import { getEffectiveModel } from './modelCheck.js';
export var AuthType;
(function (AuthType) {
  AuthType['LOGIN_WITH_GOOGLE'] = 'oauth-personal';
  AuthType['USE_GEMINI'] = 'gemini-api-key';
  AuthType['USE_VERTEX_AI'] = 'vertex-ai';
  AuthType['CLOUD_SHELL'] = 'cloud-shell';
  AuthType['USE_OPENAI'] = 'openai';
  AuthType['QWEN_OAUTH'] = 'qwen-oauth';
})(AuthType || (AuthType = {}));
export function createContentGeneratorConfig(config, authType) {
  const geminiApiKey = process.env.GEMINI_API_KEY || undefined;
  const googleApiKey = process.env.GOOGLE_API_KEY || undefined;
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT || undefined;
  const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION || undefined;
  const openaiApiKey = process.env.NEBIUS_API_KEY;
  // Use runtime model from config if available; otherwise, fall back to parameter or default
  const effectiveModel = config.getModel() || DEFAULT_GEMINI_MODEL;
  const contentGeneratorConfig = {
    model: effectiveModel,
    authType,
    proxy: config?.getProxy(),
    enableOpenAILogging: config.getEnableOpenAILogging(),
    timeout: config.getContentGeneratorTimeout(),
    maxRetries: config.getContentGeneratorMaxRetries(),
    samplingParams: config.getSamplingParams(),
  };
  // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.CLOUD_SHELL
  ) {
    return contentGeneratorConfig;
  }
  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.vertexai = false;
    getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
      contentGeneratorConfig.proxy,
    );
    return contentGeneratorConfig;
  }
  if (
    authType === AuthType.USE_VERTEX_AI &&
    (googleApiKey || (googleCloudProject && googleCloudLocation))
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;
    return contentGeneratorConfig;
  }
  if (authType === AuthType.USE_OPENAI && openaiApiKey) {
    contentGeneratorConfig.apiKey = openaiApiKey;
    contentGeneratorConfig.model =
      process.env.NEBIUS_MODEL || DEFAULT_GEMINI_MODEL;
    return contentGeneratorConfig;
  }
  if (authType === AuthType.QWEN_OAUTH) {
    // For Nebius OAuth, we'll handle the API key dynamically in createContentGenerator
    // Set a special marker to indicate this is Nebius OAuth
    contentGeneratorConfig.apiKey = 'QWEN_OAUTH_DYNAMIC_TOKEN';
    // Prefer to use qwen3-coder-plus as the default Nebius model if QWEN_MODEL is not set.
    contentGeneratorConfig.model = process.env.QWEN_MODEL || DEFAULT_QWEN_MODEL;
    return contentGeneratorConfig;
  }
  return contentGeneratorConfig;
}
export async function createContentGenerator(config, gcConfig, sessionId) {
  const version = gcConfig.getCliVersion() || 'unknown';
  const httpOptions = {
    headers: {
      'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
    },
  };
  if (
    config.authType === AuthType.LOGIN_WITH_GOOGLE ||
    config.authType === AuthType.CLOUD_SHELL
  ) {
    return createCodeAssistContentGenerator(
      httpOptions,
      config.authType,
      gcConfig,
      sessionId,
    );
  }
  if (
    config.authType === AuthType.USE_GEMINI ||
    config.authType === AuthType.USE_VERTEX_AI
  ) {
    const googleGenAI = new GoogleGenAI({
      apiKey: config.apiKey === '' ? undefined : config.apiKey,
      vertexai: config.vertexai,
      httpOptions,
    });
    return googleGenAI.models;
  }
  if (config.authType === AuthType.USE_OPENAI) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    // Import OpenAIContentGenerator dynamically to avoid circular dependencies
    const { OpenAIContentGenerator } = await import(
      './openaiContentGenerator.js'
    );
    // Always use OpenAIContentGenerator, logging is controlled by enableOpenAILogging flag
    return new OpenAIContentGenerator(config.apiKey, config.model, gcConfig);
  }
  if (config.authType === AuthType.QWEN_OAUTH) {
    if (config.apiKey !== 'QWEN_OAUTH_DYNAMIC_TOKEN') {
      throw new Error('Invalid Nebius OAuth configuration');
    }
    // Import required classes dynamically
    const { getNebiusOAuthClient: getNebiusOauthClient } = await import(
      '../nebius/nebiusOAuth2.js'
    );
    const { NebiusContentGenerator } = await import(
      '../nebius/nebiusContentGenerator.js'
    );
    try {
      // Get the Nebius OAuth client (now includes integrated token management)
      const qwenClient = await getNebiusOauthClient(gcConfig);
      // Create the content generator with dynamic token management
      return new NebiusContentGenerator(qwenClient, config.model, gcConfig);
    } catch (error) {
      throw new Error(
        `Failed to initialize Nebius: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  throw new Error(
    `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
  );
}
//# sourceMappingURL=contentGenerator.js.map
