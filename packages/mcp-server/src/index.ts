import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'node:path';
import os from 'node:os';
import { createServer } from './server.js';
import { LoomDatabase } from './storage/database.js';
import { ConfigLoader } from './config/config-loader.js';
import type { LoomContext } from './types.js';

async function main(): Promise<void> {
  const projectRoot = process.env['LOOM_PROJECT_ROOT'] || process.cwd();
  const resolvedRoot = path.resolve(projectRoot);
  const dbPath = path.join(os.homedir(), '.loom', 'loom.db');

  const database = new LoomDatabase(dbPath);
  const configLoader = new ConfigLoader(resolvedRoot);
  const config = configLoader.load();

  const loomCtx: LoomContext = {
    projectRoot: resolvedRoot,
    loomDir: path.join(resolvedRoot, 'docs', 'loom'),
    contextFilePath: path.join(resolvedRoot, 'docs', 'loom', 'context.md'),
    archivesDir: path.join(resolvedRoot, 'docs', 'loom', 'archives'),
    manifestsDir: path.join(resolvedRoot, 'docs', 'loom', 'manifests'),
    database,
    config,
  };

  const server = createServer(loomCtx);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Loom MCP server running on stdio');
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
