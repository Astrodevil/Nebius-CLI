/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import open from 'open';
import process from 'node:process';
import {
  type CommandContext,
  type SlashCommand,
  CommandKind,
} from './types.js';
import { MessageType } from '../types.js';

export const privacyCommand: SlashCommand = {
  name: 'privacy',
  description: 'display the privacy notice',
  kind: CommandKind.BUILT_IN,
  action: async (context: CommandContext): Promise<void> => {
    const privUrl = 'https://docs.studio.nebius.com/legal/privacy-policy';
    
    if (process.env.SANDBOX && process.env.SANDBOX !== 'sandbox-exec') {
      context.ui.addItem(
        {
          type: MessageType.INFO,
          text: `Please open the following URL in your browser to view the Privacy Policy:\n${privUrl}`,
        },
        Date.now(),
      );
    } else {
      context.ui.addItem(
        {
          type: MessageType.INFO,
          text: `Opening privacy policy in your browser: ${privUrl}`,
        },
        Date.now(),
      );
      await open(privUrl);
    }
  },
};
