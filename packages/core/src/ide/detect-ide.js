/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export var DetectedIde;
(function (DetectedIde) {
  DetectedIde['VSCode'] = 'vscode';
})(DetectedIde || (DetectedIde = {}));
export function getIdeDisplayName(ide) {
  switch (ide) {
    case DetectedIde.VSCode:
      return 'VS Code';
    default: {
      // This ensures that if a new IDE is added to the enum, we get a compile-time error.
      const exhaustiveCheck = ide;
      return exhaustiveCheck;
    }
  }
}
export function detectIde() {
  if (process.env.TERM_PROGRAM === 'vscode') {
    return DetectedIde.VSCode;
  }
  return undefined;
}
//# sourceMappingURL=detect-ide.js.map
