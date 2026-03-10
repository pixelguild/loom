import { LoomDatabase } from '../storage/database.js';
import type { LoomContext, PatternRecord } from '../types.js';

interface FindPatternInput {
  query: string;
  tags?: string[];
  project?: string;
  limit?: number;
}

interface FindPatternResult {
  patterns: PatternRecord[];
  total: number;
}

export async function handleFindPattern(
  ctx: LoomContext,
  input: FindPatternInput
): Promise<FindPatternResult> {
  const db = ctx.database as LoomDatabase;

  const patterns = db.findPatterns(input.query, {
    tags: input.tags,
    project: input.project,
    limit: input.limit,
  });

  return {
    patterns,
    total: patterns.length,
  };
}
