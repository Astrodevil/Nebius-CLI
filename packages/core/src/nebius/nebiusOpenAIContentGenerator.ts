/**
 * @license
 * Copyright 2025 Nebius
 * SPDX-License-Identifier: Apache-2.0
 */

import { GenerateContentParameters } from '@google/genai';
import { OpenAIContentGenerator } from '../core/openaiContentGenerator.js';
import { Config } from '../config/config.js';

/**
 * Specialized OpenAI content generator for Nebius API that filters out
 * unsupported parameters that cause 400 errors.
 */
export class NebiusOpenAIContentGenerator extends OpenAIContentGenerator {
  constructor(apiKey: string, model: string, config: Config) {
    super(apiKey, model, config);
  }

  /**
   * Build sampling parameters for Nebius API, filtering out unsupported parameters.
   * Only includes parameters known to be supported by Nebius:
   * - temperature
   * - max_tokens  
   * - top_p
   * 
   * Removes potentially problematic parameters:
   * - top_k (not standard OpenAI)
   * - repetition_penalty (not standard OpenAI) 
   * - presence_penalty (may not be supported)
   * - frequency_penalty (may not be supported)
   */
  protected buildSamplingParameters(
    request: GenerateContentParameters,
  ): Record<string, unknown> {
    const configSamplingParams =
      this.config.getContentGeneratorConfig()?.samplingParams;

    const params = {
      // Temperature: config > request > default
      temperature:
        configSamplingParams?.temperature !== undefined
          ? configSamplingParams.temperature
          : request.config?.temperature !== undefined
            ? request.config.temperature
            : 0.0,

      // Max tokens: config > request > undefined
      ...(configSamplingParams?.max_tokens !== undefined
        ? { max_tokens: configSamplingParams.max_tokens }
        : request.config?.maxOutputTokens !== undefined
          ? { max_tokens: request.config.maxOutputTokens }
          : {}),

      // Top-p: config > request > default
      top_p:
        configSamplingParams?.top_p !== undefined
          ? configSamplingParams.top_p
          : request.config?.topP !== undefined
            ? request.config.topP
            : 1.0,

      // Note: Deliberately excluding the following parameters that may cause 400 errors with Nebius:
      // - top_k (not standard OpenAI API)
      // - repetition_penalty (not standard OpenAI API)
      // - presence_penalty (may not be supported by Nebius)
      // - frequency_penalty (may not be supported by Nebius)
    };

    return params;
  }
}
