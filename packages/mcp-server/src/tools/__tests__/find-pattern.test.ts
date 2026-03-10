import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleFindPattern } from '../find-pattern.js';
import { LoomDatabase } from '../../storage/database.js';
import type { LoomContext } from '../../types.js';
import { testConfig } from '../../__tests__/helpers.js';

describe('handleFindPattern', () => {
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

    db.savePattern({
      name: 'Auth0 Next.js authentication',
      content: 'Set up Auth0 with App Router middleware for authentication.',
      tags: ['typescript', 'nextjs', 'auth0'],
      sourceProject: '/projects/webapp',
    });
    db.savePattern({
      name: 'Stripe payment integration',
      content: 'Configure Stripe checkout with webhooks for payment processing.',
      tags: ['typescript', 'stripe', 'payments'],
      sourceProject: '/projects/webapp',
    });
    db.savePattern({
      name: 'PostgreSQL connection pool',
      content: 'Set up pg connection pool with health checks for database access.',
      tags: ['typescript', 'postgresql', 'database'],
      sourceProject: '/projects/api',
    });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds patterns by keyword', async () => {
    const result = await handleFindPattern(loomCtx, { query: 'authentication' });
    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.patterns[0].name).toContain('Auth0');
    expect(result.total).toBeGreaterThan(0);
  });

  it('filters by tags', async () => {
    const result = await handleFindPattern(loomCtx, {
      query: 'set up',
      tags: ['postgresql'],
    });
    expect(result.patterns).toHaveLength(1);
    expect(result.patterns[0].name).toContain('PostgreSQL');
  });

  it('filters by project', async () => {
    const result = await handleFindPattern(loomCtx, {
      query: 'typescript',
      project: '/projects/api',
    });
    expect(result.patterns).toHaveLength(1);
    expect(result.patterns[0].source_project).toBe('/projects/api');
  });

  it('respects limit', async () => {
    const result = await handleFindPattern(loomCtx, {
      query: 'typescript',
      limit: 1,
    });
    expect(result.patterns).toHaveLength(1);
  });

  it('returns empty for no matches', async () => {
    const result = await handleFindPattern(loomCtx, { query: 'kubernetes' });
    expect(result.patterns).toEqual([]);
    expect(result.total).toBe(0);
  });
});
