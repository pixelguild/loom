import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { PatternRecord, ProjectRecord } from '../types.js';

export interface SavePatternInput {
  name: string;
  content: string;
  tags: string[];
  sourceProject: string | null;
}

export interface FindPatternsOptions {
  tags?: string[];
  project?: string;
  limit?: number;
}

interface PatternRow {
  id: string;
  name: string;
  tags: string;
  source_project: string | null;
  content: string;
  embedding_hash: string | null;
  created_at: number;
  last_used_at: number;
  use_count: number;
}

export class LoomDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        source_project TEXT,
        content TEXT NOT NULL,
        embedding_hash TEXT,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER NOT NULL,
        use_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS projects (
        path TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        last_active_at INTEGER NOT NULL,
        session_count INTEGER NOT NULL DEFAULT 0,
        privacy_level TEXT NOT NULL DEFAULT 'none'
      );
    `);

    const ftsExists = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='patterns_fts'"
    ).get();

    if (!ftsExists) {
      this.db.exec(`
        CREATE VIRTUAL TABLE patterns_fts USING fts5(
          name, tags, content, content=patterns, content_rowid=rowid
        );

        CREATE TRIGGER IF NOT EXISTS patterns_ai AFTER INSERT ON patterns BEGIN
          INSERT INTO patterns_fts(rowid, name, tags, content)
          VALUES (new.rowid, new.name, new.tags, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS patterns_ad AFTER DELETE ON patterns BEGIN
          INSERT INTO patterns_fts(patterns_fts, rowid, name, tags, content)
          VALUES ('delete', old.rowid, old.name, old.tags, old.content);
        END;

        CREATE TRIGGER IF NOT EXISTS patterns_au AFTER UPDATE ON patterns BEGIN
          INSERT INTO patterns_fts(patterns_fts, rowid, name, tags, content)
          VALUES ('delete', old.rowid, old.name, old.tags, old.content);
          INSERT INTO patterns_fts(rowid, name, tags, content)
          VALUES (new.rowid, new.name, new.tags, new.content);
        END;
      `);
    }
  }

  savePattern(input: SavePatternInput): PatternRecord {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const tagsJson = JSON.stringify(input.tags);

    this.db.prepare(`
      INSERT INTO patterns (id, name, tags, source_project, content, created_at, last_used_at, use_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(id, input.name, tagsJson, input.sourceProject, input.content, now, now);

    return {
      id,
      name: input.name,
      tags: input.tags,
      source_project: input.sourceProject,
      content: input.content,
      embedding_hash: null,
      created_at: now,
      last_used_at: now,
      use_count: 0,
    };
  }

  getPattern(id: string): PatternRecord | undefined {
    const row = this.db.prepare('SELECT * FROM patterns WHERE id = ?').get(id) as PatternRow | undefined;
    if (!row) return undefined;
    return this.rowToPattern(row);
  }

  findPatterns(query: string, opts?: FindPatternsOptions): PatternRecord[] {
    const limit = opts?.limit ?? 5;

    // Try FTS5 first, then fall back to LIKE-based search for fuzzy matching
    let rows = this.findPatternsFts(query, opts, limit);
    if (rows.length === 0) {
      rows = this.findPatternsLike(query, opts, limit);
    }

    if (rows.length === 0) {
      return [];
    }

    const now = Math.floor(Date.now() / 1000);
    const updateStmt = this.db.prepare(
      'UPDATE patterns SET use_count = use_count + 1, last_used_at = ? WHERE id = ?'
    );
    const updateMany = this.db.transaction((ids: string[]) => {
      for (const id of ids) {
        updateStmt.run(now, id);
      }
    });
    updateMany(rows.map(r => r.id));

    return rows.map(row => ({
      ...this.rowToPattern(row),
      use_count: row.use_count + 1,
      last_used_at: now,
    }));
  }

  private findPatternsFts(query: string, opts: FindPatternsOptions | undefined, limit: number): PatternRow[] {
    const params: (string | number)[] = [];

    // FTS5 query: wrap individual terms in quotes to handle special characters
    const ftsQuery = query
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => `"${term}"`)
      .join(' ');

    let sql = `
      SELECT patterns.* FROM patterns_fts
      JOIN patterns ON patterns.rowid = patterns_fts.rowid
      WHERE patterns_fts MATCH ?
    `;
    params.push(ftsQuery);

    if (opts?.tags && opts.tags.length > 0) {
      for (const tag of opts.tags) {
        sql += ' AND patterns.tags LIKE ?';
        params.push(`%"${tag}"%`);
      }
    }

    if (opts?.project) {
      sql += ' AND patterns.source_project = ?';
      params.push(opts.project);
    }

    sql += ' ORDER BY rank LIMIT ?';
    params.push(limit);

    return this.db.prepare(sql).all(...params) as PatternRow[];
  }

  private findPatternsLike(query: string, opts: FindPatternsOptions | undefined, limit: number): PatternRow[] {
    const params: (string | number)[] = [];
    const likePattern = `%${query}%`;
    const normalizedPattern = `%${query.replace(/\s+/g, '').toLowerCase()}%`;

    // Match against raw text OR space-normalized text (e.g. "setup" matches "Set up")
    let sql = `
      SELECT * FROM patterns
      WHERE (
        name LIKE ? OR content LIKE ? OR tags LIKE ?
        OR REPLACE(LOWER(name), ' ', '') LIKE ?
        OR REPLACE(LOWER(content), ' ', '') LIKE ?
      )
    `;
    params.push(likePattern, likePattern, likePattern, normalizedPattern, normalizedPattern);

    if (opts?.tags && opts.tags.length > 0) {
      for (const tag of opts.tags) {
        sql += ' AND tags LIKE ?';
        params.push(`%"${tag}"%`);
      }
    }

    if (opts?.project) {
      sql += ' AND source_project = ?';
      params.push(opts.project);
    }

    sql += ' ORDER BY last_used_at DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(sql).all(...params) as PatternRow[];
  }

  upsertProject(projectPath: string, name: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      INSERT INTO projects (path, name, last_active_at, session_count, privacy_level)
      VALUES (?, ?, ?, 0, 'none')
      ON CONFLICT(path) DO UPDATE SET
        last_active_at = excluded.last_active_at,
        name = excluded.name
    `).run(projectPath, name, now);
  }

  listProjects(): ProjectRecord[] {
    return this.db.prepare('SELECT * FROM projects ORDER BY last_active_at DESC').all() as ProjectRecord[];
  }

  listTables(): string[] {
    const rows = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type IN ('table', 'shadow') ORDER BY name"
    ).all() as Array<{ name: string }>;
    return rows.map(r => r.name);
  }

  close(): void {
    this.db.close();
  }

  private rowToPattern(row: PatternRow): PatternRecord {
    return {
      ...row,
      tags: JSON.parse(row.tags) as string[],
    };
  }
}
