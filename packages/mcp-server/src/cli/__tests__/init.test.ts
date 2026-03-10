import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loomInit } from '../init.js';

describe('loom init', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-init-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates docs/loom directory structure', () => {
    const result = loomInit(tmpDir);

    expect(fs.existsSync(path.join(tmpDir, 'docs', 'loom', 'archives'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'docs', 'loom', 'manifests'))).toBe(true);
    expect(result.dirsCreated).toBe(true);
  });

  it('skips directory creation if already exists', () => {
    fs.mkdirSync(path.join(tmpDir, 'docs', 'loom', 'archives'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs', 'loom', 'manifests'), { recursive: true });

    const result = loomInit(tmpDir);

    expect(result.dirsCreated).toBe(false);
  });

  it('creates CLAUDE.md with Loom block', () => {
    const result = loomInit(tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('## Loom');
    expect(content).toContain('loom_get_context');
    expect(result.claudeMdAction).toBe('created');
  });

  it('appends Loom block to existing CLAUDE.md', () => {
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Project\n\nSome instructions.\n');

    const result = loomInit(tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('# Project');
    expect(content).toContain('## Loom');
    expect(result.claudeMdAction).toBe('appended');
  });

  it('skips CLAUDE.md if Loom block already exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Project\n\n## Loom\n\nAlready here.\n');

    const result = loomInit(tmpDir);

    expect(result.claudeMdAction).toBe('skipped');
  });

  it('creates .claude/mcp.json with loom server config', () => {
    const result = loomInit(tmpDir);

    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude', 'mcp.json'), 'utf-8'));
    expect(config.mcpServers.loom).toBeDefined();
    expect(config.mcpServers.loom.env.LOOM_PROJECT_ROOT).toBe(tmpDir);
    expect(result.mcpJsonAction).toBe('created');
  });

  it('merges into existing .claude/mcp.json without overwriting other servers', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'mcp.json'),
      JSON.stringify({ mcpServers: { other: { command: 'other-server' } } }, null, 2)
    );

    const result = loomInit(tmpDir);

    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude', 'mcp.json'), 'utf-8'));
    expect(config.mcpServers.other).toBeDefined();
    expect(config.mcpServers.loom).toBeDefined();
    expect(result.mcpJsonAction).toBe('merged');
  });

  it('skips .claude/mcp.json if loom key already exists', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.claude', 'mcp.json'),
      JSON.stringify({ mcpServers: { loom: { command: 'node' } } }, null, 2)
    );

    const result = loomInit(tmpDir);

    expect(result.mcpJsonAction).toBe('skipped');
  });
});
