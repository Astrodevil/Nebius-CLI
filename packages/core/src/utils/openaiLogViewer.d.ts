/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * CLI utility for viewing and managing OpenAI logs
 */
export declare class OpenAILogViewer {
  /**
   * List all available OpenAI logs
   * @param limit Optional limit on the number of logs to display
   */
  static listLogs(limit?: number): Promise<void>;
  /**
   * View details of a specific log file
   * @param identifier Either a log index (1-based) or a filename
   */
  static viewLog(identifier: number | string): Promise<void>;
  /**
   * Clean up old logs, keeping only the most recent ones
   * @param keepCount Number of recent logs to keep
   */
  static cleanupLogs(keepCount?: number): Promise<void>;
}
export default OpenAILogViewer;
