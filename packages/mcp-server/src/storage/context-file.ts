import fs from 'node:fs';
import path from 'node:path';
import type { LogEntry } from '../types.js';

export class ContextFile {
  private readonly loomDir: string;
  private readonly contextFilePath: string;
  private readonly archivesDir: string;

  constructor(projectRoot: string) {
    this.loomDir = path.join(projectRoot, 'docs', 'loom');
    this.contextFilePath = path.join(this.loomDir, 'context.md');
    this.archivesDir = path.join(this.loomDir, 'archives');
  }

  initialize(): void {
    fs.mkdirSync(this.archivesDir, { recursive: true });
    if (!fs.existsSync(this.contextFilePath)) {
      fs.writeFileSync(this.contextFilePath, '# Session Context\n\n');
    }
  }

  read(): string {
    if (!fs.existsSync(this.contextFilePath)) {
      return '';
    }
    return fs.readFileSync(this.contextFilePath, 'utf-8');
  }

  append(entry: LogEntry): void {
    this.initialize();
    const typeLabel = entry.type.toUpperCase();
    let block = `\n### [${typeLabel}] ${entry.timestamp}\n${entry.summary}\n`;
    if (entry.detail) {
      block += `\n${entry.detail}\n`;
    }
    block += '\n---\n';
    fs.appendFileSync(this.contextFilePath, block);
  }

  write(content: string): void {
    fs.mkdirSync(this.loomDir, { recursive: true });
    fs.writeFileSync(this.contextFilePath, content);
  }

  listArchives(): string[] {
    if (!fs.existsSync(this.archivesDir)) {
      return [];
    }
    return fs.readdirSync(this.archivesDir)
      .filter(f => f.endsWith('.md'))
      .sort();
  }

  writeArchive(filename: string, content: string): void {
    fs.mkdirSync(this.archivesDir, { recursive: true });
    fs.writeFileSync(path.join(this.archivesDir, filename), content);
  }

  readArchive(filename: string): string | null {
    const archivePath = path.join(this.archivesDir, filename);
    if (!fs.existsSync(archivePath)) {
      return null;
    }
    return fs.readFileSync(archivePath, 'utf-8');
  }

  getLastEntryTimestamp(): string | null {
    const content = this.read();
    const matches = content.match(/### \[\w+\] (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/g);
    if (!matches || matches.length === 0) {
      return null;
    }
    const last = matches[matches.length - 1];
    const tsMatch = last.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    return tsMatch ? tsMatch[1] : null;
  }
}
