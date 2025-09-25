/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTool, ToolResult, ToolCallConfirmationDetails } from './tools.js';
import { CallableTool, FunctionDeclaration } from '@google/genai';
type ToolParams = Record<string, unknown>;
export declare class DiscoveredMCPTool extends BaseTool<
  ToolParams,
  ToolResult
> {
  private readonly mcpTool;
  readonly serverName: string;
  readonly serverToolName: string;
  readonly parameterSchemaJson: unknown;
  readonly timeout?: number | undefined;
  readonly trust?: boolean | undefined;
  private static readonly allowlist;
  constructor(
    mcpTool: CallableTool,
    serverName: string,
    serverToolName: string,
    description: string,
    parameterSchemaJson: unknown,
    timeout?: number | undefined,
    trust?: boolean | undefined,
    nameOverride?: string,
  );
  asFullyQualifiedTool(): DiscoveredMCPTool;
  /**
   * Overrides the base schema to use parametersJsonSchema when building
   * FunctionDeclaration
   */
  get schema(): FunctionDeclaration;
  shouldConfirmExecute(
    _params: ToolParams,
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false>;
  execute(params: ToolParams): Promise<ToolResult>;
}
/** Visible for testing */
export declare function generateValidName(name: string): string;
export {};
