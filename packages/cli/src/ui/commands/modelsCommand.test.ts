import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { modelsCommand } from './modelsCommand.js';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

describe('modelsCommand', () => {
  let mockContext: any;
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, NEBIUS_API_KEY: 'test-api-key' };
    mockContext = {
      services: {
        settings: { merged: () => ({ model: 'gemini-pro' }) },
        logger: { log: vi.fn(), error: vi.fn() },
      },
    };
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  // Load .env if it exists
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  it('returns error when NEBIUS_API_KEY is missing', async () => {
    delete process.env.NEBIUS_API_KEY;
    const result = await modelsCommand.action!(mockContext, '');
    expect(result).toMatchObject({
      type: 'message',
      messageType: 'error',
      content: expect.stringContaining('Nebius API key not found'),
    });
  });

  it('fetches and returns models', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'gemini-pro',
            name: 'Gemini Pro',
            architecture: { modality: 'text->text' },
          },
        ],
      }),
    });

    const result = await modelsCommand.action!(mockContext, '');
    expect(result).toMatchObject({
      type: 'dialog',
      dialog: 'models',
      currentModel: 'gemini-pro',
    });
  });
});
