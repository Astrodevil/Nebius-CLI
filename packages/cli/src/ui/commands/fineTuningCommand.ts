/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, SlashCommand, CommandContext } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import {
  createNebiusClient,
  uploadDataset,
  createFineTuneJob,
  waitUntilDone,
  downloadCheckpointFiles,
  retrieveJob,
} from '@nebius-code/nebius-code-core';
import { loadEnvironment } from '../../config/settings.js';
import dotenv from 'dotenv';

const USAGE = `Nebius fine-tuning

Usage:
/fine-tuning --model <model_id> --train <dataset.jsonl> [options]

Required:
--model <id>            Nebius base model id
--train <path.jsonl>    Training dataset (.jsonl)

Optional:
--val <path.jsonl>          Validation dataset (.jsonl)
--suffix <name>             Suffix for fine-tuned model name
--seed <int>
--batch-size <int>
--learning-rate <float>
--n-epochs <int>
--warmup-ratio <float>
--weight-decay <float>
--lora [true|false]
--lora-r <int>
--lora-alpha <int>
--lora-dropout <float>
--packing [true|false]
--max-grad-norm <float>
--out <dir>                 Output directory for checkpoints (default: ./nebius-finetune/<jobId>)
--poll <secs>               Poll interval (min 15s)

Model selection:
If --model is omitted, the CLI opens a selection dialog from a predefined list of supported models.

Integrations:
--wandb-api-key <key>       Weights & Biases API key
--wandb-project <name>
--mlflow-tracking-uri <uri>
--mlflow-cert <path>
--mlflow-username <name>
--mlflow-password <pwd>
--mlflow-experiment <name>
--mlflow-run-name <name>

Environment:
NEBIUS_API_KEY (required)
NEBIUS_BASE_URL (optional, defaults to https://api.studio.nebius.com/v1)

Examples:
/fine-tuning --model meta-llama/Llama-3.1-8B-Instruct --train data/train.jsonl --n-epochs 3 --lora true
/fine-tuning --model Nebius/Nebius2.5-7B-Instruct --train data/train.jsonl --n-epochs 1
`;

// --- Completion Suggestions Helpers ---
const MAIN_COMMAND_FLAGS = [
  '--model',
  '--train',
  '--val',
  '--suffix',
  '--seed',
  '--batch-size',
  '--learning-rate',
  '--n-epochs',
  '--warmup-ratio',
  '--weight-decay',
  '--lora',
  '--lora-r',
  '--lora-alpha',
  '--lora-dropout',
  '--packing',
  '--max-grad-norm',
  '--out',
  '--poll',
  '--wandb-api-key',
  '--wandb-project',
  '--mlflow-tracking-uri',
  '--mlflow-cert',
  '--mlflow-username',
  '--mlflow-password',
  '--mlflow-experiment',
  '--mlflow-run-name',
  '--help',
];
const BOOLEAN_FLAGS = new Set(['--lora', '--packing', '--help']);

