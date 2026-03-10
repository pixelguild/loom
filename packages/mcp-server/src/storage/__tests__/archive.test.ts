import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { splitEntries, generateArchiveFilename, performMechanicalArchive } from '../archive.js';
import { ContextFile } from '../context-file.js';

describe('splitEntries', () => {
  it('splits content into individual entries', () => {
    const content = [
      '# Session Context',
      '',
      '### [ACTION] 2026-03-08 14:00:00',
      'First entry',
      '',
      '---',
      '',
      '### [DECISION] 2026-03-08 14:05:00',
      'Second entry',
      '',
      '---',
    ].join('\n');

    const entries = splitEntries(content);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toContain('First entry');
    expect(entries[1]).toContain('Second entry');
  });

  it('returns empty array for content with no entries', () => {
    expect(splitEntries('# Session Context\n\n')).toEqual([]);
  });

  it('handles entries with multi-line detail blocks', () => {
    const content = [
      '# Session Context',
      '',
      '### [DECISION] 2026-03-08 14:00:00',
      'Use PostgreSQL',
      '',
      'Chose Postgres over MySQL for JSON support.',
      '',
      '---',
      '',
      '### [ACTION] 2026-03-08 14:05:00',
      'Created migration',
      '',
      '---',
    ].join('\n');

    const entries = splitEntries(content);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toContain('Use PostgreSQL');
    expect(entries[0]).toContain('Chose Postgres over MySQL');
    expect(entries[1]).toContain('Created migration');
  });

  it('handles a single entry', () => {
    const content = [
      '# Session Context',
      '',
      '### [ACTION] 2026-03-08 14:00:00',
      'Only entry',
      '',
      '---',
    ].join('\n');

    const entries = splitEntries(content);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toContain('Only entry');
  });
});

describe('generateArchiveFilename', () => {
  it('generates YYYY-MM-DD-001.md for first archive of the day', () => {
    const filename = generateArchiveFilename([], '2026-03-08');
    expect(filename).toBe('2026-03-08-001.md');
  });

  it('increments sequence number for existing archives', () => {
    const existing = ['2026-03-08-001.md', '2026-03-08-002.md'];
    const filename = generateArchiveFilename(existing, '2026-03-08');
    expect(filename).toBe('2026-03-08-003.md');
  });

  it('handles archives from different dates', () => {
    const existing = ['2026-03-07-001.md'];
    const filename = generateArchiveFilename(existing, '2026-03-08');
    expect(filename).toBe('2026-03-08-001.md');
  });
});

describe('performArchive', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-test-'));
    const contextFile = new ContextFile(tmpDir);
    contextFile.initialize();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('moves older entries to archive file', () => {
    // Write 10 entries
    const contextFile = new ContextFile(tmpDir);
    for (let i = 1; i <= 10; i++) {
      contextFile.append({
        type: 'action',
        summary: `Entry ${i}`,
        timestamp: `2026-03-08 14:${String(i).padStart(2, '0')}:00`,
      });
    }

    const result = performMechanicalArchive(tmpDir);
    expect(result.archived).toBe(true);
    const today = new Date().toISOString().slice(0, 10);
    expect(result.archiveFile).toMatch(new RegExp(`${today}-\\d{3}\\.md`));

    // Verify archive file exists and has older entries
    const archivePath = path.join(tmpDir, 'docs', 'loom', 'archives', result.archiveFile!);
    expect(fs.existsSync(archivePath)).toBe(true);
    const archiveContent = fs.readFileSync(archivePath, 'utf-8');
    expect(archiveContent).toContain('Entry 1');

    // Verify context.md has active state header and recent entries
    const newContent = contextFile.read();
    expect(newContent).toContain('## Active State');
    expect(newContent).toContain('Entry 10');
  });

  it('keeps approximately 40% of entries in context.md', () => {
    const contextFile = new ContextFile(tmpDir);
    for (let i = 1; i <= 10; i++) {
      contextFile.append({
        type: 'action',
        summary: `Entry ${i}`,
        timestamp: `2026-03-08 14:${String(i).padStart(2, '0')}:00`,
      });
    }

    performMechanicalArchive(tmpDir);

    const newContent = contextFile.read();
    // Should have the last 4 entries (40% of 10)
    expect(newContent).toContain('Entry 7');
    expect(newContent).toContain('Entry 10');
    // Use word-boundary check: 'Entry 1\n' to avoid matching 'Entry 10'
    expect(newContent).not.toMatch(/Entry 1\n/);
    expect(newContent).not.toContain('Entry 2');
    expect(newContent).not.toContain('Entry 6');
  });

  it('returns not archived when fewer than 2 entries', () => {
    const contextFile = new ContextFile(tmpDir);
    contextFile.append({
      type: 'action',
      summary: 'Only entry',
      timestamp: '2026-03-08 14:00:00',
    });

    const result = performMechanicalArchive(tmpDir);
    expect(result.archived).toBe(false);
    expect(result.message).toContain('Not enough entries');
  });

  it('preserves entries with detail blocks during archive', () => {
    const contextFile = new ContextFile(tmpDir);
    for (let i = 1; i <= 5; i++) {
      contextFile.append({
        type: 'decision',
        summary: `Decision ${i}`,
        detail: `Detailed reasoning for decision ${i}.`,
        timestamp: `2026-03-08 14:${String(i).padStart(2, '0')}:00`,
      });
    }

    const result = performMechanicalArchive(tmpDir);
    expect(result.archived).toBe(true);

    // Archive should contain older entries with their details
    const archivePath = path.join(tmpDir, 'docs', 'loom', 'archives', result.archiveFile!);
    const archiveContent = fs.readFileSync(archivePath, 'utf-8');
    expect(archiveContent).toContain('Decision 1');
    expect(archiveContent).toContain('Detailed reasoning for decision 1');

    // Kept entries should also preserve details
    const newContent = contextFile.read();
    expect(newContent).toContain('Decision 5');
    expect(newContent).toContain('Detailed reasoning for decision 5');
  });
});
