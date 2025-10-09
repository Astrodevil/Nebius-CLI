import { CommandKind, SlashCommand } from './types.js';

interface Model {
  id: string;
  name: string;
  description?: string;
  architecture?: {
    modality: string;
  };
}

export const modelsCommand: SlashCommand = {
  name: 'models',
  description: 'List and select available Nebius models',
  kind: CommandKind.BUILT_IN,
  async action(context, _args) {
    try {
      // Get API key from config first, then fallback to environment variables
      let apiKey = context.services.config?.getApiKey();
      if (!apiKey) {
        apiKey = process.env.NEBIUS_API_KEY || process.env.NEBIUS_STUDIO_API_KEY;
      }
      if (!apiKey) {
        return {
          type: 'message',
          messageType: 'error',
          content:
            'Nebius API key not found. Please authenticate with /auth or set NEBIUS_API_KEY in your .env file.',
        };
      }
      // Determine base URL (prefer env override, otherwise default to Nebius Studio)
      const rawBase = process.env.NEBIUS_BASE_URL
        ? process.env.NEBIUS_BASE_URL
        : 'https://api.studio.nebius.com/v1';
      // Normalize base URL to avoid double slashes
      const baseUrl = rawBase.replace(/\/$/, '');

      // Fetch available models from Nebius API
      const response = await fetch(`${baseUrl}/models?verbose=true`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const textModels = (data.data || []).filter(
        (m: Model) => m.architecture?.modality === 'text->text',
      );

      if (textModels.length === 0) {
        return {
          type: 'message',
          messageType: 'info',
          content: 'No text models available',
        };
      }

      // Get current model from settings if available
      // Support both implementations: merged as an object/getter or a function
      const mergedAny: any = (context as any)?.services?.settings?.merged;
      const mergedSettings =
        typeof mergedAny === 'function' ? mergedAny() : mergedAny;
      const currentModel = mergedSettings?.model ?? '';

      // Create a simple UI for model selection
      const modelList = textModels.map((model: Model) => ({
        id: model.id,
        name: model.name,
        description: model.description || '',
        isCurrent: model.id === currentModel,
      }));

      return {
        type: 'dialog',
        dialog: 'models',
        models: modelList,
        currentModel,
      };
    } catch (error) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
