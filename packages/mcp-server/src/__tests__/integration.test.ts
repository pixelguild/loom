import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleLogContext } from '../tools/log-context.js';
import { handleGetContext } from '../tools/get-context.js';
import { handleGetSessionStatus } from '../tools/get-session-status.js';
import { handleArchiveContext } from '../tools/archive-context.js';
import type { LoomContext } from '../types.js';
import { testConfig } from './helpers.js';

describe('Loom integration: log → status → archive → pickup', () => {
  let tmpDir: string;
  let loomCtx: LoomContext;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-integration-'));
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

  it('full session lifecycle', async () => {
    // 1. Session start — get context for fresh project
    const initial = await handleGetContext(loomCtx);
    expect(initial.content).toContain('# Session Context');
    expect(initial.archives).toEqual([]);

    // 2. Log several entries
    for (let i = 1; i <= 15; i++) {
      await handleLogContext(loomCtx, {
        type: i % 3 === 0 ? 'decision' : 'action',
        summary: `Work item ${i}: ${i % 3 === 0 ? 'decided on approach' : 'implemented feature'}`,
        detail: i % 5 === 0 ? `Detailed explanation for item ${i}` : undefined,
      });
    }

    // 3. Check status
    const status = await handleGetSessionStatus(loomCtx);
    expect(status.tokenCount).toBeGreaterThan(0);
    expect(status.archiveCount).toBe(0);
    expect(status.lastEntryTimestamp).not.toBeNull();

    // 4. Force archive
    const archiveResult = await handleArchiveContext(loomCtx, { force: true });
    expect(archiveResult.archived).toBe(true);
    expect(archiveResult.archiveFile).toBeDefined();
    expect(archiveResult.newTokenCount).toBeLessThan(archiveResult.previousTokenCount!);

    // 5. Verify archive file exists
    const archivePath = path.join(
      tmpDir, 'docs', 'loom', 'archives', archiveResult.archiveFile!
    );
    expect(fs.existsSync(archivePath)).toBe(true);

    // 6. Session pickup — simulate new session
    const pickup = await handleGetContext(loomCtx);
    expect(pickup.content).toContain('## Active State');
    expect(pickup.archives).toContain(archiveResult.archiveFile);
    expect(pickup.tokenCount).toBeLessThan(status.tokenCount);

    // 7. Status after archive
    const postArchiveStatus = await handleGetSessionStatus(loomCtx);
    expect(postArchiveStatus.archiveCount).toBe(1);
    expect(postArchiveStatus.tokenCount).toBeLessThan(status.tokenCount);

    // 8. Can continue logging after archive
    await handleLogContext(loomCtx, {
      type: 'action',
      summary: 'Continued work after archive',
    });
    const finalContent = await handleGetContext(loomCtx);
    expect(finalContent.content).toContain('Continued work after archive');
  });
});
