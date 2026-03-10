import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { formatCreated, formatSkipped, formatWarning } from './output.js';

const LOOM_CLAUDE_BLOCK = `
## Loom

Loom is your persistent memory. The developer picks up where you left off using only what you log — if you don't log it, it's gone.

**Session start**: Call \`loom_get_context\` before any work. Read it fully.

**During work** — call \`loom_log_context\` after every:
- File created, modified, or deleted → type: \`action\`
- Decision made (approach, library, architecture) → type: \`decision\`
- Problem or error encountered → type: \`issue\`
- Dead end explored and abandoned → type: \`dead_end\`
- Open question to resolve later → type: \`question\`

**When stuck**: After two failed attempts, call \`loom_consult_peer\`. Describe the problem precisely. Use the response before trying again.

**Before implementing anything non-trivial**: Call \`loom_find_pattern\`. Check if this has been solved in another project first.

**Context health**: Call \`loom_get_session_status\` every 10 log entries. If above 60k tokens, call \`loom_archive_context\` before continuing.

**Session end**: When wrapping up, call \`loom_log_context\` with type \`session_end\` — what was completed, what remains, immediate next steps.
`;

export interface InitResult {
  dirsCreated: boolean;
  claudeMdAction: 'created' | 'appended' | 'skipped';
  mcpJsonAction: 'created' | 'merged' | 'skipped';
  claudeOnPath: boolean;
}

function resolveServerPath(): string {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'index.js');
}

function scaffoldDirs(projectRoot: string): boolean {
  const archivesDir = path.join(projectRoot, 'docs', 'loom', 'archives');
  const manifestsDir = path.join(projectRoot, 'docs', 'loom', 'manifests');

  if (fs.existsSync(archivesDir) && fs.existsSync(manifestsDir)) {
    return false;
  }

  fs.mkdirSync(archivesDir, { recursive: true });
  fs.mkdirSync(manifestsDir, { recursive: true });
  return true;
}

function injectClaudeMd(projectRoot: string): 'created' | 'appended' | 'skipped' {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');

  if (fs.existsSync(claudeMdPath)) {
    const content = fs.readFileSync(claudeMdPath, 'utf-8');
    if (content.includes('## Loom')) {
      return 'skipped';
    }
    fs.appendFileSync(claudeMdPath, '\n' + LOOM_CLAUDE_BLOCK);
    return 'appended';
  }

  fs.writeFileSync(claudeMdPath, LOOM_CLAUDE_BLOCK.trimStart());
  return 'created';
}

interface McpConfig {
  mcpServers: Record<string, unknown>;
}

function wireMcpJson(projectRoot: string): 'created' | 'merged' | 'skipped' {
  const mcpJsonPath = path.join(projectRoot, '.claude', 'mcp.json');
  const serverPath = resolveServerPath();

  const loomEntry = {
    command: 'node',
    args: [serverPath],
    env: { LOOM_PROJECT_ROOT: projectRoot },
  };

  if (fs.existsSync(mcpJsonPath)) {
    const raw = fs.readFileSync(mcpJsonPath, 'utf-8');
    const config = JSON.parse(raw) as McpConfig;

    if (config.mcpServers?.loom) {
      return 'skipped';
    }

    config.mcpServers = config.mcpServers ?? {};
    config.mcpServers.loom = loomEntry;
    fs.writeFileSync(mcpJsonPath, JSON.stringify(config, null, 2) + '\n');
    return 'merged';
  }

  fs.mkdirSync(path.join(projectRoot, '.claude'), { recursive: true });
  const config: McpConfig = { mcpServers: { loom: loomEntry } };
  fs.writeFileSync(mcpJsonPath, JSON.stringify(config, null, 2) + '\n');
  return 'created';
}

function checkClaudeOnPath(): boolean {
  try {
    execFileSync('which', ['claude'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function loomInit(projectRoot: string): InitResult {
  const dirsCreated = scaffoldDirs(projectRoot);
  const claudeMdAction = injectClaudeMd(projectRoot);
  const mcpJsonAction = wireMcpJson(projectRoot);
  const claudeOnPath = checkClaudeOnPath();

  return { dirsCreated, claudeMdAction, mcpJsonAction, claudeOnPath };
}

export function runInit(projectRoot: string): void {
  console.log('\nInitializing Loom...\n');

  const result = loomInit(projectRoot);

  if (result.dirsCreated) {
    console.log(formatCreated('docs/loom/ (archives/, manifests/)'));
  } else {
    console.log(formatSkipped('docs/loom/ already exists'));
  }

  switch (result.claudeMdAction) {
    case 'created':
      console.log(formatCreated('CLAUDE.md with Loom instructions'));
      break;
    case 'appended':
      console.log(formatCreated('Loom block appended to CLAUDE.md'));
      break;
    case 'skipped':
      console.log(formatSkipped('CLAUDE.md already has ## Loom section'));
      break;
  }

  switch (result.mcpJsonAction) {
    case 'created':
      console.log(formatCreated('.claude/mcp.json with Loom server'));
      break;
    case 'merged':
      console.log(formatCreated('Loom server added to .claude/mcp.json'));
      break;
    case 'skipped':
      console.log(formatSkipped('.claude/mcp.json already has loom entry'));
      break;
  }

  if (!result.claudeOnPath) {
    console.log(formatWarning('claude CLI not found on PATH — install Claude Code to use Loom'));
  }

  console.log('\nDone! Restart Claude Code to activate Loom in this project.\n');
}
