import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ContextFile } from '../context-file.js';

describe('ContextFile', () => {
  let tmpDir: string;
  let contextFile: ContextFile;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-test-'));
    contextFile = new ContextFile(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('initialize', () => {
    it('creates docs/loom directory structure', () => {
      contextFile.initialize();
      expect(fs.existsSync(path.join(tmpDir, 'docs', 'loom'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'docs', 'loom', 'archives'))).toBe(true);
    });

    it('creates context.md with header', () => {
      contextFile.initialize();
      const content = fs.readFileSync(
        path.join(tmpDir, 'docs', 'loom', 'context.md'),
        'utf-8'
      );
      expect(content).toContain('# Session Context');
    });

    it('does not overwrite existing context.md', () => {
      contextFile.initialize();
      const ctxPath = path.join(tmpDir, 'docs', 'loom', 'context.md');
      fs.writeFileSync(ctxPath, '# Existing content');
      contextFile.initialize();
      expect(fs.readFileSync(ctxPath, 'utf-8')).toBe('# Existing content');
    });
  });

  describe('read', () => {
    it('returns empty string for missing context.md', () => {
      expect(contextFile.read()).toBe('');
    });

    it('returns file content after initialization', () => {
      contextFile.initialize();
      const content = contextFile.read();
      expect(content).toContain('# Session Context');
    });
  });

  describe('append', () => {
    it('appends formatted entry to context.md', () => {
      contextFile.initialize();
      contextFile.append({
        type: 'action',
        summary: 'Created user model',
        timestamp: '2026-03-08 14:00:00',
      });
      const content = contextFile.read();
      expect(content).toContain('### [ACTION] 2026-03-08 14:00:00');
      expect(content).toContain('Created user model');
    });

    it('includes detail when provided', () => {
      contextFile.initialize();
      contextFile.append({
        type: 'decision',
        summary: 'Use PostgreSQL',
        detail: 'Chose Postgres over MySQL for JSON support.',
        timestamp: '2026-03-08 14:05:00',
      });
      const content = contextFile.read();
      expect(content).toContain('### [DECISION] 2026-03-08 14:05:00');
      expect(content).toContain('Chose Postgres over MySQL');
    });

    it('appends separator between entries', () => {
      contextFile.initialize();
      contextFile.append({
        type: 'action',
        summary: 'First entry',
        timestamp: '2026-03-08 14:00:00',
      });
      contextFile.append({
        type: 'action',
        summary: 'Second entry',
        timestamp: '2026-03-08 14:01:00',
      });
      const content = contextFile.read();
      const separators = content.match(/^---$/gm);
      expect(separators).not.toBeNull();
      expect(separators!.length).toBeGreaterThanOrEqual(2);
    });

    it('creates docs/loom if it does not exist', () => {
      contextFile.append({
        type: 'action',
        summary: 'Auto-created',
        timestamp: '2026-03-08 14:00:00',
      });
      expect(fs.existsSync(path.join(tmpDir, 'docs', 'loom', 'context.md'))).toBe(true);
    });
  });

  describe('listArchives', () => {
    it('returns empty array when no archives exist', () => {
      contextFile.initialize();
      expect(contextFile.listArchives()).toEqual([]);
    });

    it('returns archive filenames sorted', () => {
      contextFile.initialize();
      const archivesDir = path.join(tmpDir, 'docs', 'loom', 'archives');
      fs.writeFileSync(path.join(archivesDir, '2026-03-08-002.md'), 'archive 2');
      fs.writeFileSync(path.join(archivesDir, '2026-03-08-001.md'), 'archive 1');
      const archives = contextFile.listArchives();
      expect(archives).toEqual(['2026-03-08-001.md', '2026-03-08-002.md']);
    });
  });

  describe('readArchive', () => {
    it('reads an archive file by filename', () => {
      contextFile.initialize();
      contextFile.writeArchive('2026-03-10-001.md', '# Archive content\nSome data');

      const content = contextFile.readArchive('2026-03-10-001.md');
      expect(content).toBe('# Archive content\nSome data');
    });

    it('returns null for non-existent archive', () => {
      contextFile.initialize();

      const content = contextFile.readArchive('does-not-exist.md');
      expect(content).toBeNull();
    });
  });

  describe('getLastEntryTimestamp', () => {
    it('returns null for empty context', () => {
      contextFile.initialize();
      expect(contextFile.getLastEntryTimestamp()).toBeNull();
    });

    it('returns timestamp of last entry', () => {
      contextFile.initialize();
      contextFile.append({
        type: 'action',
        summary: 'Something',
        timestamp: '2026-03-08 14:30:00',
      });
      expect(contextFile.getLastEntryTimestamp()).toBe('2026-03-08 14:30:00');
    });
  });
});
