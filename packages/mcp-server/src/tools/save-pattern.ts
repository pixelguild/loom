import path from 'node:path';
import { LoomDatabase } from '../storage/database.js';
import type { LoomContext } from '../types.js';

interface SavePatternInput {
  name: string;
  content: string;
  tags?: string[];
}

interface SavePatternResult {
  id: string;
  name: string;
  tags: string[];
  source_project: string;
}

export async function handleSavePattern(
  ctx: LoomContext,
  input: SavePatternInput
): Promise<SavePatternResult> {
  const db = ctx.database as LoomDatabase;
  const projectName = path.basename(ctx.projectRoot);

  db.upsertProject(ctx.projectRoot, projectName);

  const pattern = db.savePattern({
    name: input.name,
    content: input.content,
    tags: input.tags ?? [],
    sourceProject: ctx.projectRoot,
  });

  return {
    id: pattern.id,
    name: pattern.name,
    tags: pattern.tags,
    source_project: pattern.source_project ?? ctx.projectRoot,
  };
}
