import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleGetContext } from '../get-context.js';
import { handleLogContext } from '../log-context.js';
import type { LoomContext } from '../../types.js';
import { testConfig } from '../../__tests__/helpers.js';

describe('handleGetContext', () => {
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

  it('returns empty content for fresh project', async () => {
    const result = await handleGetContext(loomCtx);
    expect(result.content).toContain('# Session Context');
    expect(result.archives).toEqual([]);
    expect(result.tokenCount).toBeGreaterThan(0);
  });

  it('returns existing content with entries', async () => {
    await handleLogContext(loomCtx, { type: 'action', summary: 'Did something' });
    const result = await handleGetContext(loomCtx);
    expect(result.content).toContain('Did something');
    expect(result.tokenCount).toBeGreaterThan(0);
  });

  it('lists archive files', async () => {
    fs.mkdirSync(path.join(tmpDir, 'docs', 'loom', 'archives'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'docs', 'loom', 'archives', '2026-03-08-001.md'), 'archive');
    const result = await handleGetContext(loomCtx);
    expect(result.archives).toEqual(['2026-03-08-001.md']);
  });
});
