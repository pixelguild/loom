import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleCreateManifest } from '../create-manifest.js';
import type { LoomContext } from '../../types.js';
import { testConfig } from '../../__tests__/helpers.js';

describe('handleCreateManifest', () => {
  let tmpDir: string;
  let loomCtx: LoomContext;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-test-'));
    loomCtx = {
      projectRoot: '/Users/tyler/Sites/myapp',
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

  it('creates a manifest file', async () => {
    const result = await handleCreateManifest(loomCtx, {
      name: 'Auth Setup',
      content: '## Ordered Tasks\n1. [ ] Set up Auth0',
    });

    expect(result.slug).toBe('auth-setup');
    expect(result.name).toBe('Auth Setup');
    expect(result.path).toBe('docs/loom/manifests/auth-setup.md');
    expect(result.launch_command).toContain('auth-setup.md');
    expect(result.launch_command).toContain('--dangerously-skip-permissions');

    const filePath = path.join(loomCtx.manifestsDir, 'auth-setup.md');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('generates correct header', async () => {
    await handleCreateManifest(loomCtx, {
      name: 'API Endpoints',
      content: '## Tasks\n1. [ ] Build endpoints',
    });

    const filePath = path.join(loomCtx.manifestsDir, 'api-endpoints.md');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toMatch(/^# Manifest: API Endpoints\n/);
    expect(content).toMatch(/Generated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    expect(content).toContain('Source project: /Users/tyler/Sites/myapp');
  });

  it('generates launch command footer', async () => {
    await handleCreateManifest(loomCtx, {
      name: 'My Plan',
      content: '## Tasks\n1. [ ] Do stuff',
    });

    const filePath = path.join(loomCtx.manifestsDir, 'my-plan.md');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('---\nLaunch command:');
    expect(content).toContain('claude --dangerously-skip-permissions');
    expect(content).toContain('my-plan.md');
  });

  it('creates manifests directory if missing', async () => {
    expect(fs.existsSync(loomCtx.manifestsDir)).toBe(false);

    await handleCreateManifest(loomCtx, {
      name: 'Test',
      content: 'content',
    });

    expect(fs.existsSync(loomCtx.manifestsDir)).toBe(true);
  });

  it('overwrites existing manifest with same name', async () => {
    await handleCreateManifest(loomCtx, {
      name: 'Overwrite Test',
      content: 'Version 1',
    });
    await handleCreateManifest(loomCtx, {
      name: 'Overwrite Test',
      content: 'Version 2',
    });

    const filePath = path.join(loomCtx.manifestsDir, 'overwrite-test.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Version 2');
    expect(content).not.toContain('Version 1');
  });

  it('includes content between header and footer', async () => {
    const body = '## Pre-resolved Decisions\n- Use Auth0\n\n## Ordered Tasks\n1. [ ] Configure Auth0';
    await handleCreateManifest(loomCtx, {
      name: 'Full Manifest',
      content: body,
    });

    const filePath = path.join(loomCtx.manifestsDir, 'full-manifest.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain(body);
  });
});
