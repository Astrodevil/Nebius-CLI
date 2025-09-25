/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { DetectedIde } from '../ide/detect-ide.js';
export type IDEConnectionState = {
  status: IDEConnectionStatus;
  details?: string;
};
export declare enum IDEConnectionStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Connecting = 'connecting',
}
/**
 * Manages the connection to and interaction with the IDE server.
 */
export declare class IdeClient {
  private static instance;
  private client;
  private state;
  private readonly currentIde;
  private readonly currentIdeDisplayName;
  private constructor();
  static getInstance(): IdeClient;
  connect(): Promise<void>;
  disconnect(): void;
  getCurrentIde(): DetectedIde | undefined;
  getConnectionStatus(): IDEConnectionState;
  private setState;
  private validateWorkspacePath;
  private getPortFromEnv;
  private registerClientHandlers;
  private establishConnection;
  init(): Promise<void>;
  dispose(): void;
  getDetectedIdeDisplayName(): string | undefined;
  setDisconnected(): void;
}
