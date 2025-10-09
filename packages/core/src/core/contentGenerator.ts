/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { DEFAULT_GEMINI_MODEL, DEFAULT_QWEN_MODEL } from '../config/models.js';
import { Config } from '../config/config.js';
import { getEffectiveModel } from './modelCheck.js';
import { UserTierId } from '../code_assist/types.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  userTier?: UserTierId;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  USE_OPENAI = 'openai',
  QWEN_OAUTH = 'qwen-oauth',
}

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
  enableOpenAILogging?: boolean;
  // Timeout configuration in milliseconds
  timeout?: number;
  // Maximum retries for failed requests
  maxRetries?: number;
  samplingParams?: {
    top_p?: number;
    top_k?: number;
    repetition_penalty?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    temperature?: number;
    max_tokens?: number;
  };
  proxy?: string | undefined;
};

export function createContentGeneratorConfig(
  config: Config,
  authType: AuthType | undefined,
): ContentGeneratorConfig {
  // GCP-related environment variables intentionally unused (removed)
  const openaiApiKey = process.env.NEBIUS_API_KEY;

  // Use runtime model from config if available; otherwise, fall back to parameter or default
  const effectiveModel = config.getModel() || DEFAULT_GEMINI_MODEL;

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
    proxy: config?.getProxy(),
    enableOpenAILogging: config.getEnableOpenAILogging(),
    timeout: config.getContentGeneratorTimeout(),
    maxRetries: config.getContentGeneratorMaxRetries(),
    samplingParams: config.getSamplingParams(),
  };

  // GCP-related auth types are unsupported
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.CLOUD_SHELL
  ) {
    return contentGeneratorConfig;
  }

  // Removed GEMINI API key flow

  // Removed Vertex AI flow

  if (authType === AuthType.USE_OPENAI && openaiApiKey) {
    contentGeneratorConfig.apiKey = openaiApiKey;
    // Use model from config (which includes settings.model) instead of just env var
    contentGeneratorConfig.model =
      config.getModel() || process.env.NEBIUS_MODEL || DEFAULT_GEMINI_MODEL;

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

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
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
    throw new Error('GCP authentication is not supported in this build');
  }

  // Removed direct Google GenAI flows (Gemini/Vertex)

  if (config.authType === AuthType.USE_OPENAI) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const baseURL = process.env.NEBIUS_BASE_URL || '';
    const isNebiusAPI = baseURL.includes('api.nebiusai.com') || baseURL.includes('nebius');

    if (isNebiusAPI) {
      // Use specialized Nebius generator that filters unsupported parameters
      const { NebiusOpenAIContentGenerator } = await import(
        '../nebius/nebiusOpenAIContentGenerator.js'
      );
      return new NebiusOpenAIContentGenerator(config.apiKey, config.model, gcConfig);
    } else {
      // Use regular OpenAI generator for standard OpenAI API
      const { OpenAIContentGenerator } = await import(
        './openaiContentGenerator.js'
      );
      return new OpenAIContentGenerator(config.apiKey, config.model, gcConfig);
    }
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
