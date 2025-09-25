import { CommandKind, SlashCommand } from './types.js';
import { execSync } from 'node:child_process';

interface Branch {
  id: string;
  name: string;
  isCurrent: boolean;
}

/** Get branches from current repo */
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

export const branchesCommand: SlashCommand = {
  name: 'branches',
  description: 'List and checkout branches in the current Git repository',
  kind: CommandKind.BUILT_IN,
  async action(_context, args) {
    const branches = getBranches();

    if (branches.length === 0) {
      return {
        type: 'message',
        messageType: 'info',
        content: 'No git branches found in this repository.',
      };
    }

    // Find current branch
    const currentBranch = branches.find((b) => b.isCurrent)?.name || '';

    // Return a dialog type so the CLI can render the BranchDialog
    return {
      type: 'dialog',
      dialog: 'branches',
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        isCurrent: b.isCurrent,
      })),
      currentBranch,
    };
  },
};
