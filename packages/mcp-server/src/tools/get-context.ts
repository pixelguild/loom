import { ContextFile } from '../storage/context-file.js';
import { countTokens } from '../lib/tokens.js';
import type { LoomContext } from '../types.js';

interface GetContextResult {
  content: string;
  archives: string[];
  tokenCount: number;
}

export async function handleGetContext(ctx: LoomContext): Promise<GetContextResult> {
  const contextFile = new ContextFile(ctx.projectRoot);
  contextFile.initialize();

  const content = contextFile.read();
  const archives = contextFile.listArchives();
  const tokenCount = countTokens(content);

  return { content, archives, tokenCount };
}
