/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ModelTemplateMapping {
  baseUrls?: string[];
  modelNames?: string[];
  template?: string;
}
export interface SystemPromptConfig {
  systemPromptMappings?: ModelTemplateMapping[];
}
export declare function getCoreSystemPrompt(
  userMemory?: string,
  config?: SystemPromptConfig,
): string;
/**
 * Provides the system prompt for the history compression process.
 * This prompt instructs the model to act as a specialized state manager,
 * think in a scratchpad, and produce a structured XML summary.
 */
export declare function getCompressionPrompt(): string;
