const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';

export function formatCreated(msg: string): string {
  return `  ${green}+${reset} created ${msg}`;
}

export function formatSkipped(msg: string): string {
  return `  ${yellow}-${reset} skipped ${msg}`;
}

export function formatWarning(msg: string): string {
  return `  ${yellow}!${reset} warning ${msg}`;
}

export function formatError(msg: string): string {
  return `  ${red}x${reset} error ${msg}`;
}

export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}
