import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleGetManifest } from '../get-manifest.js';
import type { LoomContext } from '../../types.js';
import { testConfig } from '../../__tests__/helpers.js';

/**
 * Helper to create a manifest file in the expected format.
 * This mirrors the output of handleCreateManifest so tests are
 * self-contained and don't depend on Task 3 being finished.
 */
function createManifestFile(ctx: LoomContext, name: string, content: string): void {
  fs.mkdirSync(ctx.manifestsDir, { recursive: true });

  const slug = name
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
  const filePath = path.join(ctx.manifestsDir, `${slug}.md`);

  const header = `# Manifest: ${name}\nGenerated: ${timestamp}\nSource project: ${ctx.projectRoot}\n\n`;
  const footer = `\n\n---\nLaunch command:\n\`\`\`bash\nclaude --dangerously-skip-permissions -p "Read docs/loom/manifests/${slug}.md and execute all tasks"\n\`\`\`\n`;

  fs.writeFileSync(filePath, header + content + footer, 'utf-8');
}

describe('handleGetManifest', () => {
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

  describe('list mode (no name)', () => {
    it('returns empty list when no manifests exist', async () => {
      const result = await handleGetManifest(loomCtx, {});
      expect(result.manifests).toEqual([]);
    });

    it('returns empty list when manifests directory does not exist', async () => {
      const result = await handleGetManifest(loomCtx, {});
      expect(result.manifests).toEqual([]);
    });

    it('lists available manifests', async () => {
      createManifestFile(loomCtx, 'Auth Setup', 'Auth tasks');
      createManifestFile(loomCtx, 'API Endpoints', 'API tasks');

      const result = await handleGetManifest(loomCtx, {});
      expect(result.manifests).toHaveLength(2);

      const slugs = result.manifests!.map(m => m.slug);
      expect(slugs).toContain('auth-setup');
      expect(slugs).toContain('api-endpoints');
    });

    it('includes name, slug, created_at, and path', async () => {
      createManifestFile(loomCtx, 'Test Manifest', 'content');

      const result = await handleGetManifest(loomCtx, {});
      const manifest = result.manifests![0];
      expect(manifest.name).toBe('Test Manifest');
      expect(manifest.slug).toBe('test-manifest');
      expect(manifest.created_at).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(manifest.path).toBe('docs/loom/manifests/test-manifest.md');
    });

    it('ignores non-markdown files in manifests directory', async () => {
      createManifestFile(loomCtx, 'Valid Manifest', 'content');
      fs.writeFileSync(path.join(loomCtx.manifestsDir, 'notes.txt'), 'not a manifest');

      const result = await handleGetManifest(loomCtx, {});
      expect(result.manifests).toHaveLength(1);
      expect(result.manifests![0].slug).toBe('valid-manifest');
    });
  });

  describe('get mode (with name)', () => {
    it('returns manifest content by name', async () => {
      createManifestFile(loomCtx, 'Auth Setup', '## Tasks\n1. [ ] Configure Auth0');

      const result = await handleGetManifest(loomCtx, { name: 'Auth Setup' });
      expect(result.name).toBe('Auth Setup');
      expect(result.slug).toBe('auth-setup');
      expect(result.content).toContain('## Tasks');
      expect(result.content).toContain('Configure Auth0');
      expect(result.launch_command).toContain('auth-setup.md');
    });

    it('returns error for non-existent manifest', async () => {
      const result = await handleGetManifest(loomCtx, { name: 'does-not-exist' });
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });

    it('slugifies the name for lookup', async () => {
      createManifestFile(loomCtx, 'Auth Setup', 'tasks here');

      const result = await handleGetManifest(loomCtx, { name: 'Auth Setup' });
      expect(result.content).toContain('tasks here');
    });

    it('returns error when manifests directory does not exist', async () => {
      const result = await handleGetManifest(loomCtx, { name: 'Missing' });
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });
  });
});
