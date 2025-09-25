// /**
//  * @license
//  * Copyright 2025 Google LLC
//  * SPDX-License-Identifier: Apache-2.0
//  */

// import React from 'react';
// import { Box } from 'ink';
// import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';

// interface GeminiMessageContentProps {
//   text: string;
//   isPending: boolean;
//   availableTerminalHeight?: number;
//   terminalWidth: number;
// }

// /*
//  * Gemini message content is a semi-hacked component. The intention is to represent a partial
//  * of GeminiMessage and is only used when a response gets too long. In that instance messages
//  * are split into multiple GeminiMessageContent's to enable the root <Static> component in
//  * App.tsx to be as performant as humanly possible.
//  */
// export const GeminiMessageContent: React.FC<GeminiMessageContentProps> = ({
//   text,
//   isPending,
//   availableTerminalHeight,
//   terminalWidth,
// }) => {
//   const originalPrefix = '✦ ';
//   const prefixWidth = originalPrefix.length;

//   return (
//     <Box flexDirection="column" paddingLeft={prefixWidth}>
//       <MarkdownDisplay
//         text={text}
//         isPending={isPending}
//         availableTerminalHeight={availableTerminalHeight}
//         terminalWidth={terminalWidth}
//       />
//     </Box>
//   );
// };

import React from 'react';
import { Box, Text } from 'ink';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';
import { Colors } from '../../colors.js';

interface GeminiMessageContentProps {
  text: string;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
}

/*
 * Gemini message content is a semi-hacked component. The intention is to represent a partial
 * of GeminiMessage and is only used when a response gets too long.
 */
export const GeminiMessageContent: React.FC<GeminiMessageContentProps> = ({
  text,
  isPending,
  availableTerminalHeight,
  terminalWidth,
}) => {
  const originalPrefix = '✦ ';
  const prefixWidth = originalPrefix.length;

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
      <Box flexDirection="column" paddingLeft={prefixWidth}>
        <MarkdownDisplay
          text={text}
          isPending={isPending}
          availableTerminalHeight={availableTerminalHeight}
          terminalWidth={innerWidth}
        />
      </Box>
    </Box>
  );
};
