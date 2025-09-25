/**
 * @license
 * Copyright 2025 Nebius
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { ContentGenerator } from './contentGenerator.js';
import OpenAI from 'openai';
import { Config } from '../config/config.js';
export declare class OpenAIContentGenerator implements ContentGenerator {
  protected client: OpenAI;
  private model;
  private config;
  private streamingToolCalls;
  constructor(apiKey: string, model: string, config: Config);
  /**
   * Hook for subclasses to customize error handling behavior
   * @param error The error that occurred
   * @param request The original request
   * @returns true if error logging should be suppressed, false otherwise
   */
  protected shouldSuppressErrorLogging(
    _error: unknown,
    _request: GenerateContentParameters,
  ): boolean;
  /**
   * Check if an error is a timeout error
   */
  private isTimeoutError;
  /**
   * Determine if metadata should be included in the request.
   * Only include the `metadata` field if the provider is QWEN_OAUTH
   * or the baseUrl is 'https://dashscope.aliyuncs.com/compatible-mode/v1'.
   * This is because some models/providers do not support metadata or need extra configuration.
   *
   * @returns true if metadata should be included, false otherwise
   */
  private shouldIncludeMetadata;
  /**
   * Build metadata object for OpenAI API requests.
   *
   * @param userPromptId The user prompt ID to include in metadata
   * @returns metadata object if shouldIncludeMetadata() returns true, undefined otherwise
   */
  private buildMetadata;
  generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse>;
  generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;
  private streamGenerator;
  /**
   * Combine streaming responses for logging purposes
   */
  private combineStreamResponsesForLogging;
  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
  private convertGeminiParametersToOpenAI;
  /**
   * Converts Gemini tools to OpenAI format for API compatibility.
   * Handles both Gemini tools (using 'parameters' field) and MCP tools (using 'parametersJsonSchema' field).
   *
   * Gemini tools use a custom parameter format that needs conversion to OpenAI JSON Schema format.
   * MCP tools already use JSON Schema format in the parametersJsonSchema field and can be used directly.
   *
   * @param geminiTools - Array of Gemini tools to convert
   * @returns Promise resolving to array of OpenAI-compatible tools
   */
  private convertGeminiToolsToOpenAI;
  private convertToOpenAIFormat;
  /**
   * Clean up orphaned tool calls from message history to prevent OpenAI API errors
   */
  private cleanOrphanedToolCalls;
  /**
   * Merge consecutive assistant messages to combine split text and tool calls
   */
  private mergeConsecutiveAssistantMessages;
  private convertToGeminiFormat;
  private convertStreamChunkToGeminiFormat;
  /**
   * Build sampling parameters with clear priority:
   * 1. Config-level sampling parameters (highest priority)
   * 2. Request-level parameters (medium priority)
   * 3. Default values (lowest priority)
   */
  private buildSamplingParameters;
  private mapFinishReason;
  /**
   * Convert Gemini request format to OpenAI chat completion format for logging
   */
  private convertGeminiRequestToOpenAI;
  /**
   * Clean up orphaned tool calls for logging purposes
   */
  private cleanOrphanedToolCallsForLogging;
  /**
   * Merge consecutive assistant messages to combine split text and tool calls for logging
   */
  private mergeConsecutiveAssistantMessagesForLogging;
  /**
   * Convert Gemini response format to OpenAI chat completion format for logging
   */
  private convertGeminiResponseToOpenAI;
  /**
   * Map Gemini finish reasons to OpenAI finish reasons
   */
  private mapGeminiFinishReasonToOpenAI;
}
