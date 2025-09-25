/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType, ContentGenerator } from '../core/contentGenerator.js';
import { setupUser } from './setup.js';
import { CodeAssistServer, HttpOptions } from './server.js';
import { Config } from '../config/config.js';

export async function createCodeAssistContentGenerator(
  httpOptions: HttpOptions,
  authType: AuthType,
  config: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  // All GCP-related auth types are no longer supported in this build.
  // This includes LOGIN_WITH_GOOGLE and CLOUD_SHELL.
  throw new Error(
    `Unsupported authType: ${authType}. GCP authentication has been removed.`,
  );
}
