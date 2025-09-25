import { useState, useCallback } from 'react';

export interface BranchInfo {
  id: string;
  name: string;
  isCurrent: boolean;
}

export function useBranchDialog() {
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [currentBranch, setCurrentBranch] = useState('');

  const openBranchDialog = useCallback(
    (data: { branches: BranchInfo[]; currentBranch: string }) => {
      setBranches(data.branches);
      setCurrentBranch(data.currentBranch);
      setIsBranchDialogOpen(true);
    },
    [],
  );

  const closeBranchDialog = useCallback(() => {
    setIsBranchDialogOpen(false);
  }, []);

  const handleBranchSelect = useCallback(
    (_branchName: string) => {
      // Perform checkout if needed (already handled in BranchDialog)
      closeBranchDialog();
    },
    [closeBranchDialog],
  );

  return {
    isBranchDialogOpen,
    openBranchDialog,
    closeBranchDialog,
    handleBranchSelect,
    branches,
    currentBranch,
  };
}
