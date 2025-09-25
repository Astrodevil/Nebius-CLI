import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';

interface OpenAIKeyPromptProps {
  onSubmit: (apiKey: string, baseUrl: string, model: string) => void;
  onCancel: () => void;
}

export function OpenAIKeyPrompt({
  onSubmit,
  onCancel,
}: OpenAIKeyPromptProps): React.JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const baseUrl = process.env.NEBIUS_BASE_URL
    ? process.env.NEBIUS_BASE_URL
    : 'https://api.studio.nebius.com/v1/';
  const model = process.env.NEBIUS_MODEL
    ? process.env.NEBIUS_MODEL
    : 'openai/gpt-oss-120b';

  useInput((input, key) => {
    let cleanInput = (input || '')
      .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\[200~/g, '')
      .replace(/\[201~/g, '')
      .replace(/^\[|~$/g, '');

    cleanInput = cleanInput
      .split('')
      .filter((ch) => ch.charCodeAt(0) >= 32)
      .join('');

    if (cleanInput.length > 0) {
      setApiKey((prev) => prev + cleanInput);
      return;
    }

    if (input.includes('\n') || input.includes('\r')) {
      if (apiKey.trim()) {
        onSubmit(apiKey.trim(), baseUrl, model);
      }
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.backspace || key.delete) {
      setApiKey((prev) => prev.slice(0, -1));
      return;
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.AccentBlue}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold color={Colors.AccentBlue}>
        OpenAI Configuration Required
      </Text>
      <Box marginTop={1}>
        <Text>
          Please enter your Nebius API Key. You can get an API key from{' '}
          <Text color={Colors.AccentBlue}>
            https://studio.nebius.com/settings/api-keys
          </Text>
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="row">
        <Box width={12}>
          <Text color={Colors.AccentBlue}>API Key:</Text>
        </Box>
        <Box flexGrow={1}>
          <Text>
            {'> '}
            {apiKey || ' '}
          </Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text color={Colors.Gray}>Press Enter to continue, Esc to cancel</Text>
      </Box>
    </Box>
  );
}
