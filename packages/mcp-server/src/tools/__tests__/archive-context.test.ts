import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleArchiveContext } from '../archive-context.js';
import { handleLogContext } from '../log-context.js';
import type { LoomContext } from '../../types.js';
import { testConfig } from '../../__tests__/helpers.js';

function makeContext(projectRoot: string): LoomContext {
  return {
    projectRoot,
    loomDir: path.join(projectRoot, 'docs', 'loom'),
    contextFilePath: path.join(projectRoot, 'docs', 'loom', 'context.md'),
    archivesDir: path.join(projectRoot, 'docs', 'loom', 'archives'),
    manifestsDir: path.join(projectRoot, 'docs', 'loom', 'manifests'),
    config: testConfig({
      archive_thresholds: { warning: 100, archive: 200 },
    }),
  };
}

describe('handleArchiveContext', () => {
  let tmpDir: string;
  let loomCtx: LoomContext;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-test-'));
    loomCtx = makeContext(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns method field in result when archiving', async () => {
    for (let i = 0; i < 10; i++) {
      await handleLogContext(loomCtx, {
        type: 'action',
        summary: `Entry ${i}: performing an important action that generates content`,
      });
    }

    const result = await handleArchiveContext(loomCtx, { force: true });

    expect(result.archived).toBe(true);
    expect(result.method).toBeDefined();
    expect(['intelligent', 'mechanical']).toContain(result.method);
  });

  it('does not archive when below threshold without force', async () => {
    // Use high thresholds so a single entry stays well below
    loomCtx.config = testConfig({
      archive_thresholds: { warning: 500_000, archive: 999_999 },
    });

    await handleLogContext(loomCtx, {
      type: 'action',
      summary: 'Small entry',
    });

    const result = await handleArchiveContext(loomCtx, {});

    expect(result.archived).toBe(false);
    expect(result.message).toBeDefined();
    expect(result.message).toContain('tokens');
  });

  it('archives when forced even below threshold', async () => {
    for (let i = 0; i < 5; i++) {
      await handleLogContext(loomCtx, {
        type: 'action',
        summary: `Entry ${i}: some context worth archiving`,
      });
    }

    const result = await handleArchiveContext(loomCtx, { force: true });

    expect(result.archived).toBe(true);
    expect(result.archiveFile).toBeDefined();
    expect(result.previousTokenCount).toBeGreaterThan(0);
    expect(result.newTokenCount).toBeGreaterThan(0);
  });

  it('auto-archives when above custom threshold', async () => {
    // Use an extremely low threshold so any content exceeds it
    loomCtx.config = testConfig({
      archive_thresholds: { warning: 1, archive: 1 },
    });

    for (let i = 0; i < 3; i++) {
      await handleLogContext(loomCtx, {
        type: 'action',
        summary: `Entry ${i}: generating enough tokens to exceed the low threshold`,
      });
    }

    const result = await handleArchiveContext(loomCtx, {});
    expect(result.archived).toBe(true);
  });

  it('threshold message reflects config value', async () => {
    loomCtx.config = testConfig({
      archive_thresholds: { warning: 500_000, archive: 999_999 },
    });

    await handleLogContext(loomCtx, {
      type: 'action',
      summary: 'Small entry',
    });

    const result = await handleArchiveContext(loomCtx, {});
    expect(result.archived).toBe(false);
    expect(result.message).toContain('999999');
  });
});
