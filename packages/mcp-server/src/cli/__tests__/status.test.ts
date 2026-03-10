import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getStatus } from '../status.js';

describe('loom status', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-status-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns not initialized when docs/loom does not exist', () => {
    const result = getStatus(tmpDir);

    expect(result.initialized).toBe(false);
  });

  it('returns zero state when initialized but empty', () => {
    const loomDir = path.join(tmpDir, 'docs', 'loom', 'archives');
    fs.mkdirSync(loomDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'docs', 'loom', 'context.md'), '# Session Context\n\n');

    const result = getStatus(tmpDir);

    expect(result.initialized).toBe(true);
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(result.archiveCount).toBe(0);
    expect(result.lastEntryTimestamp).toBeNull();
    expect(result.needsArchive).toBe(false);
  });

  it('returns correct archive count', () => {
    const archivesDir = path.join(tmpDir, 'docs', 'loom', 'archives');
    fs.mkdirSync(archivesDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'docs', 'loom', 'context.md'), '# Session Context\n\n');
    fs.writeFileSync(path.join(archivesDir, '2026-03-01-abc.md'), 'archive 1');
    fs.writeFileSync(path.join(archivesDir, '2026-03-02-def.md'), 'archive 2');

    const result = getStatus(tmpDir);

    expect(result.archiveCount).toBe(2);
  });

  it('extracts last entry timestamp', () => {
    const loomDir = path.join(tmpDir, 'docs', 'loom', 'archives');
    fs.mkdirSync(loomDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'docs', 'loom', 'context.md'),
      '# Session Context\n\n### [ACTION] 2026-03-10 04:15:12\nDid something\n\n---\n'
    );

    const result = getStatus(tmpDir);

    expect(result.lastEntryTimestamp).toBe('2026-03-10 04:15:12');
  });
});
