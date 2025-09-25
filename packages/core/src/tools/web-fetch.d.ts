/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTool, ToolResult, ToolCallConfirmationDetails } from './tools.js';
import { Config } from '../config/config.js';
/**
 * Parameters for the WebFetch tool
 */
export interface WebFetchToolParams {
  /**
   * The URL to fetch content from
   */
  url: string;
  /**
   * The prompt to run on the fetched content
   */
  prompt: string;
}
/**
 * Implementation of the WebFetch tool logic
 */
export declare class WebFetchTool extends BaseTool<
  WebFetchToolParams,
  ToolResult
> {
  private readonly config;
  static readonly Name: string;
  constructor(config: Config);
  private executeFetch;
  validateParams(params: WebFetchToolParams): string | null;
  getDescription(params: WebFetchToolParams): string;
  shouldConfirmExecute(
    params: WebFetchToolParams,
  ): Promise<ToolCallConfirmationDetails | false>;
  execute(params: WebFetchToolParams, signal: AbortSignal): Promise<ToolResult>;
}
