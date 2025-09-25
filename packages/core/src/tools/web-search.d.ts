/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTool, ToolResult } from './tools.js';
import { Config } from '../config/config.js';
/**
 * Parameters for the WebSearchTool.
 */
export interface WebSearchToolParams {
  /**
   * The search query.
   */
  query: string;
}
/**
 * Extends ToolResult to include sources for web search.
 */
export interface WebSearchToolResult extends ToolResult {
  sources?: Array<{
    title: string;
    url: string;
  }>;
}
/**
 * A tool to perform web searches using Tavily API.
 */
export declare class WebSearchTool extends BaseTool<
  WebSearchToolParams,
  WebSearchToolResult
> {
  private readonly config;
  static readonly Name: string;
  constructor(config: Config);
  /**
   * Validates the parameters for the WebSearchTool.
   * @param params The parameters to validate
   * @returns An error message string if validation fails, null if valid
   */
  validateParams(params: WebSearchToolParams): string | null;
  getDescription(params: WebSearchToolParams): string;
  execute(
    params: WebSearchToolParams,
    _signal: AbortSignal,
  ): Promise<WebSearchToolResult>;
}
