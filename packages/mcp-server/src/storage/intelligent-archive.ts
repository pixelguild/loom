import { execFileSync, execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { ContextFile } from './context-file.js';
import { generateArchiveFilename } from './archive.js';

const execFile = promisify(execFileCb);

export interface IntelligentArchiveResult {
  archived: boolean;
  archiveFile?: string;
  method: 'intelligent' | 'mechanical';
  warning?: string;
}

/**
 * Builds the prompt sent to the Claude subprocess for intelligent archiving.
 * Instructs Claude to produce exactly three sections with token budgets.
 */
export function buildArchivePrompt(contextContent: string, carryForward: string | null): string {
  const carryForwardSection = carryForward
    ? `<previous-archive-carry-forward>\n${carryForward}\n</previous-archive-carry-forward>`
    : 'No previous archives exist for this project.';

  return `You are an archiving assistant for a software development session log. Your job is to compress the session context into a structured archive that preserves all important information while reducing token count.

${carryForwardSection}

<current-context>
${contextContent}
</current-context>

Produce a markdown document with EXACTLY these three sections (use ## headings):

## Carry-Forward Summary
(~2000 tokens) Compress ALL project history — both the previous carry-forward (if any) and the current context — into a single unified summary. Include project purpose, architecture decisions, current state, and anything a future session needs to know. This section accumulates across archives.

## Session Narrative
(~2000 tokens) Tell the chronological story of THIS session only. Use cause-and-effect: what was attempted, what happened, what was learned. Include specific error messages, version numbers, and configuration details that would be needed to reproduce or continue the work.

## Reference
(~1000 tokens) Structured quick-reference with these sub-headings:
### Decisions Made
### Files Changed
### Issues Resolved
### Dead Ends
### Open Questions
### Current State

Output ONLY the markdown document. No preamble, no explanation.`;
}

/**
 * Reads the most recent archive and extracts the ## Carry-Forward Summary section.
 * Returns null if no archives exist or if the latest archive has no carry-forward section.
 */
export function getLatestCarryForward(contextFile: ContextFile): string | null {
  const archives = contextFile.listArchives();
  if (archives.length === 0) {
    return null;
  }

  // Archives are sorted alphabetically by listArchives(), so the last one is the latest
  const latestArchive = archives[archives.length - 1];
  const content = contextFile.readArchive(latestArchive);
  if (!content) {
    return null;
  }

  return extractCarryForwardSection(content);
}

/**
 * Extracts the ## Carry-Forward Summary section from archive content.
 * Returns everything between "## Carry-Forward Summary" and the next "## " heading (or end of file).
 */
function extractCarryForwardSection(content: string): string | null {
  const lines = content.split('\n');
  let startIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '## Carry-Forward Summary') {
      startIndex = i + 1;
      continue;
    }
    // If we've found the start and hit the next ## heading, stop
    if (startIndex >= 0 && /^## /.test(lines[i])) {
      const section = lines.slice(startIndex, i).join('\n').trim();
      return section || null;
    }
  }

  // If we found the heading but no subsequent ## heading, take everything to the end
  if (startIndex >= 0) {
    const section = lines.slice(startIndex).join('\n').trim();
    return section || null;
  }

  return null;
}

/**
 * Validates that the Claude subprocess output contains all three required sections.
 */
export function validateArchiveOutput(output: string): boolean {
  if (!output || output.trim().length === 0) {
    return false;
  }

  const requiredSections = [
    '## Carry-Forward Summary',
    '## Session Narrative',
    '## Reference',
  ];

  return requiredSections.every(section => output.includes(section));
}

/**
 * Checks whether the `claude` CLI is available on the system PATH.
 */
export function isClaudeAvailable(): boolean {
  try {
    execFileSync('which', ['claude'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Performs an intelligent archive by spawning a Claude CLI subprocess.
 *
 * Reads the current context, gets carry-forward from the latest archive,
 * builds a prompt, and asks Claude to produce a structured narrative archive.
 *
 * On success: writes the archive file and rewrites context.md with an Active State header.
 * On failure: returns a result with archived=false and a warning message.
 */
export async function performIntelligentArchive(
  projectRoot: string,
  contextFile: ContextFile
): Promise<IntelligentArchiveResult> {
  const content = contextFile.read();
  if (!content || content.trim().length === 0) {
    return {
      archived: false,
      method: 'intelligent',
      warning: 'No context content to archive',
    };
  }

  const carryForward = getLatestCarryForward(contextFile);
  const prompt = buildArchivePrompt(content, carryForward);

  let output: string;
  try {
    const { stdout } = await execFile('claude', ['-p', prompt, '--dangerously-skip-permissions'], {
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
      cwd: projectRoot,
    });
    output = stdout;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[loom] Intelligent archive failed: ${message}`);
    return {
      archived: false,
      method: 'intelligent',
      warning: `Claude subprocess failed: ${message}`,
    };
  }

  if (!validateArchiveOutput(output)) {
    console.error('[loom] Intelligent archive output failed validation');
    return {
      archived: false,
      method: 'intelligent',
      warning: 'Claude subprocess output did not contain all required sections',
    };
  }

  // Generate archive filename and write the archive
  const existingArchives = contextFile.listArchives();
  const today = new Date().toISOString().slice(0, 10);
  const archiveFilename = generateArchiveFilename(existingArchives, today);

  const archiveContent = [
    `# Archive: ${archiveFilename}`,
    `Archived: ${new Date().toISOString()}`,
    `Method: intelligent`,
    '',
    output.trim(),
    '',
  ].join('\n');

  contextFile.writeArchive(archiveFilename, archiveContent);

  // Rewrite context.md with Active State header
  const newContent = [
    '# Session Context',
    '',
    '## Active State',
    `Archived to: ${archiveFilename}`,
    `Method: intelligent`,
    '',
  ].join('\n');

  contextFile.write(newContent);

  return {
    archived: true,
    archiveFile: archiveFilename,
    method: 'intelligent',
  };
}
