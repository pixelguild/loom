import path from 'node:path';
import { ContextFile } from '../storage/context-file.js';
import { countTokens } from '../lib/tokens.js';
import type { LoomContext, LogEntryType } from '../types.js';

const VALID_TYPES: Set<string> = new Set([
  'decision', 'action', 'issue', 'question', 'dead_end', 'session_end',
]);

interface LogContextInput {
  type: string;
  summary: string;
  detail?: string;
}

interface LogContextResult {
  success: boolean;
  tokenCount: number;
}

export async function handleLogContext(
  ctx: LoomContext,
  input: LogContextInput
): Promise<LogContextResult> {
  if (!VALID_TYPES.has(input.type)) {
    throw new Error(
      `Invalid log entry type: ${input.type}. Must be one of: ${[...VALID_TYPES].join(', ')}`
    );
  }

  const contextFile = new ContextFile(ctx.projectRoot);
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  contextFile.append({
    type: input.type as LogEntryType,
    summary: input.summary,
    detail: input.detail,
    timestamp,
  });

  if (ctx.database) {
    const { LoomDatabase } = await import('../storage/database.js');
    if (ctx.database instanceof LoomDatabase) {
      ctx.database.upsertProject(ctx.projectRoot, path.basename(ctx.projectRoot));
    }
  }

  const content = contextFile.read();
  const tokenCount = countTokens(content);

  return { success: true, tokenCount };
}
