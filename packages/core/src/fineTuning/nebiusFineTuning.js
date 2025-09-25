/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import { OpenAI } from 'openai';
export function createNebiusClient(baseURL, apiKey) {
  const key =
    apiKey || process.env.NEBIUS_API_KEY || process.env.NEBIUS_STUDIO_API_KEY;
  if (!key) throw new Error('Nebius API key not found. Set NEBIUS_API_KEY.');
  const base = baseURL || 'https://api.studio.nebius.com/v1/';
  return new OpenAI({ apiKey: key, baseURL: base });
}
export async function uploadDataset(client, datasetPath) {
  if (!datasetPath) return null;
  const stat = fs.statSync(datasetPath);
  if (!stat.isFile()) throw new Error(`Dataset not a file: ${datasetPath}`);
  const stream = fs.createReadStream(datasetPath);
  const file = await client.files.create({
    file: stream,
    purpose: 'fine-tune',
  });
  return { id: file.id };
}
export async function createFineTuneJob(client, req) {
  return client.fineTuning.jobs.create(req);
}
export async function retrieveJob(client, id) {
  return client.fineTuning.jobs.retrieve(id);
}
export async function listEvents(client, id) {
  return client.fineTuning.jobs.listEvents(id);
}
export async function listCheckpoints(client, id) {
  return client.fineTuning.jobs.checkpoints.list(id);
}
export async function downloadCheckpointFiles(client, jobId, outDir) {
  const cps = await listCheckpoints(client, jobId);
  for (const cp of cps.data ?? []) {
    const cpDir = path.join(outDir, cp.id);
    fs.mkdirSync(cpDir, { recursive: true });
    for (const fileId of cp.result_files ?? []) {
      const meta = await client.files.retrieve(fileId);
      const filename = meta.filename || `${fileId}.bin`;
      const content = await client.files.content(fileId);
      const filePath = path.join(cpDir, filename);
      await content.writeToFile(filePath);
    }
  }
}
export async function waitUntilDone(
  client,
  jobId,
  onUpdate,
  pollMs = Math.max(15000, Number(process.env.NEBIUS_POLL_MS) || 15000),
) {
  const active = ['validating_files', 'queued', 'running'];
  let job = await retrieveJob(client, jobId);
  while (active.includes(job.status)) {
    onUpdate(job.status);
    await new Promise((r) => setTimeout(r, pollMs));
    job = await retrieveJob(client, jobId);
  }
  onUpdate(job.status);
  return { id: job.id, status: job.status };
}
//# sourceMappingURL=nebiusFineTuning.js.map
