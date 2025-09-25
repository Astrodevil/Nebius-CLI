import { useState, useCallback } from 'react';
import { LoadedSettings, SettingScope } from '../../config/settings.js';
import { Config } from '@nebius-code/nebius-code-core';

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  isCurrent: boolean;
}

export function useModelDialog(settings: LoadedSettings, config?: Config) {
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const openModelDialog = useCallback(
    (modelData: { models: ModelInfo[]; currentModel: string }) => {
      setModels(modelData.models);
      setCurrentModel(modelData.currentModel);
      setError(null);
      setIsModelDialogOpen(true);
    },
    [],
  );

  const closeModelDialog = useCallback(() => {
    setIsModelDialogOpen(false);
    setError(null);
  }, []);

  const handleModelSelect = useCallback(
    async (modelId: string) => {
      try {
        // Update the model in settings using the proper setValue method
        settings.setValue(SettingScope.User, 'model', modelId);
        
        // Update the current config's model if config is provided
        if (config) {
          config.setModel(modelId);
          
          // Reinitialize the client with the new model to ensure it's used for API calls
          const geminiClient = config.getGeminiClient();
          if (geminiClient) {
            try {
              await geminiClient.initialize(config.getContentGeneratorConfig());
            } catch (initError) {
              console.warn('Failed to reinitialize client with new model:', initError);
              // Don't block the model change if reinitialization fails
            }
          }
        }
        
        // Update the current model state
        setCurrentModel(modelId);
        
        closeModelDialog();
      } catch (error) {
        console.error('Failed to update model:', error);
        setError(`Failed to update model: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    [settings, config, closeModelDialog],
  );

  return {
    isModelDialogOpen,
    openModelDialog,
    closeModelDialog,
    handleModelSelect,
    models,
    currentModel,
    error,
    setError,
  };
}
