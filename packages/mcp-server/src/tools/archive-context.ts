import { ContextFile } from '../storage/context-file.js';
import { performMechanicalArchive } from '../storage/archive.js';
import { isClaudeAvailable, performIntelligentArchive } from '../storage/intelligent-archive.js';
import { countTokens } from '../lib/tokens.js';
import type { LoomContext, ArchiveResult } from '../types.js';

interface ArchiveContextInput {
  force?: boolean;
}

export async function handleArchiveContext(
  ctx: LoomContext,
  input: ArchiveContextInput
): Promise<ArchiveResult> {
  const archiveThreshold = ctx.config.archive_thresholds.archive;
  const contextFile = new ContextFile(ctx.projectRoot);
  contextFile.initialize();

  const content = contextFile.read();
  const previousTokenCount = countTokens(content);

  if (!input.force && previousTokenCount <= archiveThreshold) {
    return {
      archived: false,
      message: `Context is ${previousTokenCount} tokens (threshold: ${archiveThreshold}). Use force: true to archive anyway.`,
    };
  }

  // Try intelligent archiving if Claude CLI is available
  if (isClaudeAvailable()) {
    const intelligentResult = await performIntelligentArchive(ctx.projectRoot, contextFile);

    if (intelligentResult.archived) {
      const newContent = contextFile.read();
      const newTokenCount = countTokens(newContent);

      return {
        archived: true,
        archiveFile: intelligentResult.archiveFile,
        previousTokenCount,
        newTokenCount,
        method: 'intelligent',
      };
    }

    // Intelligent archive failed — fall through to mechanical with the warning
    console.error(`[loom] Falling back to mechanical archive: ${intelligentResult.warning}`);
    return fallbackToMechanical(ctx.projectRoot, contextFile, previousTokenCount, intelligentResult.warning);
  }

  // Claude CLI not available — use mechanical archiving directly
  const claudeWarning = 'Claude CLI not found on PATH. Using mechanical archiving. Install Claude Code for intelligent archives.';
  console.error(`[loom] ${claudeWarning}`);
  return fallbackToMechanical(ctx.projectRoot, contextFile, previousTokenCount, claudeWarning);
}

function fallbackToMechanical(
  projectRoot: string,
  contextFile: ContextFile,
  previousTokenCount: number,
  warning?: string
): ArchiveResult {
  const result = performMechanicalArchive(projectRoot);

  if (!result.archived) {
    return {
      ...result,
      method: 'mechanical',
      warning,
    };
  }

  const newContent = contextFile.read();
  const newTokenCount = countTokens(newContent);

  return {
    archived: true,
    archiveFile: result.archiveFile,
    previousTokenCount,
    newTokenCount,
    method: 'mechanical',
    warning,
  };
}
