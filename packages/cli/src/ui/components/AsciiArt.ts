import figlet from 'figlet';
import gradient from 'gradient-string';
// Embed the 'ANSI Shadow' figlet font to preserve the original ASCII art.
// Using importable font avoids fs access when running the bundled CLI.
import AnsiShadow from 'figlet/importable-fonts/ANSI Shadow.js';
figlet.parseFont('ANSI Shadow', AnsiShadow as unknown as string);

// Generate short banner text
const shortFiglet = figlet.textSync('NEBIUS CLI', {
  font: 'ANSI Shadow',
  horizontalLayout: 'default',
  verticalLayout: 'default',
});

// Generate long banner text
const longFiglet = figlet.textSync('NEBIUS CLI', {
  font: 'ANSI Shadow',
  horizontalLayout: 'default',
  verticalLayout: 'default',
});

// Apply gradient: Navy → Neon → Navy
const style = gradient([
  { color: '#0C2C3A', pos: 0 },
  { color: '#D6F542', pos: 0.5 },
  { color: '#0C2C3A', pos: 1 },
]);

export const shortAsciiLogo = style.multiline(shortFiglet);
export const longAsciiLogo = style.multiline(longFiglet);
