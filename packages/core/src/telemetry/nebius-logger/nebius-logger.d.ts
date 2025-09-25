/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { HttpsProxyAgent } from 'https-proxy-agent';
import {
  StartSessionEvent,
  EndSessionEvent,
  UserPromptEvent,
  ToolCallEvent,
  ApiRequestEvent,
  ApiResponseEvent,
  ApiErrorEvent,
  FlashFallbackEvent,
  LoopDetectedEvent,
  NextSpeakerCheckEvent,
  SlashCommandEvent,
  MalformedJsonResponseEvent,
} from '../types.js';
import {
  RumEvent,
  RumViewEvent,
  RumActionEvent,
  RumResourceEvent,
  RumExceptionEvent,
  RumPayload,
} from './event-types.js';
import { Config } from '../../config/config.js';
export interface LogResponse {
  nextRequestWaitMs?: number;
}
export declare class NebiusLogger {
  private static instance;
  private config?;
  private readonly events;
  private last_flush_time;
  private flush_interval_ms;
  private userId;
  private sessionId;
  private viewId;
  private isFlushInProgress;
  private isShutdown;
  private constructor();
  private generateUserId;
  static getInstance(config?: Config): NebiusLogger | undefined;
  enqueueLogEvent(event: RumEvent): void;
  createRumEvent(
    eventType: 'view' | 'action' | 'exception' | 'resource',
    type: string,
    name: string,
    properties: Partial<RumEvent>,
  ): RumEvent;
  createViewEvent(
    type: string,
    name: string,
    properties: Partial<RumViewEvent>,
  ): RumEvent;
  createActionEvent(
    type: string,
    name: string,
    properties: Partial<RumActionEvent>,
  ): RumEvent;
  createResourceEvent(
    type: string,
    name: string,
    properties: Partial<RumResourceEvent>,
  ): RumEvent;
  createExceptionEvent(
    type: string,
    name: string,
    properties: Partial<RumExceptionEvent>,
  ): RumEvent;
  createRumPayload(): Promise<RumPayload>;
  flushIfNeeded(): void;
  flushToRum(): Promise<LogResponse>;
  logStartSessionEvent(event: StartSessionEvent): void;
  logNewPromptEvent(event: UserPromptEvent): void;
  logToolCallEvent(event: ToolCallEvent): void;
  logApiRequestEvent(event: ApiRequestEvent): void;
  logApiResponseEvent(event: ApiResponseEvent): void;
  logApiErrorEvent(event: ApiErrorEvent): void;
  logFlashFallbackEvent(event: FlashFallbackEvent): void;
  logLoopDetectedEvent(event: LoopDetectedEvent): void;
  logNextSpeakerCheck(event: NextSpeakerCheckEvent): void;
  logSlashCommandEvent(event: SlashCommandEvent): void;
  logMalformedJsonResponseEvent(event: MalformedJsonResponseEvent): void;
  logEndSessionEvent(_event: EndSessionEvent): void;
  getProxyAgent(): HttpsProxyAgent<string> | undefined;
  shutdown(): void;
}
