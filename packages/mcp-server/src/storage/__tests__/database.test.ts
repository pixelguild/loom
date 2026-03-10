import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LoomDatabase } from '../database.js';

describe('LoomDatabase', () => {
  let tmpDir: string;
  let db: LoomDatabase;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-db-test-'));
    db = new LoomDatabase(path.join(tmpDir, 'loom.db'));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('creates database file', () => {
      expect(fs.existsSync(path.join(tmpDir, 'loom.db'))).toBe(true);
    });

    it('creates patterns table', () => {
      const tables = db.listTables();
      expect(tables).toContain('patterns');
    });

    it('creates patterns_fts virtual table', () => {
      const tables = db.listTables();
      expect(tables).toContain('patterns_fts');
    });

    it('creates projects table', () => {
      const tables = db.listTables();
      expect(tables).toContain('projects');
    });
  });

  describe('savePattern', () => {
    it('inserts a pattern and returns it', () => {
      const result = db.savePattern({
        name: 'Auth0 setup',
        content: 'Configure Auth0 with Next.js App Router...',
        tags: ['typescript', 'nextjs', 'auth0'],
        sourceProject: '/Users/tyler/Sites/myapp',
      });
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Auth0 setup');
      expect(result.tags).toEqual(['typescript', 'nextjs', 'auth0']);
      expect(result.source_project).toBe('/Users/tyler/Sites/myapp');
      expect(result.use_count).toBe(0);
    });

    it('generates unique IDs', () => {
      const a = db.savePattern({ name: 'A', content: 'a', tags: [], sourceProject: null });
      const b = db.savePattern({ name: 'B', content: 'b', tags: [], sourceProject: null });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('getPattern', () => {
    it('retrieves a pattern by ID', () => {
      const saved = db.savePattern({
        name: 'Test',
        content: 'content',
        tags: ['tag1'],
        sourceProject: '/test',
      });
      const found = db.getPattern(saved.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('Test');
      expect(found!.tags).toEqual(['tag1']);
    });

    it('returns undefined for missing ID', () => {
      expect(db.getPattern('nonexistent')).toBeUndefined();
    });
  });

  describe('findPatterns', () => {
    beforeEach(() => {
      db.savePattern({
        name: 'Auth0 Next.js authentication',
        content: 'Set up Auth0 with App Router middleware for authentication and session management.',
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

    it('finds patterns by keyword', () => {
      const results = db.findPatterns('authentication');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Auth0');
    });

    it('finds patterns across name and content', () => {
      const results = db.findPatterns('webhooks');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Stripe');
    });

    it('filters by tags', () => {
      const results = db.findPatterns('setup', { tags: ['auth0'] });
      expect(results.length).toBe(1);
      expect(results[0].name).toContain('Auth0');
    });

    it('filters by project', () => {
      const results = db.findPatterns('set up', { project: '/projects/api' });
      expect(results.length).toBe(1);
      expect(results[0].name).toContain('PostgreSQL');
    });

    it('respects limit', () => {
      const results = db.findPatterns('typescript', { limit: 1 });
      expect(results.length).toBe(1);
    });

    it('returns empty array for no matches', () => {
      const results = db.findPatterns('kubernetes');
      expect(results).toEqual([]);
    });

    it('increments use_count on returned results', () => {
      const results = db.findPatterns('Auth0');
      expect(results[0].use_count).toBe(1);

      const results2 = db.findPatterns('Auth0');
      expect(results2[0].use_count).toBe(2);
    });
  });

  describe('upsertProject', () => {
    it('inserts a new project', () => {
      db.upsertProject('/projects/new', 'new');
      const projects = db.listProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].path).toBe('/projects/new');
    });

    it('updates last_active_at on existing project', () => {
      db.upsertProject('/projects/existing', 'existing');
      const before = db.listProjects()[0].last_active_at;

      db.upsertProject('/projects/existing', 'existing');
      const after = db.listProjects()[0].last_active_at;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });
});
