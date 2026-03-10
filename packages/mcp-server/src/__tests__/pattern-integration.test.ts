import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { handleSavePattern } from '../tools/save-pattern.js';
import { handleFindPattern } from '../tools/find-pattern.js';
import { handleLogContext } from '../tools/log-context.js';
import { LoomDatabase } from '../storage/database.js';
import type { LoomContext } from '../types.js';
import { testConfig } from './helpers.js';

describe('Pattern library integration', () => {
  let tmpDir: string;
  let db: LoomDatabase;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-pattern-int-'));
    db = new LoomDatabase(path.join(tmpDir, 'loom.db'));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeCtx(projectPath: string): LoomContext {
    return {
      projectRoot: projectPath,
      loomDir: path.join(projectPath, 'docs', 'loom'),
      contextFilePath: path.join(projectPath, 'docs', 'loom', 'context.md'),
      archivesDir: path.join(projectPath, 'docs', 'loom', 'archives'),
      manifestsDir: path.join(projectPath, 'docs', 'loom', 'manifests'),
      database: db,
      config: testConfig(),
    };
  }

  it('saves patterns from different projects and searches across all', async () => {
    const ctxA = makeCtx(path.join(tmpDir, 'project-a'));
    const ctxB = makeCtx(path.join(tmpDir, 'project-b'));

    await handleSavePattern(ctxA, {
      name: 'Auth0 middleware',
      content: 'Set up Auth0 with Next.js middleware...',
      tags: ['nextjs', 'auth0'],
    });

    await handleSavePattern(ctxB, {
      name: 'JWT validation',
      content: 'Validate JWT tokens in Express middleware...',
      tags: ['express', 'jwt'],
    });

    const all = await handleFindPattern(ctxA, { query: 'middleware' });
    expect(all.patterns).toHaveLength(2);

    const onlyB = await handleFindPattern(ctxA, {
      query: 'middleware',
      project: path.join(tmpDir, 'project-b'),
    });
    expect(onlyB.patterns).toHaveLength(1);
    expect(onlyB.patterns[0].name).toBe('JWT validation');
  });

  it('log_context registers project when database is available', async () => {
    const projectDir = path.join(tmpDir, 'my-project');
    fs.mkdirSync(projectDir, { recursive: true });
    const ctx = makeCtx(projectDir);

    await handleLogContext(ctx, { type: 'action', summary: 'Test entry' });

    const projects = db.listProjects();
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0].path).toBe(projectDir);
  });
});