// Hardcoded list of supported base models for fine-tuning and completion suggestions
const HARDCODED_MODELS: string[] = Array.from(
  new Set([
    'deepseek-ai/DeepSeekV3-0324',
    'meta-llama/Llama-3.2-1B-Instruct',
    'meta-llama/Llama-3.2-3B-Instruct',
    'meta-llama/Llama-3.1-8B-Instruct',
    'meta-llama/Llama-3.1-70B',
    'meta-llama/Llama-3.3-70B-Instruct',
    'Qwen/Qwen3-14B',
    'Qwen/Qwen3-32B',
  ]),
);
async function suggestFilePaths(partialPath: string): Promise<string[]> {
  try {
    const cwd = process.cwd();
    const dirToRead = path.dirname(path.join(cwd, partialPath));
    const partialBaseName = path.basename(partialPath);
    const entries = await fs.promises.readdir(dirToRead, {
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.name.startsWith(partialBaseName))
      .map((entry) => {
        const suggestionBase = path.dirname(partialPath);
        const finalSuggestion = path
          .join(suggestionBase, entry.name)
          .replace(/\\/g, '/');
        return entry.isDirectory() ? `${finalSuggestion}/` : finalSuggestion;
      });
  } catch (_e) {
    return [];
  }
}

export const fineTuningCommand: SlashCommand = {
  name: 'fine-tuning',
  description: 'Create and monitor a Nebius fine-tuning job',
  kind: CommandKind.BUILT_IN,

  async completion(
    _ctx: CommandContext,
    partialArgs: string,
  ): Promise<string[]> {
    const tokens = tokenize(partialArgs || '');
    const partial = tokens[tokens.length - 1] ?? '';

    // Previous token (flag) if it exists
    const prevToken = tokens.length > 1 ? tokens[tokens.length - 2] : undefined;

    let flag: string | null = null;
    let valuePartial = partial;

    // Case 1: last token is concatenated flag + value
    for (const f of MAIN_COMMAND_FLAGS.filter((f) => !BOOLEAN_FLAGS.has(f))) {
      if (partial.startsWith(f)) {
        flag = f;
        valuePartial = partial.slice(f.length);
        break;
      }
    }

    // Case 2: previous token is a flag, current token is partial or empty
    if (
      !flag &&
      prevToken &&
      prevToken.startsWith('--') &&
      !BOOLEAN_FLAGS.has(prevToken)
    ) {
      flag = prevToken;
      valuePartial = partial; // can be empty if user typed a space
    }

    // Suggest values for flags
    if (flag) {
      switch (flag) {
        case '--model': {
          return HARDCODED_MODELS
            .filter((m) => m.startsWith(valuePartial))
            .map((m) => `${flag} ${m}`);
        }
        case '--train':
        case '--val':
        case '--mlflow-cert': {
          const paths = await suggestFilePaths(valuePartial);
          return paths.map((p) => `${flag} ${p}`);
        }
        case '--out': {
          const paths = await suggestFilePaths(valuePartial);
          return paths
            .filter((p) => p.endsWith('/'))
            .map((p) => `${flag} ${p}`);
        }
        default:
          return [];
      }
    }

    // Track used flags
    const usedFlags = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.startsWith('--')) {
        usedFlags.add(token);
        if (!BOOLEAN_FLAGS.has(token) && i + 1 < tokens.length) i++; // skip value
      }
    }

    // Suggest 'status' at the beginning
    if (tokens.length === 0) {
      return ['status', ...MAIN_COMMAND_FLAGS];
    }

    // Suggest remaining flags
    return MAIN_COMMAND_FLAGS.filter(
      (f) => f.startsWith(partial) && !usedFlags.has(f),
    );
  },

  async action(context, args) {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
    let apiKey = context.services.config?.getApiKey();
    if (!apiKey) {
      // Fallback to environment variables if config doesn't have the key
      apiKey = process.env.NEBIUS_API_KEY || process.env.NEBIUS_STUDIO_API_KEY;
      if (!apiKey) {
        try {
          const contextServices = (context as { services?: { settings?: { merged?: unknown } } })?.services;
          const mergedAny = contextServices?.settings?.merged;
          const mergedSettings = typeof mergedAny === 'function' ? mergedAny() : mergedAny;
          loadEnvironment(mergedSettings);
          apiKey =
            process.env.NEBIUS_API_KEY || process.env.NEBIUS_STUDIO_API_KEY;
        } catch {
          // Ignore environment loading errors
        }
      }
    }
    if (!args || args.trim() === '' || /--help\b/.test(args)) {
      return { type: 'message', messageType: 'info', content: USAGE };
    }
    if (!apiKey) {
      return {
        type: 'message',
        messageType: 'error',
        content:
          'Nebius API key not found. Set NEBIUS_API_KEY and retry.\n\n' + USAGE,
      };
    }
    const tokens = tokenize(args);
    const flags = parseFlags(tokens);
    let model = flags['--model'];
    if (!model) {
      const contextServices = (context as { services?: { settings?: { merged?: unknown } } })?.services;
      const mergedAny = contextServices?.settings?.merged;
      const mergedSettings = typeof mergedAny === 'function' ? mergedAny() : mergedAny;
      const currentModel = mergedSettings?.model ?? '';
      if (currentModel) {
        model = currentModel;
      } else {
        const modelList = HARDCODED_MODELS.map((id) => ({
          id,
          name: id,
          description: '',
          isCurrent: false,
        }));
        if (modelList.length) {
          return { type: 'dialog', dialog: 'models', models: modelList };
        }
        return { type: 'message', messageType: 'error', content: 'No models available to select. Please specify --model explicitly.' };
      }
    }
    const train = flags['--train'];
    if (!train) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Missing required flag: --train\n\n${USAGE}`,
      };
    }
    const problems: string[] = [];
    const absTrain = toAbs(train);
    if (!fs.existsSync(absTrain) || !fs.statSync(absTrain).isFile()) {
      problems.push(`Training dataset not found: ${absTrain}`);
    } else if (!absTrain.toLowerCase().endsWith('.jsonl')) {
      problems.push(`Training dataset must be a .jsonl file: ${absTrain}`);
    }
    let absVal: string | null = null;
    if (flags['--val']) {
      absVal = toAbs(flags['--val']);
      if (!fs.existsSync(absVal) || !fs.statSync(absVal).isFile()) {
        problems.push(`Validation dataset not found: ${absVal}`);
      } else if (!absVal.toLowerCase().endsWith('.jsonl')) {
        problems.push(`Validation dataset must be a .jsonl file: ${absVal}`);
      }
    }
    const outDir = toAbs(
      flags['--out'] || path.join(process.cwd(), 'nebius-finetune'),
    );
    const num = (k: string) => (k in flags ? Number(flags[k]) : undefined);
    const bool = (k: string) => (k in flags ? parseBool(flags[k]) : undefined);
    const hp: Record<string, unknown> = {
      batch_size: num('--batch-size'),
      learning_rate: num('--learning-rate'),
      n_epochs: num('--n-epochs'),
      warmup_ratio: num('--warmup-ratio'),
      weight_decay: num('--weight-decay'),
      lora: bool('--lora'),
      lora_r: num('--lora-r'),
      lora_alpha: num('--lora-alpha'),
      lora_dropout: num('--lora-dropout'),
      packing: bool('--packing'),
      max_grad_norm: num('--max-grad-norm'),
    };
    for (const k of Object.keys(hp)) if (hp[k] === undefined) delete hp[k];
    const suffix = flags['--suffix'];
    const seed = flags['--seed'] ? Number(flags['--seed']) : undefined;
    const wandb =
      flags['--wandb-api-key'] || flags['--wandb-project']
        ? {
            api_key: flags['--wandb-api-key'],
            project: flags['--wandb-project'],
          }
        : undefined;
    const mlflow = flags['--mlflow-tracking-uri']
      ? {
          tracking_uri: flags['--mlflow-tracking-uri'],
          certificate_file: flags['--mlflow-cert'],
          username: flags['--mlflow-username'],
          password: flags['--mlflow-password'],
          experiment_name: flags['--mlflow-experiment'],
          run_name: flags['--mlflow-run-name'],
        }
      : undefined;
    const pollSecs = flags['--poll']
      ? Math.max(15, Number(flags['--poll']))
      : 15;
    if (problems.length) {
      return {
        type: 'message',
        messageType: 'error',
        content: problems.join('\n'),
      };
    }
    const plan = [
      `Model: ${model}`,
      `Train: ${absTrain}`,
      `Val: ${absVal ?? '(none)'} `,
      `OutDir: ${outDir}`,
      `Suffix: ${suffix ?? '(none)'} | Seed: ${seed ?? '(none)'} | Poll(s): ${pollSecs}`,
      `Hyperparams: ${Object.keys(hp).length ? JSON.stringify(hp) : '(defaults)'}`,
      `Integrations: ${wandb ? 'wandb ' : ''}${mlflow ? 'mlflow' : ''}`.trim() ||
        'Integrations: (none)',
      '',
      'Starting: uploading datasets → creating job → polling → downloading checkpoints...',
    ].join('\n');
    fs.mkdirSync(outDir, { recursive: true });
    try {
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let frameIdx = 0;
      const nextFrame = () => frames[frameIdx++ % frames.length];
      context.ui.setPendingItem({
        type: 'info',
        text: `${nextFrame()}\n${plan}`,
      });
      context.ui.addItem?.(
        { type: 'info', text: 'Fine-tuning: starting upload…' },
        Date.now(),
      );
      context.ui.setDebugMessage?.('fine-tune: uploading training dataset...');
      console.log('[fine-tune] Starting... Uploading training dataset.');
      // Get API key from config first, then fall back to environment variables
      const apiKey = context.services.config?.getApiKey() ||
        process.env.NEBIUS_API_KEY || process.env.NEBIUS_STUDIO_API_KEY;
      
      if (!apiKey) {
        context.ui.setPendingItem(null);
        return {
          type: 'message',
          messageType: 'error',
          content: 'Nebius API key not found. Please configure authentication using /auth command.',
        };
      }
      
      const client = createNebiusClient(undefined, apiKey);
      const trainUpload = await uploadDataset(client, absTrain);
      context.ui.addItem?.(
        { type: 'info', text: '📤 Training dataset uploaded.' },
        Date.now(),
      );
      if (absVal) {
        context.ui.setDebugMessage?.(
          'fine-tune: uploading validation dataset...',
        );
        console.log('[fine-tune] Uploading validation dataset...');
        context.ui.setPendingItem({
          type: 'info',
          text: `${nextFrame()} Uploading validation dataset...\n${plan}`,
        });
      }
      const valUpload = absVal
        ? await uploadDataset(client, absVal)
        : null;
      if (absVal)
        context.ui.addItem?.(
          { type: 'info', text: '📤 Validation dataset uploaded.' },
          Date.now(),
        );
      const integrations: Array<{ type: string; [key: string]: unknown }> = [];
      if (wandb && (wandb.api_key || wandb.project))
        integrations.push({ type: 'wandb', wandb });
      if (mlflow && mlflow.tracking_uri)
        integrations.push({ type: 'mlflow', mlflow });
      const request: Record<string, unknown> = {
        model,
        training_file: trainUpload?.id,
        validation_file: valUpload?.id,
        hyperparameters: Object.keys(hp).length ? hp : undefined,
        suffix,
        seed,
        integrations: integrations.length ? integrations : undefined,
      };
      context.ui.setDebugMessage?.('fine-tune: creating job...');
      console.log('[fine-tune] Creating fine-tuning job...');
      const job = await createFineTuneJob(client, request as unknown as Parameters<typeof createFineTuneJob>[1]) as { id: string };
      const jobId: string = job.id;
      console.log(
        `[fine-tune] Job created: ${jobId}. Polling every ${pollSecs}s...`,
      );
      context.ui.setPendingItem({
        type: 'info',
        text: [
          `${nextFrame()} Polling...`,
          plan,
          '',
          `Job: ${jobId}`,
          `Polling every ${pollSecs}s...`,
        ].join('\n'),
      });
      context.ui.addItem?.(
        {
          type: 'info',
          text: `Fine-tuning job created: ${jobId}. Polling every ${pollSecs}s…`,
        },
        Date.now(),
      );
      const pollMs = Math.max(15000, pollSecs * 1000);
      await waitUntilDone(
        client,
        jobId,
        (status) => {
          const ts = new Date().toLocaleTimeString();
          context.ui.setDebugMessage?.(`fine-tune ${jobId}: ${status} @ ${ts}`);
          console.log(`[fine-tune] ${jobId}: ${status} @ ${ts}`);
          context.ui.setPendingItem({
            type: 'info',
            text: [
              `${nextFrame()} ${status} @ ${ts}`,
              plan,
              '',
              `Job: ${jobId}`,
            ].join('\n'),
          });
        },
        pollMs,
      );
      context.ui.setDebugMessage?.('fine-tune: downloading checkpoints...');
      console.log('[fine-tune] Downloading checkpoints...');
      context.ui.setPendingItem({
        type: 'info',
        text: `${nextFrame()} Downloading checkpoints...\n${plan}`,
      });
      const jobOutDir = path.join(outDir, jobId);
      fs.mkdirSync(jobOutDir, { recursive: true });
      await downloadCheckpointFiles(client, jobId, jobOutDir);
      const summary = [
        '✅ Fine-tuning completed',
        plan,
        '',
        `Job ID: ${jobId}`,
        `Artifacts saved to: ${jobOutDir}`,
        'Use the latest checkpoint for hosting.',
      ].join('\n');
      context.ui.setPendingItem(null);
      return { type: 'message', messageType: 'info', content: summary };
    } catch (err) {
      let details = '';
      const anyErr = err as { status?: number; response?: { status?: number; data?: unknown }; error?: unknown; body?: unknown };
      const status = anyErr?.status || anyErr?.response?.status;
      try {
        const data = anyErr?.response?.data || anyErr?.error || anyErr?.body;
        if (data) {
          details = `\nDetails: ${typeof data === 'string' ? data : JSON.stringify(data)}`;
        }
        } catch {
          // Silently ignore JSON parsing errors
        }
      const msg = err instanceof Error ? err.message : String(err);
      const statusPart = status ? ` (HTTP ${status})` : '';
      context.ui.setPendingItem(null);
      return {
        type: 'message',
        messageType: 'error',
        content: `❌ Fine-tuning failed${statusPart}: ${msg}${details}`,
      };
    }
  },
  subCommands: [
    {
      name: 'status',
      description:
        'Check status of an existing fine-tuning job and optionally download artifacts',
      kind: CommandKind.BUILT_IN,
      async action(context, args) {
        // Get API key from config first, then fall back to environment variables
        let apiKey = context.services.config?.getApiKey();
        if (!apiKey) {
          apiKey = process.env.NEBIUS_API_KEY || process.env.NEBIUS_STUDIO_API_KEY;
        }
        if (!apiKey) {
          try {
            const contextServices = (context as { services?: { settings?: { merged?: unknown } } })?.services;
            const mergedAny = contextServices?.settings?.merged;
            const mergedSettings = typeof mergedAny === 'function' ? mergedAny() : mergedAny;
            loadEnvironment(mergedSettings);
            apiKey =
              process.env.NEBIUS_API_KEY || process.env.NEBIUS_STUDIO_API_KEY;
          } catch {
            // Ignore environment loading errors
          }
        }
        if (!apiKey) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Nebius API key not found. Please configure authentication using /auth command.',
          };
        }
        if (!args || /--help\b/.test(args)) {
          return {
            type: 'message',
            messageType: 'info',
            content:
              'Usage: /fine-tuning status <jobId> [--out <dir>] [--download true|false] [--poll <secs>]\n',
          };
        }
        const tokens = tokenize(args);
        const jobId = tokens.find((t) => !t.startsWith('--')) ?? '';
        const flags = parseFlags(tokens.filter((t) => t !== jobId));
        if (!jobId) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Missing <jobId>.',
          };
        }
        const outDir = toAbs(
          flags['--out'] || path.join(process.cwd(), 'nebius-finetune'),
        );
        const shouldDownload = flags['--download']
          ? parseBool(flags['--download']) !== false
          : true;
        const pollSecs = flags['--poll']
          ? Math.max(15, Number(flags['--poll']))
          : 15;
        const pollMs = Math.max(15000, pollSecs * 1000);
        const client = createNebiusClient(undefined, apiKey);
        const update = (status: string) => {
          const ts = new Date().toLocaleTimeString();
          context.ui.setDebugMessage?.(`fine-tune ${jobId}: ${status} @ ${ts}`);
        };
        let summary: string;
        if ('--poll' in flags) {
          const job = await waitUntilDone(
            client,
            jobId,
            update,
            pollMs,
          ) as { id: string; status: string };
          summary = `Job ${job.id} ended with status: ${job.status}`;
        } else {
          const job = await retrieveJob(client, jobId) as { id: string; status: string };
          update(job.status);
          summary = `Job ${job.id} current status: ${job.status}`;
        }
        let artifactsMsg = '';
        if (shouldDownload) {
          const jobOutDir = path.join(outDir, jobId);
          fs.mkdirSync(jobOutDir, { recursive: true });
          await downloadCheckpointFiles(client, jobId, jobOutDir);
          artifactsMsg = `\nArtifacts saved to: ${jobOutDir}`;
        }
        return {
          type: 'message',
          messageType: 'info',
          content: summary + artifactsMsg,
        };
      },
    },
  ],
};

function tokenize(s: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (/\s/.test(ch)) {
        if (cur) {
          tokens.push(cur);
          cur = '';
        }
      } else {
        cur += ch;
      }
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}
function parseFlags(tokens: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('--')) {
      const next = tokens[i + 1];
      if (!next || next.startsWith('--')) {
        out[t] = 'true';
      } else {
        out[t] = next;
        i++;
      }
    }
  }
  return out;
}
function parseBool(v: string | undefined): boolean | undefined {
  if (v == null) return undefined;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return true;
}
function toAbs(p: string) {
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}
