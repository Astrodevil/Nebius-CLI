/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, SlashCommand } from './types.js';

export const websearchCommand: SlashCommand = {
  name: 'websearch',
  altNames: ['search', 'web'],
  description:
    'Enable or disable Linkup web search for this session. Usage: /websearch on | off | toggle | status | config. Note: requires LINKUP_API_KEY to be set.',
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

    const normalized = (args || '').trim().toLowerCase();
    let desired: boolean | 'toggle' | 'status' | 'config' = 'toggle';
    if (normalized === 'on' || normalized === 'enable') desired = true;
    else if (normalized === 'off' || normalized === 'disable') desired = false;
    else if (normalized === 'status') desired = 'status';
    else if (normalized === 'config' || normalized === 'configure') desired = 'config';
    else if (normalized === '' || normalized === 'toggle') desired = 'toggle';
    else {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Usage: /websearch on | off | toggle | status | config',
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
      return {
        type: 'message',
        messageType: 'info',
        content: 'To configure web search with Linkup:\n\n1. Get an API key at https://linkup.so\n2. Set it as environment variable: export LINKUP_API_KEY="your_key_here"\n3. Or add it to your .env file: LINKUP_API_KEY=your_key_here\n\nThen use "/websearch on" to enable web search.',
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
