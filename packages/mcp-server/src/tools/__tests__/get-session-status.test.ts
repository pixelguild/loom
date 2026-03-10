import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleGetSessionStatus } from '../get-session-status.js';
import { handleLogContext } from '../log-context.js';
import type { LoomContext } from '../../types.js';
import { testConfig } from '../../__tests__/helpers.js';

describe('handleGetSessionStatus', () => {
  let tmpDir: string;
  let loomCtx: LoomContext;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-test-'));
    loomCtx = {
      projectRoot: tmpDir,
      loomDir: path.join(tmpDir, 'docs', 'loom'),
      contextFilePath: path.join(tmpDir, 'docs', 'loom', 'context.md'),
      archivesDir: path.join(tmpDir, 'docs', 'loom', 'archives'),
      manifestsDir: path.join(tmpDir, 'docs', 'loom', 'manifests'),
      config: testConfig(),
    };
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns status for fresh project', async () => {
    const status = await handleGetSessionStatus(loomCtx);
    expect(status.tokenCount).toBeGreaterThan(0);
    expect(status.archiveCount).toBe(0);
    expect(status.lastEntryTimestamp).toBeNull();
    expect(status.warningThreshold).toBe(60000);
    expect(status.archiveThreshold).toBe(80000);
    expect(status.needsArchive).toBe(false);
  });

  it('reflects entries after logging', async () => {
    await handleLogContext(loomCtx, { type: 'action', summary: 'Test entry' });
    const status = await handleGetSessionStatus(loomCtx);
    expect(status.lastEntryTimestamp).not.toBeNull();
    expect(status.tokenCount).toBeGreaterThan(0);
  });

  it('counts archive files', async () => {
    fs.mkdirSync(path.join(tmpDir, 'docs', 'loom', 'archives'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'docs', 'loom', 'archives', '2026-03-08-001.md'),
      'archive'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'docs', 'loom', 'archives', '2026-03-08-002.md'),
      'archive'
    );
    const status = await handleGetSessionStatus(loomCtx);
    expect(status.archiveCount).toBe(2);
  });

  it('uses custom thresholds from config', async () => {
    loomCtx.config = testConfig({
      archive_thresholds: { warning: 100, archive: 200 },
    });
    await handleLogContext(loomCtx, { type: 'action', summary: 'Test entry' });
    const status = await handleGetSessionStatus(loomCtx);
    expect(status.warningThreshold).toBe(100);
    expect(status.archiveThreshold).toBe(200);
  });

  it('needsArchive reflects custom threshold', async () => {
    loomCtx.config = testConfig({
      archive_thresholds: { warning: 1, archive: 1 },
    });
    await handleLogContext(loomCtx, { type: 'action', summary: 'Test entry' });
    const status = await handleGetSessionStatus(loomCtx);
    expect(status.needsArchive).toBe(true);
  });
});
