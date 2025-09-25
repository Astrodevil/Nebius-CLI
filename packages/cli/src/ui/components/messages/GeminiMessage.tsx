// /**
//  * @license
//  * Copyright 2025 Google LLC
//  * SPDX-License-Identifier: Apache-2.0
//  */

// import React from 'react';
// import { Text, Box } from 'ink';
// import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';
// import { Colors } from '../../colors.js';

// interface GeminiMessageProps {
//   text: string;
//   isPending: boolean;
//   availableTerminalHeight?: number;
//   terminalWidth: number;
// }

// export const GeminiMessage: React.FC<GeminiMessageProps> = ({
//   text,
//   isPending,
//   availableTerminalHeight,
//   terminalWidth,
// }) => {
//   const prefix = '✦ ';
//   const prefixWidth = prefix.length;

//   return (
//     <Box flexDirection="row">
//       <Box width={prefixWidth}>
//         <Text color={Colors.AccentPurple}>{prefix}</Text>
//       </Box>
//       <Box flexGrow={1} flexDirection="column">
//         <MarkdownDisplay
//           text={text}
//           isPending={isPending}
//           availableTerminalHeight={availableTerminalHeight}
//           terminalWidth={terminalWidth}
//         />
//       </Box>
//     </Box>
//   );
// };

import React from 'react';
import { Text, Box } from 'ink';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';
import { Colors } from '../../colors.js';

interface GeminiMessageProps {
  text: string;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
}

export const GeminiMessage: React.FC<GeminiMessageProps> = ({
  text,
  isPending,
  availableTerminalHeight,
  terminalWidth,
}) => {
  const prefix = '✦ ';
  const prefixWidth = prefix.length;

  // ── Box logic from ToolGroupMessage ───────────────────────────────
  const hasPending = isPending;
  const borderColor = hasPending ? Colors.AccentYellow : Colors.LightBlue;
  const outerWidth = Math.max(1, terminalWidth);
  const innerWidth = Math.max(1, outerWidth);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      width={outerWidth}
      marginLeft={1}
      borderDimColor={hasPending}
      borderColor={borderColor}
      gap={1}
    >
      <Box flexDirection="row">
        <Box width={prefixWidth}>
          <Text color={Colors.AccentPurple}>{prefix}</Text>
        </Box>
        <Box flexGrow={1} flexDirection="column">
          <MarkdownDisplay
            text={text}
            isPending={isPending}
            availableTerminalHeight={availableTerminalHeight}
            terminalWidth={innerWidth}
          />
        </Box>
      </Box>
    </Box>
  );
};
