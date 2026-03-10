import type { LoomDatabase } from './storage/database.js';
import type { LoomConfig } from './config/types.js';

export interface LoomContext {
  projectRoot: string;
  loomDir: string;
  contextFilePath: string;
  archivesDir: string;
  manifestsDir: string;
  database?: LoomDatabase;
  config: LoomConfig;
}

export type LogEntryType = 'decision' | 'action' | 'issue' | 'question' | 'dead_end' | 'session_end';

export interface LogEntry {
  type: LogEntryType;
  summary: string;
  detail?: string;
  timestamp: string;
}

export interface SessionStatus {
  tokenCount: number;
  archiveCount: number;
  lastEntryTimestamp: string | null;
  warningThreshold: number;
  archiveThreshold: number;
  needsArchive: boolean;
}

export interface ArchiveResult {
  archived: boolean;
  archiveFile?: string;
  previousTokenCount?: number;
  newTokenCount?: number;
  message?: string;
  method?: 'intelligent' | 'mechanical';
  warning?: string;
}

export interface PatternRecord {
  id: string;
  name: string;
  tags: string[];
  source_project: string | null;
  content: string;
  embedding_hash: string | null;
  created_at: number;
  last_used_at: number;
  use_count: number;
}

export interface ProjectRecord {
  path: string;
  name: string;
  last_active_at: number;
  session_count: number;
  privacy_level: string;
}
