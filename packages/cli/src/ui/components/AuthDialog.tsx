/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';
import { LoadedSettings, SettingScope } from '../../config/settings.js';
import { AuthType } from '@nebius-code/nebius-code-core';
import {
  validateAuthMethod,
  setOpenAIApiKey,
  setOpenAIBaseUrl,
  setOpenAIModel,
} from '../../config/auth.js';
import { OpenAIKeyPrompt } from './OpenAIKeyPrompt.js';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Read existing config
const existingApiKey =
  process.env.NEBIUS_API_KEY || process.env.NEBIUS_STUDIO_API_KEY;
const existingModel =
  process.env.NEBIUS_MODEL || process.env.NEBIUS_STUDIO_MODEL;

function saveApiKeyToEnv(apiKey: string) {
  const envPath = path.resolve(process.cwd(), '.env');

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  const keyLine = `NEBIUS_API_KEY=${apiKey}`;
  const modelLine = `NEBIUS_MODEL=openai/gpt-oss-120b`;

  // Replace existing NEBIUS_API_KEY or append if not present
  let newEnvContent = envContent.includes('NEBIUS_API_KEY=')
    ? envContent.replace(/NEBIUS_API_KEY=.*/g, keyLine)
    : envContent + (envContent.endsWith('\n') ? '' : '\n') + keyLine + '\n';

  // Only add NEBIUS_MODEL if not present
  if (!newEnvContent.includes('NEBIUS_MODEL=')) {
    newEnvContent += '\n' + modelLine + '\n';
  }

  fs.writeFileSync(envPath, newEnvContent, { encoding: 'utf-8' });
}

interface AuthDialogProps {
  onSelect: (authMethod: AuthType | undefined, scope: SettingScope) => void;
  settings: LoadedSettings;
  initialErrorMessage?: string | null;
}

function parseDefaultAuthType(
  defaultAuthType: string | undefined,
): AuthType | null {
  if (
    defaultAuthType &&
    Object.values(AuthType).includes(defaultAuthType as AuthType)
  ) {
    return defaultAuthType as AuthType;
  }
  return null;
}

export function AuthDialog({
  onSelect,
  settings,
  initialErrorMessage,
}: AuthDialogProps): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage || null,
  );
  const [showOpenAIKeyPrompt, setShowOpenAIKeyPrompt] = useState(false);
  const items = [
    { label: 'Nebius API Key (OpenAI Compatible)', value: AuthType.USE_OPENAI },
  ];

  const initialAuthIndex = Math.max(
    0,
    items.findIndex((item) => {
      if (settings.merged.selectedAuthType) {
        return item.value === settings.merged.selectedAuthType;
      }

      const defaultAuthType = parseDefaultAuthType(
        process.env.GEMINI_DEFAULT_AUTH_TYPE,
      );
      if (defaultAuthType) {
        return item.value === defaultAuthType;
      }

      if (process.env.GEMINI_API_KEY) {
        return item.value === AuthType.USE_GEMINI;
      }

      if (process.env.QWEN_OAUTH_TOKEN) {
        return item.value === AuthType.QWEN_OAUTH;
      }

      return item.value === AuthType.LOGIN_WITH_GOOGLE;
    }),
  );
  // Only automatically use existing API key if there's no error message
  // (i.e., this is the initial auth setup, not a re-auth scenario)
  useEffect(() => {
    // Auto-accept only during initial setup (no selected auth type yet)
    if (
      existingApiKey &&
      !initialErrorMessage &&
      settings.merged.selectedAuthType === undefined
    ) {
      setOpenAIApiKey(existingApiKey);
      setOpenAIBaseUrl(
        process.env.NEBIUS_BASE_URL
          ? process.env.NEBIUS_BASE_URL
          : 'https://api.studio.nebius.com/v1/',
      ); // hard-coded baseUrl
      setOpenAIModel(
        existingModel
          ? existingModel
          : 'openai/gpt-oss-120b',
      );
      onSelect(AuthType.USE_OPENAI, SettingScope.User);
    }
  }, [initialErrorMessage, settings.merged.selectedAuthType]);

  const handleAuthSelect = (authMethod: AuthType) => {
    const error = validateAuthMethod(authMethod);
    if (error) {
      if (authMethod === AuthType.USE_OPENAI && !process.env.NEBIUS_API_KEY) {
        setShowOpenAIKeyPrompt(true);
        setErrorMessage(null);
      } else {
        setErrorMessage(error);
      }
    } else if (authMethod === AuthType.USE_OPENAI) {
      // Always show the key prompt for OpenAI auth to allow re-entering the key
      setShowOpenAIKeyPrompt(true);
      setErrorMessage(null);
    } else {
      setErrorMessage(null);
      onSelect(authMethod, SettingScope.User);
    }
  };

  const handleOpenAIKeySubmit = (
    apiKey: string,
    baseUrl: string,
    model: string,
  ) => {
    setOpenAIApiKey(apiKey);
    console.log(baseUrl);
    setOpenAIBaseUrl(baseUrl);
    setOpenAIModel(model);
    // Save key to .env
    saveApiKeyToEnv(apiKey);
    setShowOpenAIKeyPrompt(false);
    onSelect(AuthType.USE_OPENAI, SettingScope.User);
  };

  const handleOpenAIKeyCancel = () => {
    setShowOpenAIKeyPrompt(false);
    setErrorMessage('Nebius API key is required to use Nebius authentication.');
  };

  useInput((_input, key) => {
    if (showOpenAIKeyPrompt) {
      return;
    }

    if (key.escape) {
      // Prevent exit if there is an error message.
      // This means they user is not authenticated yet.
      if (errorMessage) {
        return;
      }
      if (settings.merged.selectedAuthType === undefined) {
        // Prevent exiting if no auth method is set
        setErrorMessage(
          'You must select an auth method to proceed. Press Ctrl+C twice to exit.',
        );
        return;
      }
      onSelect(undefined, SettingScope.User);
    }
  });

  if (showOpenAIKeyPrompt) {
    return (
      <OpenAIKeyPrompt
        onSubmit={handleOpenAIKeySubmit}
        onCancel={handleOpenAIKeyCancel}
      />
    );
  }

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Get started</Text>
      <Box marginTop={1}>
        <Text>How would you like to authenticate for this project?</Text>
      </Box>
      {existingApiKey && (
        <Box marginTop={1}>
          <Text color={Colors.AccentGreen}>
            ✓ Nebius API key is already configured. Selecting "Nebius API Key" will allow you to change it.
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <RadioButtonSelect
          items={items}
          initialIndex={initialAuthIndex}
          onSelect={handleAuthSelect}
          isFocused={true}
        />
      </Box>
      {errorMessage && (
        <Box marginTop={1}>
          <Text color={Colors.AccentRed}>{errorMessage}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={Colors.AccentPurple}>(Use Enter to Set Auth)</Text>
      </Box>
      <Box marginTop={1}>
        <Text>Terms of Services and Privacy Notice for Nebius CLI</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={Colors.AccentBlue}>
          {'https://github.com/NebiusLM/Nebius3-Coder/blob/main/README.md'}
        </Text>
      </Box>
    </Box>
  );
}
