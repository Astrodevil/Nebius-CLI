/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
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
  wandb?: {
    api_key?: string;
    project?: string;
  } | null;
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
  training_file: string;
  validation_file?: string;
  suffix?: string;
  seed?: number;
  hyperparameters?: NebiusFineTuneHyperparams;
  integrations?: Array<
    | {
        type: 'wandb';
        wandb: NonNullable<NebiusIntegrations['wandb']>;
      }
    | {
        type: 'mlflow';
        mlflow: NonNullable<NebiusIntegrations['mlflow']>;
      }
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
export declare function createNebiusClient(
  baseURL?: string,
  apiKey?: string,
): OpenAI;
export declare function uploadDataset(
  client: OpenAI,
  datasetPath: string,
): Promise<{
  id: string;
} | null>;
export declare function createFineTuneJob(
  client: OpenAI,
  req: CreateFineTuneJobRequest,
): Promise<
  OpenAI.FineTuning.Jobs.FineTuningJob & {
    _request_id?: string | null;
  }
>;
export declare function retrieveJob(
  client: OpenAI,
  id: string,
): Promise<
  OpenAI.FineTuning.Jobs.FineTuningJob & {
    _request_id?: string | null;
  }
>;
export declare function listEvents(
  client: OpenAI,
  id: string,
): Promise<OpenAI.FineTuning.Jobs.FineTuningJobEventsPage>;
export declare function listCheckpoints(
  client: OpenAI,
  id: string,
): Promise<OpenAI.FineTuning.Jobs.Checkpoints.FineTuningJobCheckpointsPage>;
export declare function downloadCheckpointFiles(
  client: OpenAI,
  jobId: string,
  outDir: string,
): Promise<void>;
export declare function waitUntilDone(
  client: OpenAI,
  jobId: string,
  onUpdate: (status: FineTuneStatus) => void,
  pollMs?: number,
): Promise<FineTuneJob>;
