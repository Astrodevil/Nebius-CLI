/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { execSync } from 'node:child_process';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Branch {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface BranchDialogProps {
  onSelect: (branch: string) => void;
  onCancel: () => void;
  branches: Branch[];
  currentBranch: string;
}

/** Read branches from current git repo */
function getBranches(): Branch[] {
  let output: string;
  try {
    output = execSync('git branch --list', { encoding: 'utf-8' });
  } catch {
    return [];
  }

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const isCurrent = line.startsWith('*');
      const name = line.replace(/^\*?\s*/, '');
      return { id: name, name, isCurrent };
    });
}

export function BranchDialog({ onSelect, onCancel }: BranchDialogProps) {
  const visibleCount = 5;

  const branches = useMemo(() => getBranches(), []);
  const currentIndex = branches.findIndex((b) => b.isCurrent);

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));
  const maxOffset = Math.max(0, branches.length - visibleCount);

  const [selectedIndex, setSelectedIndex] = useState(
    currentIndex >= 0 ? currentIndex : 0,
  );
  const [scrollOffset, setScrollOffset] = useState(
    clamp(
      (currentIndex >= 0 ? currentIndex : 0) - Math.floor(visibleCount / 2),
      0,
      maxOffset,
    ),
  );

  const [message, setMessage] = useState<string | null>(null); // new state for confirmation/error

  useInput((input, key) => {
    if (key.return) {
      const branchName = branches[selectedIndex].name;
      try {
        execSync(`git checkout ${branchName}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'], // capture stdout/stderr
        });
        setMessage(`✅ Switched to branch "${branchName}"`);
        sleep(3000);
        onSelect(branchName);
      } catch (err: unknown) {
        const errorMsg = (err as { stderr?: { toString(): string }; message?: string })?.stderr?.toString() || (err as Error)?.message || 'Unknown error';
        setMessage(`❌ Failed to checkout "${branchName}": ${errorMsg}`);
        // optionally keep the user in the dialog to retry
      }
    }

    if (key.escape || (key.ctrl && input === 'c')) {
      setMessage(`⚠️ Branch selection cancelled`);
      onCancel();
    }

    if (key.upArrow) {
      const next = Math.max(0, selectedIndex - 1);
      if (next !== selectedIndex) {
        setSelectedIndex(next);
        setScrollOffset((prev) => (next < prev ? next : prev));
      }
    } else if (key.downArrow) {
      const next = Math.min(branches.length - 1, selectedIndex + 1);
      if (next !== selectedIndex) {
        setSelectedIndex(next);
        setScrollOffset((prev) => {
          if (next >= prev + visibleCount) {
            return clamp(
              next - visibleCount + 1,
              0,
              Math.max(0, branches.length - visibleCount),
            );
          }
          return prev;
        });
      }
    }
  });

  const visibleBranches = branches.slice(
    scrollOffset,
    scrollOffset + visibleCount,
  );

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Select Git Branch
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          ↑/↓ to navigate • Enter to checkout • Esc to cancel
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        padding={1}
      >
        {visibleBranches.map((branch, i) => {
          const isSelected = i + scrollOffset === selectedIndex;
          return (
            <Box
              key={branch.id}
              flexDirection="column"
              marginBottom={i === visibleBranches.length - 1 ? 0 : 1}
            >
              <Text
                color={isSelected ? 'white' : undefined}
                backgroundColor={isSelected ? 'blue' : undefined}
              >
                {isSelected ? '> ' : '  '} {branch.name}{' '}
                {branch.isCurrent ? '(current)' : ''}
              </Text>
            </Box>
          );
        })}
      </Box>

      {branches.length > visibleCount && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Showing {scrollOffset + 1}-
            {Math.min(scrollOffset + visibleCount, branches.length)} of{' '}
            {branches.length}
          </Text>
        </Box>
      )}

      {message && (
        <Box marginTop={1}>
          <Text
            color={
              message.startsWith('✅')
                ? 'green'
                : message.startsWith('⚠️')
                  ? 'yellow'
                  : 'red'
            }
          >
            {message}
          </Text>
        </Box>
      )}
    </Box>
  );
}
