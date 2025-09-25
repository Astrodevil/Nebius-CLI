/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export declare enum DetectedIde {
  VSCode = 'vscode',
}
export declare function getIdeDisplayName(ide: DetectedIde): string;
export declare function detectIde(): DetectedIde | undefined;
