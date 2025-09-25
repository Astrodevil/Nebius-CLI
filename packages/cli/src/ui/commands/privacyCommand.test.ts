/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import open from 'open';
import { privacyCommand } from './privacyCommand.js';
import { type CommandContext } from './types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { MessageType } from '../types.js';

// Mock the 'open' library
vi.mock('open', () => ({
  default: vi.fn(),
}));

describe('privacyCommand', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    mockContext = createMockCommandContext();
    vi.mocked(open).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should add an info message and call open in a non-sandbox environment', async () => {
    if (!privacyCommand.action) {
      throw new Error('privacyCommand must have an action.');
    }

    const privUrl = 'https://docs.studio.nebius.com/legal/privacy-policy';

    await privacyCommand.action(mockContext, '');

    expect(mockContext.ui.addItem).toHaveBeenCalledWith(
      {
        type: MessageType.INFO,
        text: `Opening privacy policy in your browser: ${privUrl}`,
      },
      expect.any(Number),
    );

    expect(open).toHaveBeenCalledWith(privUrl);
  });

  it('should have the correct name and description', () => {
    expect(privacyCommand.name).toBe('privacy');
    expect(privacyCommand.description).toBe('display the privacy notice');
  });
});
