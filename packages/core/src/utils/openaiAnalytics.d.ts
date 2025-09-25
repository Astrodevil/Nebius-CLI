/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * OpenAI API usage analytics
 *
 * This utility analyzes OpenAI API logs to provide insights into API usage
 * patterns, costs, and performance.
 */
export declare class OpenAIAnalytics {
  /**
   * Calculate statistics for OpenAI API usage
   * @param days Number of days to analyze (default: 7)
   */
  static calculateStats(days?: number): Promise<{
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    requestsByModel: Record<string, number>;
    tokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    estimatedCost: number;
    errorRates: Record<string, number>;
    timeDistribution: Record<string, number>;
  }>;
  /**
   * Generate a human-readable report of OpenAI API usage
   * @param days Number of days to include in the report
   */
  static generateReport(days?: number): Promise<string>;
  /**
   * Save an analytics report to a file
   * @param days Number of days to include
   * @param outputPath File path for the report (defaults to logs/openai/analytics.md)
   */
  static saveReport(days?: number, outputPath?: string): Promise<string>;
}
export default OpenAIAnalytics;
