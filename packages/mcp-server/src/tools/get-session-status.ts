import { ContextFile } from '../storage/context-file.js';
import { countTokens } from '../lib/tokens.js';
import type { LoomContext, SessionStatus } from '../types.js';

export async function handleGetSessionStatus(ctx: LoomContext): Promise<SessionStatus> {
  const { warning, archive } = ctx.config.archive_thresholds;
  const contextFile = new ContextFile(ctx.projectRoot);
  contextFile.initialize();

  const content = contextFile.read();
  const tokenCount = countTokens(content);
  const archives = contextFile.listArchives();
  const lastEntryTimestamp = contextFile.getLastEntryTimestamp();

  return {
    tokenCount,
    archiveCount: archives.length,
    lastEntryTimestamp,
    warningThreshold: warning,
    archiveThreshold: archive,
    needsArchive: tokenCount > archive,
  };
}
