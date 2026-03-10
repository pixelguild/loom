import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { ContextFile } from '../storage/context-file.js';
import { countTokens } from '../lib/tokens.js';
import { ConfigLoader } from '../config/config-loader.js';
import { LoomDatabase } from '../storage/database.js';

export interface StatusResult {
  initialized: boolean;
  tokenCount: number;
  archiveCount: number;
  lastEntryTimestamp: string | null;
  warningThreshold: number;
  archiveThreshold: number;
  needsArchive: boolean;
  registeredInDb: boolean;
}

export function getStatus(projectRoot: string): StatusResult {
  const loomDir = path.join(projectRoot, 'docs', 'loom');

  if (!fs.existsSync(loomDir) || !fs.statSync(loomDir).isDirectory()) {
    return {
      initialized: false,
      tokenCount: 0,
      archiveCount: 0,
      lastEntryTimestamp: null,
      warningThreshold: 0,
      archiveThreshold: 0,
      needsArchive: false,
      registeredInDb: false,
    };
  }

  const configLoader = new ConfigLoader(projectRoot);
  const config = configLoader.load();
  const { warning, archive } = config.archive_thresholds;

  const contextFile = new ContextFile(projectRoot);
  const content = contextFile.read();
  const tokenCount = countTokens(content);
  const archives = contextFile.listArchives();
  const lastEntryTimestamp = contextFile.getLastEntryTimestamp();

  let registeredInDb = false;
  try {
    const dbPath = path.join(os.homedir(), '.loom', 'loom.db');
    if (fs.existsSync(dbPath)) {
      const db = new LoomDatabase(dbPath);
      const projects = db.listProjects();
      registeredInDb = projects.some(p => p.path === projectRoot);
      db.close();
    }
  } catch {
    // DB check is best-effort
  }

  return {
    initialized: true,
    tokenCount,
    archiveCount: archives.length,
    lastEntryTimestamp,
    warningThreshold: warning,
    archiveThreshold: archive,
    needsArchive: tokenCount > archive,
    registeredInDb,
  };
}

export function runStatus(projectRoot: string): void {
  const result = getStatus(projectRoot);

  if (!result.initialized) {
    console.log('\nLoom is not initialized in this project.');
    console.log('Run `loom init` to get started.\n');
    return;
  }

  console.log('\nLoom Status\n');
  console.log(`  Tokens:     ${result.tokenCount.toLocaleString()} / ${result.archiveThreshold.toLocaleString()}`);
  console.log(`  Archives:   ${result.archiveCount}`);
  console.log(`  Last entry: ${result.lastEntryTimestamp ?? 'none'}`);
  console.log(`  Archive:    ${result.needsArchive ? '\x1b[33mneeded\x1b[0m' : '\x1b[32mok\x1b[0m'}`);
  console.log(`  Global DB:  ${result.registeredInDb ? 'registered' : 'not registered'}`);
  console.log('');
}
