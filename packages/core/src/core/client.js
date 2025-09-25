/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { getFolderStructure } from '../utils/getFolderStructure.js';
import { Turn, GeminiEventType } from './turn.js';
import { getCoreSystemPrompt, getCompressionPrompt } from './prompts.js';
import { getFunctionCalls } from '../utils/generateContentResponseUtilities.js';
import { checkNextSpeaker } from '../utils/nextSpeakerChecker.js';
import { reportError } from '../utils/errorReporting.js';
import { GeminiChat } from './geminiChat.js';
import { retryWithBackoff } from '../utils/retry.js';
import { getErrorMessage } from '../utils/errors.js';
import { isFunctionResponse } from '../utils/messageInspectors.js';
import { tokenLimit } from './tokenLimits.js';
import { AuthType, createContentGenerator } from './contentGenerator.js';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { DEFAULT_GEMINI_FLASH_MODEL } from '../config/models.js';
import { LoopDetectionService } from '../services/loopDetectionService.js';
import { ideContext } from '../ide/ideContext.js';
import { logNextSpeakerCheck } from '../telemetry/loggers.js';
import { NextSpeakerCheckEvent } from '../telemetry/types.js';
function isThinkingSupported(model) {
  if (model.startsWith('gemini-2.5')) return true;
  return false;
}
/**
 * Returns the index of the content after the fraction of the total characters in the history.
 *
 * Exported for testing purposes.
 */
