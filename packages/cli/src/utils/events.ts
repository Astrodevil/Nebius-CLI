/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'events';

export enum AppEvent {
  OpenDebugConsole = 'open-debug-console',
  LogError = 'log-error',
  ShowModelDialog = 'show-model-dialog',
  ShowBranchDialog = 'show-branch-dialog',
}

export const appEvents = new EventEmitter();
