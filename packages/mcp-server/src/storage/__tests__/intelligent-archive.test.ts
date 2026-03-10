import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ContextFile } from '../context-file.js';
import {
  buildArchivePrompt,
  getLatestCarryForward,
  validateArchiveOutput,
  isClaudeAvailable,
} from '../intelligent-archive.js';

describe('buildArchivePrompt', () => {
  it('includes the context content in the prompt', () => {
    const prompt = buildArchivePrompt('Some context content', null);
    expect(prompt).toContain('Some context content');
  });

  it('includes carry-forward when provided', () => {
    const carryForward = '## Carry-Forward Summary\nPrevious project state...';
    const prompt = buildArchivePrompt('Current context', carryForward);
    expect(prompt).toContain('Previous project state...');
  });

  it('shows "No previous archives" when carry-forward is null', () => {
    const prompt = buildArchivePrompt('Current context', null);
    expect(prompt).toContain('No previous archives');
  });

  it('includes all three required section headers in instructions', () => {
    const prompt = buildArchivePrompt('Some context', null);
    expect(prompt).toContain('## Carry-Forward Summary');
    expect(prompt).toContain('## Session Narrative');
    expect(prompt).toContain('## Reference');
  });
});

describe('getLatestCarryForward', () => {
  let tmpDir: string;
  let contextFile: ContextFile;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-test-'));
    contextFile = new ContextFile(tmpDir);
    contextFile.initialize();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when no archives exist', () => {
    const result = getLatestCarryForward(contextFile);
    expect(result).toBeNull();
  });

  it('extracts carry-forward section from the latest archive', () => {
    const archiveContent = [
      '# Archive: 2026-03-10-001.md',
      '',
      '## Carry-Forward Summary',
      'The project uses TypeScript with strict mode.',
      'Database is PostgreSQL with Prisma ORM.',
      '',
      '## Session Narrative',
      'We set up the project structure...',
      '',
      '## Reference',
      '### Decisions Made',
      '- Use TypeScript',
    ].join('\n');

    contextFile.writeArchive('2026-03-10-001.md', archiveContent);

    const result = getLatestCarryForward(contextFile);
    expect(result).not.toBeNull();
    expect(result).toContain('The project uses TypeScript with strict mode.');
    expect(result).toContain('Database is PostgreSQL with Prisma ORM.');
  });

  it('picks the latest archive when multiple exist', () => {
    const olderArchive = [
      '# Archive',
      '',
      '## Carry-Forward Summary',
      'Old carry-forward content.',
      '',
      '## Session Narrative',
      'Old narrative.',
    ].join('\n');

    const newerArchive = [
      '# Archive',
      '',
      '## Carry-Forward Summary',
      'Newer carry-forward content.',
      '',
      '## Session Narrative',
      'Newer narrative.',
    ].join('\n');

    contextFile.writeArchive('2026-03-09-001.md', olderArchive);
    contextFile.writeArchive('2026-03-10-001.md', newerArchive);

    const result = getLatestCarryForward(contextFile);
    expect(result).not.toBeNull();
    expect(result).toContain('Newer carry-forward content.');
    expect(result).not.toContain('Old carry-forward content.');
  });

  it('returns null when archive has no carry-forward section', () => {
    const archiveContent = [
      '# Archive: 2026-03-10-001.md',
      '',
      '### [ACTION] 2026-03-10 14:00:00',
      'Some old entry',
      '',
      '---',
    ].join('\n');

    contextFile.writeArchive('2026-03-10-001.md', archiveContent);

    const result = getLatestCarryForward(contextFile);
    expect(result).toBeNull();
  });
});

describe('validateArchiveOutput', () => {
  const validOutput = [
    '## Carry-Forward Summary',
    'Project history compressed here.',
    '',
    '## Session Narrative',
    'Chronological story of what happened.',
    '',
    '## Reference',
    '### Decisions Made',
    '- Decision 1',
  ].join('\n');

  it('returns true for valid output with all required sections', () => {
    expect(validateArchiveOutput(validOutput)).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(validateArchiveOutput('')).toBe(false);
  });

  it('returns false when Carry-Forward Summary is missing', () => {
    const output = [
      '## Session Narrative',
      'Some narrative.',
      '',
      '## Reference',
      'Some reference.',
    ].join('\n');
    expect(validateArchiveOutput(output)).toBe(false);
  });

  it('returns false when Session Narrative is missing', () => {
    const output = [
      '## Carry-Forward Summary',
      'Some summary.',
      '',
      '## Reference',
      'Some reference.',
    ].join('\n');
    expect(validateArchiveOutput(output)).toBe(false);
  });

  it('returns false when Reference is missing', () => {
    const output = [
      '## Carry-Forward Summary',
      'Some summary.',
      '',
      '## Session Narrative',
      'Some narrative.',
    ].join('\n');
    expect(validateArchiveOutput(output)).toBe(false);
  });
});

describe('isClaudeAvailable', () => {
  it('returns a boolean', () => {
    const result = isClaudeAvailable();
    expect(typeof result).toBe('boolean');
  });
});