export function findIndexAfterFraction(history, fraction) {
  if (fraction <= 0 || fraction >= 1) {
    throw new Error('Fraction must be between 0 and 1');
  }
  const contentLengths = history.map(
    (content) => JSON.stringify(content).length,
  );
  const totalCharacters = contentLengths.reduce(
    (sum, length) => sum + length,
    0,
  );
  const targetCharacters = totalCharacters * fraction;
  let charactersSoFar = 0;
  for (let i = 0; i < contentLengths.length; i++) {
    charactersSoFar += contentLengths[i];
    if (charactersSoFar >= targetCharacters) {
      return i;
    }
  }
  return contentLengths.length;
}
export class GeminiClient {
  config;
  chat;
  contentGenerator;
  embeddingModel;
  generateContentConfig = {
    temperature: 0,
    topP: 1,
  };
  sessionTurnCount = 0;
  MAX_TURNS = 100;
  /**
   * Threshold for compression token count as a fraction of the model's token limit.
   * If the chat history exceeds this threshold, it will be compressed.
   */
  COMPRESSION_TOKEN_THRESHOLD = 0.7;
  /**
   * The fraction of the latest chat history to keep. A value of 0.3
   * means that only the last 30% of the chat history will be kept after compression.
   */
  COMPRESSION_PRESERVE_THRESHOLD = 0.3;
  loopDetector;
  lastPromptId;
  constructor(config) {
    this.config = config;
    if (config.getProxy()) {
      setGlobalDispatcher(new ProxyAgent(config.getProxy()));
    }
    this.embeddingModel = config.getEmbeddingModel();
    this.loopDetector = new LoopDetectionService(config);
    this.lastPromptId = this.config.getSessionId();
  }
  async initialize(contentGeneratorConfig) {
    this.contentGenerator = await createContentGenerator(
      contentGeneratorConfig,
      this.config,
      this.config.getSessionId(),
    );
    this.chat = await this.startChat();
  }
  getContentGenerator() {
    if (!this.contentGenerator) {
      throw new Error('Content generator not initialized');
    }
    return this.contentGenerator;
  }
  getUserTier() {
    return this.contentGenerator?.userTier;
  }
  async addHistory(content) {
    this.getChat().addHistory(content);
  }
  getChat() {
    if (!this.chat) {
      throw new Error('Chat not initialized');
    }
    return this.chat;
  }
  isInitialized() {
    return this.chat !== undefined && this.contentGenerator !== undefined;
  }
  getHistory() {
    return this.getChat().getHistory();
  }
  setHistory(history) {
    this.getChat().setHistory(history);
  }
  async setTools() {
    const toolRegistry = await this.config.getToolRegistry();
    const toolDeclarations = toolRegistry.getFunctionDeclarations();
    const tools = [{ functionDeclarations: toolDeclarations }];
    this.getChat().setTools(tools);
  }
  async resetChat() {
    this.chat = await this.startChat();
  }
  async addDirectoryContext() {
    if (!this.chat) {
      return;
    }
    this.getChat().addHistory({
      role: 'user',
      parts: [{ text: await this.getDirectoryContext() }],
    });
  }
  async getDirectoryContext() {
    const workspaceContext = this.config.getWorkspaceContext();
    const workspaceDirectories = workspaceContext.getDirectories();
    const folderStructures = await Promise.all(
      workspaceDirectories.map((dir) =>
        getFolderStructure(dir, {
          fileService: this.config.getFileService(),
        }),
      ),
    );
    const folderStructure = folderStructures.join('\n');
    const dirList = workspaceDirectories.map((dir) => `  - ${dir}`).join('\n');
    const workingDirPreamble = `I'm currently working in the following directories:\n${dirList}\n Folder structures are as follows:\n${folderStructure}`;
    return workingDirPreamble;
  }
  async getEnvironment() {
    const today = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const platform = process.platform;
    const workspaceContext = this.config.getWorkspaceContext();
    const workspaceDirectories = workspaceContext.getDirectories();
    const folderStructures = await Promise.all(
      workspaceDirectories.map((dir) =>
        getFolderStructure(dir, {
          fileService: this.config.getFileService(),
        }),
      ),
    );
    const folderStructure = folderStructures.join('\n');
    let workingDirPreamble;
    if (workspaceDirectories.length === 1) {
      workingDirPreamble = `I'm currently working in the directory: ${workspaceDirectories[0]}`;
    } else {
      const dirList = workspaceDirectories
        .map((dir) => `  - ${dir}`)
        .join('\n');
      workingDirPreamble = `I'm currently working in the following directories:\n${dirList}`;
    }
    const context = `
  This is the Nebius CLI. We are setting up the context for our chat.
  Today's date is ${today}.
  My operating system is: ${platform}
  ${workingDirPreamble}
  Here is the folder structure of the current working directories:\n
  ${folderStructure}
          `.trim();
    const initialParts = [{ text: context }];
    const toolRegistry = await this.config.getToolRegistry();
    // Add full file context if the flag is set
    if (this.config.getFullContext()) {
      try {
        const readManyFilesTool = toolRegistry.getTool('read_many_files');
        if (readManyFilesTool) {
          // Read all files in the target directory
          const result = await readManyFilesTool.execute(
            {
              paths: ['**/*'], // Read everything recursively
              useDefaultExcludes: true, // Use default excludes
            },
            AbortSignal.timeout(30000),
          );
          if (result.llmContent) {
            initialParts.push({
              text: `\n--- Full File Context ---\n${result.llmContent}`,
            });
          } else {
            console.warn(
              'Full context requested, but read_many_files returned no content.',
            );
          }
        } else {
          console.warn(
            'Full context requested, but read_many_files tool not found.',
          );
        }
      } catch (error) {
        // Not using reportError here as it's a startup/config phase, not a chat/generation phase error.
        console.error('Error reading full file context:', error);
        initialParts.push({
          text: '\n--- Error reading full file context ---',
        });
      }
    }
    return initialParts;
  }
  async startChat(extraHistory) {
    const envParts = await this.getEnvironment();
    const toolRegistry = await this.config.getToolRegistry();
    const toolDeclarations = toolRegistry.getFunctionDeclarations();
    const tools = [{ functionDeclarations: toolDeclarations }];
    const history = [
      {
        role: 'user',
        parts: envParts,
      },
      {
        role: 'model',
        parts: [{ text: 'Got it. Thanks for the context!' }],
      },
      ...(extraHistory ?? []),
    ];
    try {
      const userMemory = this.config.getUserMemory();
      const systemInstruction = getCoreSystemPrompt(userMemory);
      const generateContentConfigWithThinking = isThinkingSupported(
        this.config.getModel(),
      )
        ? {
            ...this.generateContentConfig,
            thinkingConfig: {
              includeThoughts: true,
            },
          }
        : this.generateContentConfig;
      return new GeminiChat(
        this.config,
        this.getContentGenerator(),
        {
          systemInstruction,
          ...generateContentConfigWithThinking,
          tools,
        },
        history,
      );
    } catch (error) {
      await reportError(
        error,
        'Error initializing Gemini chat session.',
        history,
        'startChat',
      );
      throw new Error(`Failed to initialize chat: ${getErrorMessage(error)}`);
    }
  }
  async *sendMessageStream(
    request,
    signal,
    prompt_id,
    turns = this.MAX_TURNS,
    originalModel,
  ) {
    if (this.lastPromptId !== prompt_id) {
      this.loopDetector.reset(prompt_id);
      this.lastPromptId = prompt_id;
    }
    this.sessionTurnCount++;
    if (
      this.config.getMaxSessionTurns() > 0 &&
      this.sessionTurnCount > this.config.getMaxSessionTurns()
    ) {
      yield { type: GeminiEventType.MaxSessionTurns };
      return new Turn(this.getChat(), prompt_id);
    }
    // Ensure turns never exceeds MAX_TURNS to prevent infinite loops
    const boundedTurns = Math.min(turns, this.MAX_TURNS);
    if (!boundedTurns) {
      return new Turn(this.getChat(), prompt_id);
    }
    // Track the original model from the first call to detect model switching
    const initialModel = originalModel || this.config.getModel();
    const compressed = await this.tryCompressChat(prompt_id);
    if (compressed) {
      yield { type: GeminiEventType.ChatCompressed, value: compressed };
    }
    // Check session token limit after compression using accurate token counting
    const sessionTokenLimit = this.config.getSessionTokenLimit();
    if (sessionTokenLimit > 0) {
      // Get all the content that would be sent in an API call
      const currentHistory = this.getChat().getHistory(true);
      const userMemory = this.config.getUserMemory();
      const systemPrompt = getCoreSystemPrompt(userMemory);
      const environment = await this.getEnvironment();
      // Create a mock request content to count total tokens
      const mockRequestContent = [
        {
          role: 'system',
          parts: [{ text: systemPrompt }, ...environment],
        },
        ...currentHistory,
      ];
      // Use the improved countTokens method for accurate counting
      const { totalTokens: totalRequestTokens } =
        await this.getContentGenerator().countTokens({
          model: this.config.getModel(),
          contents: mockRequestContent,
        });
      if (
        totalRequestTokens !== undefined &&
        totalRequestTokens > sessionTokenLimit
      ) {
        yield {
          type: GeminiEventType.SessionTokenLimitExceeded,
          value: {
            currentTokens: totalRequestTokens,
            limit: sessionTokenLimit,
            message:
              `Session token limit exceeded: ${totalRequestTokens} tokens > ${sessionTokenLimit} limit. ` +
              'Please start a new session or increase the sessionTokenLimit in your settings.json.',
          },
        };
        return new Turn(this.getChat(), prompt_id);
      }
    }
    if (this.config.getIdeModeFeature() && this.config.getIdeMode()) {
      const ideContextState = ideContext.getIdeContext();
      const openFiles = ideContextState?.workspaceState?.openFiles;
      if (openFiles && openFiles.length > 0) {
        const contextParts = [];
        const firstFile = openFiles[0];
        const activeFile = firstFile.isActive ? firstFile : undefined;
        if (activeFile) {
          contextParts.push(
            `This is the file that the user is looking at:\n- Path: ${activeFile.path}`,
          );
          if (activeFile.cursor) {
            contextParts.push(
              `This is the cursor position in the file:\n- Cursor Position: Line ${activeFile.cursor.line}, Character ${activeFile.cursor.character}`,
            );
          }
          if (activeFile.selectedText) {
            contextParts.push(
              `This is the selected text in the file:\n- ${activeFile.selectedText}`,
            );
          }
        }
        const otherOpenFiles = activeFile ? openFiles.slice(1) : openFiles;
        if (otherOpenFiles.length > 0) {
          const recentFiles = otherOpenFiles
            .map((file) => `- ${file.path}`)
            .join('\n');
          const heading = activeFile
            ? `Here are some other files the user has open, with the most recent at the top:`
            : `Here are some files the user has open, with the most recent at the top:`;
          contextParts.push(`${heading}\n${recentFiles}`);
        }
        if (contextParts.length > 0) {
          request = [
            { text: contextParts.join('\n') },
            ...(Array.isArray(request) ? request : [request]),
          ];
        }
      }
    }
    const turn = new Turn(this.getChat(), prompt_id);
    const loopDetected = await this.loopDetector.turnStarted(signal);
    if (loopDetected) {
      yield { type: GeminiEventType.LoopDetected };
      return turn;
    }
    const resultStream = turn.run(request, signal);
    for await (const event of resultStream) {
      if (this.loopDetector.addAndCheck(event)) {
        yield { type: GeminiEventType.LoopDetected };
        return turn;
      }
      yield event;
    }
    if (!turn.pendingToolCalls.length && signal && !signal.aborted) {
      // Check if model was switched during the call (likely due to quota error)
      const currentModel = this.config.getModel();
      if (currentModel !== initialModel) {
        // Model was switched (likely due to quota error fallback)
        // Don't continue with recursive call to prevent unwanted Flash execution
        return turn;
      }
      const nextSpeakerCheck = await checkNextSpeaker(
        this.getChat(),
        this,
        signal,
      );
      logNextSpeakerCheck(
        this.config,
        new NextSpeakerCheckEvent(
          prompt_id,
          turn.finishReason?.toString() || '',
          nextSpeakerCheck?.next_speaker || '',
        ),
      );
      if (nextSpeakerCheck?.next_speaker === 'model') {
        const nextRequest = [{ text: 'Please continue.' }];
        // This recursive call's events will be yielded out, but the final
        // turn object will be from the top-level call.
        yield* this.sendMessageStream(
          nextRequest,
          signal,
          prompt_id,
          boundedTurns - 1,
          initialModel,
        );
      }
    }
    return turn;
  }
  async generateJson(contents, schema, abortSignal, model, config = {}) {
    // Use current model from config instead of hardcoded Flash model
    const modelToUse =
      model || this.config.getModel() || DEFAULT_GEMINI_FLASH_MODEL;
    try {
      const userMemory = this.config.getUserMemory();
      const systemPromptMappings = this.config.getSystemPromptMappings();
      const systemInstruction = getCoreSystemPrompt(userMemory, {
        systemPromptMappings,
      });
      const requestConfig = {
        abortSignal,
        ...this.generateContentConfig,
        ...config,
      };
      // Convert schema to function declaration
      const functionDeclaration = {
        name: 'respond_in_schema',
        description: 'Provide the response in provided schema',
        parameters: schema,
      };
      const tools = [
        {
          functionDeclarations: [functionDeclaration],
        },
      ];
      const apiCall = () =>
        this.getContentGenerator().generateContent(
          {
            model: modelToUse,
            config: {
              ...requestConfig,
              systemInstruction,
              tools,
            },
            contents,
          },
          this.lastPromptId,
        );
      const result = await retryWithBackoff(apiCall, {
        onPersistent429: async (authType, error) =>
          await this.handleFlashFallback(authType, error),
        authType: this.config.getContentGeneratorConfig()?.authType,
      });
      const functionCalls = getFunctionCalls(result);
      if (functionCalls && functionCalls.length > 0) {
        const functionCall = functionCalls.find(
          (call) => call.name === 'respond_in_schema',
        );
        if (functionCall && functionCall.args) {
          return functionCall.args;
        }
      }
      return {};
    } catch (error) {
      if (abortSignal.aborted) {
        throw error;
      }
      // Avoid double reporting for the empty response case handled above
      if (
        error instanceof Error &&
        error.message === 'API returned an empty response for generateJson.'
      ) {
        throw error;
      }
      await reportError(
        error,
        'Error generating JSON content via API.',
        contents,
        'generateJson-api',
      );
      throw new Error(
        `Failed to generate JSON content: ${getErrorMessage(error)}`,
      );
    }
  }
  async generateContent(contents, generationConfig, abortSignal, model) {
    const modelToUse = model ?? this.config.getModel();
    const configToUse = {
      ...this.generateContentConfig,
      ...generationConfig,
    };
    try {
      const userMemory = this.config.getUserMemory();
      const systemPromptMappings = this.config.getSystemPromptMappings();
      const systemInstruction = getCoreSystemPrompt(userMemory, {
        systemPromptMappings,
      });
      const requestConfig = {
        abortSignal,
        ...configToUse,
        systemInstruction,
      };
      const apiCall = () =>
        this.getContentGenerator().generateContent(
          {
            model: modelToUse,
            config: requestConfig,
            contents,
          },
          this.lastPromptId,
        );
      const result = await retryWithBackoff(apiCall, {
        onPersistent429: async (authType, error) =>
          await this.handleFlashFallback(authType, error),
        authType: this.config.getContentGeneratorConfig()?.authType,
      });
      return result;
    } catch (error) {
      if (abortSignal.aborted) {
        throw error;
      }
      await reportError(
        error,
        `Error generating content via API with model ${modelToUse}.`,
        {
          requestContents: contents,
          requestConfig: configToUse,
        },
        'generateContent-api',
      );
      throw new Error(
        `Failed to generate content with model ${modelToUse}: ${getErrorMessage(error)}`,
      );
    }
  }
  async generateEmbedding(texts) {
    if (!texts || texts.length === 0) {
      return [];
    }
    const embedModelParams = {
      model: this.embeddingModel,
      contents: texts,
    };
    const embedContentResponse =
      await this.getContentGenerator().embedContent(embedModelParams);
    if (
      !embedContentResponse.embeddings ||
      embedContentResponse.embeddings.length === 0
    ) {
      throw new Error('No embeddings found in API response.');
    }
    if (embedContentResponse.embeddings.length !== texts.length) {
      throw new Error(
        `API returned a mismatched number of embeddings. Expected ${texts.length}, got ${embedContentResponse.embeddings.length}.`,
      );
    }
    return embedContentResponse.embeddings.map((embedding, index) => {
      const values = embedding.values;
      if (!values || values.length === 0) {
        throw new Error(
          `API returned an empty embedding for input text at index ${index}: "${texts[index]}"`,
        );
      }
      return values;
    });
  }
  async tryCompressChat(prompt_id, force = false) {
    const curatedHistory = this.getChat().getHistory(true);
    // Regardless of `force`, don't do anything if the history is empty.
    if (curatedHistory.length === 0) {
      return null;
    }
    const model = this.config.getModel();
    const { totalTokens: originalTokenCount } =
      await this.getContentGenerator().countTokens({
        model,
        contents: curatedHistory,
      });
    if (originalTokenCount === undefined) {
      console.warn(`Could not determine token count for model ${model}.`);
      return null;
    }
    // Don't compress if not forced and we are under the limit.
    if (
      !force &&
      originalTokenCount < this.COMPRESSION_TOKEN_THRESHOLD * tokenLimit(model)
    ) {
      return null;
    }
    let compressBeforeIndex = findIndexAfterFraction(
      curatedHistory,
      1 - this.COMPRESSION_PRESERVE_THRESHOLD,
    );
    // Find the first user message after the index. This is the start of the next turn.
    while (
      compressBeforeIndex < curatedHistory.length &&
      (curatedHistory[compressBeforeIndex]?.role === 'model' ||
        isFunctionResponse(curatedHistory[compressBeforeIndex]))
    ) {
      compressBeforeIndex++;
    }
    const historyToCompress = curatedHistory.slice(0, compressBeforeIndex);
    const historyToKeep = curatedHistory.slice(compressBeforeIndex);
    this.getChat().setHistory(historyToCompress);
    const { text: summary } = await this.getChat().sendMessage(
      {
        message: {
          text: 'First, reason in your scratchpad. Then, generate the <state_snapshot>.',
        },
        config: {
          systemInstruction: { text: getCompressionPrompt() },
        },
      },
      prompt_id,
    );
    this.chat = await this.startChat([
      {
        role: 'user',
        parts: [{ text: summary }],
      },
      {
        role: 'model',
        parts: [{ text: 'Got it. Thanks for the additional context!' }],
      },
      ...historyToKeep,
    ]);
    const { totalTokens: newTokenCount } =
      await this.getContentGenerator().countTokens({
        // model might change after calling `sendMessage`, so we get the newest value from config
        model: this.config.getModel(),
        contents: this.getChat().getHistory(),
      });
    if (newTokenCount === undefined) {
      console.warn('Could not determine compressed history token count.');
      return null;
    }
    return {
      originalTokenCount,
      newTokenCount,
    };
  }
  /**
   * Handles falling back to Flash model when persistent 429 errors occur for OAuth users.
   * Uses a fallback handler if provided by the config; otherwise, returns null.
   */
  async handleFlashFallback(authType, error) {
    // Handle different auth types
    if (authType === AuthType.QWEN_OAUTH) {
      return this.handleNebiusOAuthError(error);
    }
    // Only handle fallback for OAuth users
    if (authType !== AuthType.LOGIN_WITH_GOOGLE) {
      return null;
    }
    const currentModel = this.config.getModel();
    const fallbackModel = DEFAULT_GEMINI_FLASH_MODEL;
    // Don't fallback if already using Flash model
    if (currentModel === fallbackModel) {
      return null;
    }
    // Check if config has a fallback handler (set by CLI package)
    const fallbackHandler = this.config.flashFallbackHandler;
    if (typeof fallbackHandler === 'function') {
      try {
        const accepted = await fallbackHandler(
          currentModel,
          fallbackModel,
          error,
        );
        if (accepted !== false && accepted !== null) {
          this.config.setModel(fallbackModel);
          this.config.setFallbackMode(true);
          return fallbackModel;
        }
        // Check if the model was switched manually in the handler
        if (this.config.getModel() === fallbackModel) {
          return null; // Model was switched but don't continue with current prompt
        }
      } catch (error) {
        console.warn('Flash fallback handler failed:', error);
      }
    }
    return null;
  }
  /**
   * Handles Nebius OAuth authentication errors and rate limiting
   */
  async handleNebiusOAuthError(error) {
    if (!error) {
      return null;
    }
    const errorMessage =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();
    const errorCode = error?.status || error?.code;
    // Check if this is an authentication/authorization error
    const isAuthError =
      errorCode === 401 ||
      errorCode === 403 ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('invalid api key') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('access denied') ||
      (errorMessage.includes('token') && errorMessage.includes('expired'));
    // Check if this is a rate limiting error
    const isRateLimitError =
      errorCode === 429 ||
      errorMessage.includes('429') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests');
    if (isAuthError) {
      console.warn('Nebius OAuth authentication error detected:', errorMessage);
      // The NebiusContentGenerator should automatically handle token refresh
      // If it still fails, it likely means the refresh token is also expired
      console.log(
        'Note: If this persists, you may need to re-authenticate with Nebius OAuth',
      );
      return null;
    }
    if (isRateLimitError) {
      console.warn('Nebius API rate limit encountered:', errorMessage);
      // For rate limiting, we don't need to do anything special
      // The retry mechanism will handle the backoff
      return null;
    }
    // For other errors, don't handle them specially
    return null;
  }
}
//# sourceMappingURL=client.js.map
