/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { OpenAI } from 'openai';

export interface NebiusFineTuneHyperparams {
  batch_size?: number;
  learning_rate?: number;
  n_epochs?: number;
  warmup_ratio?: number;
  weight_decay?: number;
  lora?: boolean;
  lora_r?: number;
  lora_alpha?: number;
  lora_dropout?: number;
  packing?: boolean;
  max_grad_norm?: number;
}

export interface NebiusIntegrations {
  wandb?: { api_key?: string; project?: string } | null;
  mlflow?: {
    tracking_uri: string;
    certificate_file: string;
    username: string;
    password: string;
    experiment_name?: string;
    run_name?: string;
  } | null;
}

export interface CreateFineTuneJobRequest {
  model: string;
  training_file: string; // file id
  validation_file?: string; // file id
  suffix?: string;
  seed?: number;
  hyperparameters?: NebiusFineTuneHyperparams;
  integrations?: Array<
    | { type: 'wandb'; wandb: NonNullable<NebiusIntegrations['wandb']> }
    | { type: 'mlflow'; mlflow: NonNullable<NebiusIntegrations['mlflow']> }
  >;
}

export type FineTuneStatus =
  | 'validating_files'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface FineTuneJob {
  id: string;
  status: FineTuneStatus;
}

export function createNebiusClient(baseURL?: string, apiKey?: string) {
  // First try the provided apiKey parameter, then fall back to environment variables
  const key =
    apiKey || process.env.NEBIUS_API_KEY || process.env.NEBIUS_STUDIO_API_KEY;
  if (!key) throw new Error('Nebius API key not found. Set NEBIUS_API_KEY.');
  const base = baseURL || 'https://api.studio.nebius.com/v1/';
  return new OpenAI({ apiKey: key, baseURL: base });
}

export async function uploadDataset(
  client: OpenAI,
  datasetPath: string,
): Promise<{ id: string } | null> {
  if (!datasetPath) return null;
  const stat = fs.statSync(datasetPath);
  if (!stat.isFile()) throw new Error(`Dataset not a file: ${datasetPath}`);
  const stream = fs.createReadStream(datasetPath);
  const file = await client.files.create({
    file: stream as any,
    purpose: 'fine-tune',
  });
  return { id: (file as any).id };
}

export async function createFineTuneJob(
  client: OpenAI,
  req: CreateFineTuneJobRequest,
) {
  return client.fineTuning.jobs.create(req as any);
}

export async function retrieveJob(client: OpenAI, id: string) {
  return client.fineTuning.jobs.retrieve(id as any);
}

export async function listEvents(client: OpenAI, id: string) {
  return client.fineTuning.jobs.listEvents(id as any);
}

export async function listCheckpoints(client: OpenAI, id: string) {
  return client.fineTuning.jobs.checkpoints.list(id as any);
}

export async function downloadCheckpointFiles(
  client: OpenAI,
  jobId: string,
  outDir: string,
) {
  const cps = await listCheckpoints(client, jobId);
  for (const cp of (cps as any).data ?? []) {
    const cpDir = path.join(outDir, cp.id);
    fs.mkdirSync(cpDir, { recursive: true });
    for (const fileId of cp.result_files ?? []) {
      const meta = await client.files.retrieve(fileId);
      const filename = (meta as any).filename || `${fileId}.bin`;
      const content = await client.files.content(fileId);
      const filePath = path.join(cpDir, filename);
      await (content as any).writeToFile(filePath);
    }
  }
}

export async function waitUntilDone(
  client: OpenAI,
  jobId: string,
  onUpdate: (status: FineTuneStatus) => void,
  pollMs = Math.max(15000, Number(process.env.NEBIUS_POLL_MS) || 15000),
): Promise<FineTuneJob> {
  const active: FineTuneStatus[] = ['validating_files', 'queued', 'running'];
  let job: any = await retrieveJob(client, jobId);
  while (active.includes(job.status)) {
    onUpdate(job.status);
    await new Promise((r) => setTimeout(r, pollMs));
    job = await retrieveJob(client, jobId);
  }
  onUpdate(job.status);
  return { id: job.id, status: job.status };
}
