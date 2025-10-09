/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, SlashCommand } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

const NEBIUS_DIR = '.nebius';

function getEnvFilePath(workspaceDir: string): string {
  // Use root .env file
  return path.join(workspaceDir, '.env');
}

function updateEnvFile(envFilePath: string, key: string, value: string): void {
  let envContent = '';
  
  // Read existing .env file if it exists
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf-8');
  }
  
  // Check if the key already exists
  const keyRegex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}=${value}`;
  
  if (keyRegex.test(envContent)) {
    // Update existing key
    envContent = envContent.replace(keyRegex, newLine);
  } else {
    // Add new key
    if (envContent && !envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += newLine + '\n';
  }
  
  // Write back to file
  fs.writeFileSync(envFilePath, envContent, 'utf-8');
}

export const websearchCommand: SlashCommand = {
  name: 'websearch',
  altNames: ['search', 'web'],
  description:
    'Enable or disable Linkup web search for this session. Usage: /websearch on | off | toggle | status | config <api-key>. Note: requires LINKUP_API_KEY to be set.',
  kind: CommandKind.BUILT_IN,
  action: async (context, args) => {
    const cfg = context.services.config;
    if (!cfg) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Configuration not available.',
      } as const;
    }

    const trimmedArgs = (args || '').trim();
    const parts = trimmedArgs.split(/\s+/);
    const command = parts[0]?.toLowerCase() || '';
    const apiKey = parts.slice(1).join(' ').trim();

    let desired: boolean | 'toggle' | 'status' | 'config' = 'toggle';
    if (command === 'on' || command === 'enable') desired = true;
    else if (command === 'off' || command === 'disable') desired = false;
    else if (command === 'status') desired = 'status';
    else if (command === 'config' || command === 'configure') desired = 'config';
    else if (command === '' || command === 'toggle') desired = 'toggle';
    else {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Usage: /websearch on | off | toggle | status | config <api-key>',
      } as const;
    }

    if (desired === 'status') {
      const enabled = cfg.getWebSearchEnabled();
      const hasKey = !!cfg.getLinkupApiKey();
      const status = enabled ? 'ON' : 'OFF';
      const keyMsg = hasKey ? '' : ' (Linkup API key not configured)';
      return {
        type: 'message',
        messageType: enabled ? 'info' : 'error',
        content: `Web search is ${status}${keyMsg}.`,
      } as const;
    }

    if (desired === 'config') {
      if (!apiKey) {
        return {
          type: 'message',
          messageType: 'info',
          content: 'To configure web search with Linkup:\n\n1. Get an API key at https://linkup.so\n2. Use: /websearch config <your-api-key>\n\nAlternatively, set it as environment variable: export LINKUP_API_KEY="your_key_here"',
        } as const;
      }

      // Set the API key in config
      cfg.setLinkupApiKey(apiKey);

      // Persist to .env file
      try {
        const workspaceDir = cfg.getTargetDir();
        const envFilePath = getEnvFilePath(workspaceDir);
        updateEnvFile(envFilePath, 'LINKUP_API_KEY', apiKey);
      } catch (error) {
        // Non-fatal; continue even if .env update fails
        console.error('Failed to update .env file:', error);
      }

      // Enable web search
      cfg.setWebSearchEnabled(true);

      // Recreate tool registry to register web_search tool
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cfg as any).toolRegistry = await cfg.createToolRegistry();
      } catch (_e) {
        // non-fatal; continue
      }

      // Refresh tool declarations
      try {
        await cfg.getGeminiClient().setTools();
      } catch (_e) {
        // non-fatal; continue
      }

      return {
        type: 'message',
        messageType: 'info',
        content: `Linkup API key configured successfully! Web search is now enabled.\n\nAPI key saved to: ${getEnvFilePath(cfg.getTargetDir())}`,
      } as const;
    }

    const current = cfg.getWebSearchEnabled();
    const next = desired === 'toggle' ? !current : desired;
    cfg.setWebSearchEnabled(next);

    const hasKey = !!cfg.getLinkupApiKey();
    if (next && !hasKey) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Web search enabled, but LINKUP_API_KEY is not configured.\n\nTo configure:\n1. Get an API key at https://linkup.so\n2. Set it as environment variable: export LINKUP_API_KEY="your_key_here"\n3. Or add it to your .env file: LINKUP_API_KEY=your_key_here',
      } as const;
    }

    // If enabling and key exists, ensure the registry includes web_search tool
    if (next && hasKey) {
      try {
        // Recreate tool registry so core tools (including web_search) are (re)registered
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cfg as any).toolRegistry = await cfg.createToolRegistry();
      } catch (_e) {
        // non-fatal; continue
      }
    }

    // Refresh tool declarations in the active chat so the model sees the change
    try {
      await cfg.getGeminiClient().setTools();
    } catch (_e) {
      // non-fatal; continue
    }

    return {
      type: 'message',
      messageType: 'info',
      content: next
        ? 'Web search enabled. The assistant may use the web_search tool when helpful.'
        : 'Web search disabled. The assistant will not call the web_search tool.',
    } as const;
  },
  completion: async (_context, partialArg) => {
    const opts = ['on', 'off', 'toggle', 'status', 'config'];
    const p = (partialArg || '').toLowerCase();
    return opts.filter((o) => o.startsWith(p));
  },
};
