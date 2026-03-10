import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleLogContext } from '../log-context.js';
import type { LoomContext } from '../../types.js';
import { testConfig } from '../../__tests__/helpers.js';

describe('handleLogContext', () => {
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

  it('appends a log entry and returns success with token count', async () => {
    const result = await handleLogContext(loomCtx, {
      type: 'action',
      summary: 'Created the user model',
    });
    expect(result.success).toBe(true);
    expect(result.tokenCount).toBeGreaterThan(0);

    const content = fs.readFileSync(
      path.join(tmpDir, 'docs', 'loom', 'context.md'),
      'utf-8'
    );
    expect(content).toContain('[ACTION]');
    expect(content).toContain('Created the user model');
  });

  it('includes detail when provided', async () => {
    const result = await handleLogContext(loomCtx, {
      type: 'decision',
      summary: 'Use Auth0',
      detail: 'Evaluated Auth0 vs Clerk. Auth0 has existing tenant.',
    });
    expect(result.success).toBe(true);

    const content = fs.readFileSync(
      path.join(tmpDir, 'docs', 'loom', 'context.md'),
      'utf-8'
    );
    expect(content).toContain('Evaluated Auth0 vs Clerk');
  });

  it('validates type field', async () => {
    await expect(
      handleLogContext(loomCtx, {
        type: 'invalid' as never,
        summary: 'test',
      })
    ).rejects.toThrow();
  });

  it('creates docs/loom on first call', async () => {
    await handleLogContext(loomCtx, {
      type: 'action',
      summary: 'First entry',
    });
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'loom', 'context.md'))).toBe(true);
  });
});
