/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { AuthType, ContentGeneratorConfig } from '../core/contentGenerator.js';
import { PromptRegistry } from '../prompts/prompt-registry.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { GeminiClient } from '../core/client.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { GitService } from '../services/gitService.js';
import { TelemetryTarget } from '../telemetry/index.js';
import { DEFAULT_GEMINI_FLASH_MODEL } from './models.js';
import { MCPOAuthConfig } from '../mcp/oauth-provider.js';
import { IdeClient } from '../ide/ide-client.js';
export type { MCPOAuthConfig };
import { WorkspaceContext } from '../utils/workspaceContext.js';
export declare enum ApprovalMode {
  DEFAULT = 'default',
  AUTO_EDIT = 'autoEdit',
  YOLO = 'yolo',
}
export interface AccessibilitySettings {
  disableLoadingPhrases?: boolean;
}
export interface BugCommandSettings {
  urlTemplate: string;
}
export interface SummarizeToolOutputSettings {
  tokenBudget?: number;
}
export interface TelemetrySettings {
  enabled?: boolean;
  target?: TelemetryTarget;
  otlpEndpoint?: string;
  logPrompts?: boolean;
  outfile?: string;
}
export interface GitCoAuthorSettings {
  enabled?: boolean;
  name?: string;
  email?: string;
}
export interface GeminiCLIExtension {
  name: string;
  version: string;
  isActive: boolean;
  path: string;
}
export interface FileFilteringOptions {
  respectGitIgnore: boolean;
  respectGeminiIgnore: boolean;
}
export declare const DEFAULT_MEMORY_FILE_FILTERING_OPTIONS: FileFilteringOptions;
export declare const DEFAULT_FILE_FILTERING_OPTIONS: FileFilteringOptions;
export declare class MCPServerConfig {
  readonly command?: string | undefined;
  readonly args?: string[] | undefined;
  readonly env?: Record<string, string> | undefined;
  readonly cwd?: string | undefined;
  readonly url?: string | undefined;
  readonly httpUrl?: string | undefined;
  readonly headers?: Record<string, string> | undefined;
  readonly tcp?: string | undefined;
  readonly timeout?: number | undefined;
  readonly trust?: boolean | undefined;
  readonly description?: string | undefined;
  readonly includeTools?: string[] | undefined;
  readonly excludeTools?: string[] | undefined;
  readonly extensionName?: string | undefined;
  readonly oauth?: MCPOAuthConfig | undefined;
  readonly authProviderType?: AuthProviderType | undefined;
  constructor(
    command?: string | undefined,
    args?: string[] | undefined,
    env?: Record<string, string> | undefined,
    cwd?: string | undefined,
    url?: string | undefined,
    httpUrl?: string | undefined,
    headers?: Record<string, string> | undefined,
    tcp?: string | undefined,
    timeout?: number | undefined,
    trust?: boolean | undefined,
    description?: string | undefined,
    includeTools?: string[] | undefined,
    excludeTools?: string[] | undefined,
    extensionName?: string | undefined,
    oauth?: MCPOAuthConfig | undefined,
    authProviderType?: AuthProviderType | undefined,
  );
}
export declare enum AuthProviderType {
  DYNAMIC_DISCOVERY = 'dynamic_discovery',
  GOOGLE_CREDENTIALS = 'google_credentials',
}
export interface SandboxConfig {
  command: 'docker' | 'podman' | 'sandbox-exec';
  image: string;
}
export type FlashFallbackHandler = (
  currentModel: string,
  fallbackModel: string,
  error?: unknown,
) => Promise<boolean | string | null>;
export interface ConfigParameters {
  sessionId: string;
  embeddingModel?: string;
  sandbox?: SandboxConfig;
  targetDir: string;
  debugMode: boolean;
  question?: string;
  fullContext?: boolean;
  coreTools?: string[];
  excludeTools?: string[];
  toolDiscoveryCommand?: string;
  toolCallCommand?: string;
  mcpServerCommand?: string;
  mcpServers?: Record<string, MCPServerConfig>;
  userMemory?: string;
  geminiMdFileCount?: number;
  approvalMode?: ApprovalMode;
  showMemoryUsage?: boolean;
  contextFileName?: string | string[];
  accessibility?: AccessibilitySettings;
  telemetry?: TelemetrySettings;
  gitCoAuthor?: GitCoAuthorSettings;
  usageStatisticsEnabled?: boolean;
  fileFiltering?: {
    respectGitIgnore?: boolean;
    respectGeminiIgnore?: boolean;
    enableRecursiveFileSearch?: boolean;
  };
  checkpointing?: boolean;
  proxy?: string;
  cwd: string;
  fileDiscoveryService?: FileDiscoveryService;
  includeDirectories?: string[];
  bugCommand?: BugCommandSettings;
  model: string;
  extensionContextFilePaths?: string[];
  maxSessionTurns?: number;
  sessionTokenLimit?: number;
  maxFolderItems?: number;
  experimentalAcp?: boolean;
  listExtensions?: boolean;
  extensions?: GeminiCLIExtension[];
  blockedMcpServers?: Array<{
    name: string;
    extensionName: string;
  }>;
  noBrowser?: boolean;
  summarizeToolOutput?: Record<string, SummarizeToolOutputSettings>;
  ideModeFeature?: boolean;
  ideMode?: boolean;
  enableOpenAILogging?: boolean;
  sampling_params?: Record<string, unknown>;
  systemPromptMappings?: Array<{
    baseUrls: string[];
    modelNames: string[];
    template: string;
  }>;
  contentGenerator?: {
    timeout?: number;
    maxRetries?: number;
  };
  cliVersion?: string;
  loadMemoryFromIncludeDirectories?: boolean;
  tavilyApiKey?: string;
}
export declare class Config {
  private toolRegistry;
  private promptRegistry;
  private readonly sessionId;
  private contentGeneratorConfig;
  private readonly embeddingModel;
  private readonly sandbox;
  private readonly targetDir;
  private workspaceContext;
  private readonly debugMode;
  private readonly question;
  private readonly fullContext;
  private readonly coreTools;
  private readonly excludeTools;
  private readonly toolDiscoveryCommand;
  private readonly toolCallCommand;
  private readonly mcpServerCommand;
  private readonly mcpServers;
  private userMemory;
  private geminiMdFileCount;
  private approvalMode;
  private readonly showMemoryUsage;
  private readonly accessibility;
  private readonly telemetrySettings;
  private readonly gitCoAuthor;
  private readonly usageStatisticsEnabled;
  private geminiClient;
  private readonly fileFiltering;
  private fileDiscoveryService;
  private gitService;
  private readonly checkpointing;
  private readonly proxy;
  private readonly cwd;
  private readonly bugCommand;
  private readonly model;
  private readonly extensionContextFilePaths;
  private readonly noBrowser;
  private readonly ideModeFeature;
  private ideMode;
  private ideClient;
  private inFallbackMode;
  private readonly systemPromptMappings?;
  private readonly maxSessionTurns;
  private readonly sessionTokenLimit;
  private readonly maxFolderItems;
  private readonly listExtensions;
  private readonly _extensions;
  private readonly _blockedMcpServers;
  flashFallbackHandler?: FlashFallbackHandler;
  private quotaErrorOccurred;
  private readonly summarizeToolOutput;
  private readonly experimentalAcp;
  private readonly enableOpenAILogging;
  private readonly sampling_params?;
  private readonly contentGenerator?;
  private readonly cliVersion?;
  private readonly loadMemoryFromIncludeDirectories;
  private readonly tavilyApiKey?;
  private webSearchEnabled;
  constructor(params: ConfigParameters);
  initialize(): Promise<void>;
  refreshAuth(authMethod: AuthType): Promise<void>;
  getSessionId(): string;
  shouldLoadMemoryFromIncludeDirectories(): boolean;
  getContentGeneratorConfig(): ContentGeneratorConfig;
  getModel(): string;
  setModel(newModel: string): void;
  isInFallbackMode(): boolean;
  setFallbackMode(active: boolean): void;
  setFlashFallbackHandler(handler: FlashFallbackHandler): void;
  getMaxSessionTurns(): number;
  getSessionTokenLimit(): number;
  getMaxFolderItems(): number;
  setQuotaErrorOccurred(value: boolean): void;
  getQuotaErrorOccurred(): boolean;
  getEmbeddingModel(): string;
  getSandbox(): SandboxConfig | undefined;
  isRestrictiveSandbox(): boolean;
  getTargetDir(): string;
  getProjectRoot(): string;
  getWorkspaceContext(): WorkspaceContext;
  getToolRegistry(): Promise<ToolRegistry>;
  getPromptRegistry(): PromptRegistry;
  getDebugMode(): boolean;
  getQuestion(): string | undefined;
  getFullContext(): boolean;
  getCoreTools(): string[] | undefined;
  getExcludeTools(): string[] | undefined;
  getToolDiscoveryCommand(): string | undefined;
  getToolCallCommand(): string | undefined;
  getMcpServerCommand(): string | undefined;
  getMcpServers(): Record<string, MCPServerConfig> | undefined;
  getUserMemory(): string;
  setUserMemory(newUserMemory: string): void;
  getGeminiMdFileCount(): number;
  setGeminiMdFileCount(count: number): void;
  getApprovalMode(): ApprovalMode;
  setApprovalMode(mode: ApprovalMode): void;
  getShowMemoryUsage(): boolean;
  getAccessibility(): AccessibilitySettings;
  getTelemetryEnabled(): boolean;
  getTelemetryLogPromptsEnabled(): boolean;
  getTelemetryOtlpEndpoint(): string;
  getTelemetryTarget(): TelemetryTarget;
  getTelemetryOutfile(): string | undefined;
  getGitCoAuthor(): GitCoAuthorSettings;
  getGeminiClient(): GeminiClient;
  getGeminiDir(): string;
  getProjectTempDir(): string;
  getEnableRecursiveFileSearch(): boolean;
  getFileFilteringRespectGitIgnore(): boolean;
  getFileFilteringRespectGeminiIgnore(): boolean;
  getFileFilteringOptions(): FileFilteringOptions;
  getCheckpointingEnabled(): boolean;
  getProxy(): string | undefined;
  getWorkingDir(): string;
  getBugCommand(): BugCommandSettings | undefined;
  getFileService(): FileDiscoveryService;
  getUsageStatisticsEnabled(): boolean;
  getExtensionContextFilePaths(): string[];
  getExperimentalAcp(): boolean;
  getListExtensions(): boolean;
  getExtensions(): GeminiCLIExtension[];
  getBlockedMcpServers(): Array<{
    name: string;
    extensionName: string;
  }>;
  getNoBrowser(): boolean;
  isBrowserLaunchSuppressed(): boolean;
  getSummarizeToolOutputConfig():
    | Record<string, SummarizeToolOutputSettings>
    | undefined;
  getTavilyApiKey(): string | undefined;
  getIdeModeFeature(): boolean;
  getIdeClient(): IdeClient;
  getIdeMode(): boolean;
  setIdeMode(value: boolean): void;
  setIdeModeAndSyncConnection(value: boolean): Promise<void>;
  getEnableOpenAILogging(): boolean;
  getSamplingParams(): Record<string, unknown> | undefined;
  getContentGeneratorTimeout(): number | undefined;
  getContentGeneratorMaxRetries(): number | undefined;
  getCliVersion(): string | undefined;
  getSystemPromptMappings():
    | Array<{
        baseUrls?: string[];
        modelNames?: string[];
        template?: string;
      }>
    | undefined;
  getWebSearchEnabled(): boolean;
  setWebSearchEnabled(value: boolean): void;
  getGitService(): Promise<GitService>;
  createToolRegistry(): Promise<ToolRegistry>;
}
export { DEFAULT_GEMINI_FLASH_MODEL };
