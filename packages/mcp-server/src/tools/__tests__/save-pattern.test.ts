import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleSavePattern } from '../save-pattern.js';
import { LoomDatabase } from '../../storage/database.js';
import type { LoomContext } from '../../types.js';
import { testConfig } from '../../__tests__/helpers.js';

describe('handleSavePattern', () => {
  let tmpDir: string;
  let db: LoomDatabase;
  let loomCtx: LoomContext;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-test-'));
    db = new LoomDatabase(path.join(tmpDir, 'loom.db'));
    loomCtx = {
      projectRoot: '/Users/tyler/Sites/myapp',
      loomDir: path.join(tmpDir, 'docs', 'loom'),
      contextFilePath: path.join(tmpDir, 'docs', 'loom', 'context.md'),
      archivesDir: path.join(tmpDir, 'docs', 'loom', 'archives'),
      manifestsDir: path.join(tmpDir, 'docs', 'loom', 'manifests'),
      database: db,
      config: testConfig(),
    };
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves a pattern and returns it', async () => {
    const result = await handleSavePattern(loomCtx, {
      name: 'Auth0 setup',
      content: 'Configure Auth0 with Next.js...',
      tags: ['nextjs', 'auth0'],
    });
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Auth0 setup');
    expect(result.tags).toEqual(['nextjs', 'auth0']);
    expect(result.source_project).toBe('/Users/tyler/Sites/myapp');
  });

  it('saves with empty tags when not provided', async () => {
    const result = await handleSavePattern(loomCtx, {
      name: 'Quick pattern',
      content: 'Some content',
    });
    expect(result.tags).toEqual([]);
  });

  it('pattern is findable after save', async () => {
    await handleSavePattern(loomCtx, {
      name: 'Stripe integration',
      content: 'Set up Stripe checkout...',
      tags: ['stripe'],
    });
    const found = db.findPatterns('Stripe');
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Stripe integration');
  });

  it('upserts project on save', async () => {
    await handleSavePattern(loomCtx, {
      name: 'Test',
      content: 'content',
    });
    const projects = db.listProjects();
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0].path).toBe('/Users/tyler/Sites/myapp');
  });
});
