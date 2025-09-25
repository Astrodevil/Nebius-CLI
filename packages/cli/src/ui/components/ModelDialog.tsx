/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

// Model saving is now handled by the useModelDialog hook

interface Model {
  id: string;
  name: string;
  description?: string;
  isCurrent: boolean;
}

interface ModelDialogProps {
  onSelect: (modelId: string) => void;
  onCancel: () => void;
  models: Model[];
  currentModel: string;
}

export function ModelDialog({
  onSelect,
  onCancel,
  models,
  currentModel,
}: ModelDialogProps) {
  const visibleCount = 5;

  // Helpers
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));
  const maxOffset = Math.max(0, models.length - visibleCount);

  // Initial selection based on currentModel when available
  const initialIndex = useMemo(() => {
    const idx = models.findIndex((m) => m.id === currentModel);
    return idx >= 0 ? idx : 0;
  }, [models, currentModel]);

  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex);
  const [scrollOffset, setScrollOffset] = useState<number>(
    clamp(initialIndex - Math.floor(visibleCount / 2), 0, maxOffset),
  );

  // Keep selected item within the visible window as user navigates
  useInput((input, key) => {
    if (key.return) {
      const modelId = models[selectedIndex].id;
      onSelect(modelId);
    }
    if (key.escape || (key.ctrl && input === 'c')) onCancel();

    if (key.upArrow) {
      const next = Math.max(0, selectedIndex - 1);
      if (next !== selectedIndex) {
        setSelectedIndex(next);
        setScrollOffset((prev) => {
          if (next < prev) return next;
          return prev;
        });
      }
    } else if (key.downArrow) {
      const next = Math.min(models.length - 1, selectedIndex + 1);
      if (next !== selectedIndex) {
        setSelectedIndex(next);
        setScrollOffset((prev) => {
          if (next >= prev + visibleCount) {
            return clamp(
              next - visibleCount + 1,
              0,
              Math.max(0, models.length - visibleCount),
            );
          }
          return prev;
        });
      }
    }
  });

  // Sync selection and scroll if models/currentModel change significantly
  useEffect(() => {
    const idx = initialIndex;
    setSelectedIndex(idx);
    setScrollOffset((prev) =>
      clamp(
        idx < prev
          ? idx
          : idx >= prev + visibleCount
            ? idx - visibleCount + 1
            : prev,
        0,
        Math.max(0, models.length - visibleCount),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex, models.length]);

  const visibleModels = models.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Select Model
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          ↑/↓ to navigate • Enter to select • Esc to cancel
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        padding={1}
      >
        {visibleModels.map((model, i) => {
          const isSelected = i + scrollOffset === selectedIndex;
          return (
            <Box
              key={model.id}
              flexDirection="column"
              marginBottom={i === visibleModels.length - 1 ? 0 : 1}
            >
              <Text
                color={isSelected ? 'white' : undefined}
                backgroundColor={isSelected ? 'blue' : undefined}
              >
                {isSelected ? '> ' : '  '}
                {model.name} {model.isCurrent ? '(current)' : ''}
              </Text>
              {isSelected && model.description && (
                <Box marginLeft={4}>
                  <Text color="gray">{model.description}</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {models.length > visibleCount && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Showing {scrollOffset + 1}-
            {Math.min(scrollOffset + visibleCount, models.length)} of{' '}
            {models.length}
          </Text>
        </Box>
      )}
    </Box>
  );
}
