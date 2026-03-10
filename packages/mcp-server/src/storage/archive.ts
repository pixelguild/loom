import { ContextFile } from './context-file.js';

const ENTRY_HEADER_PATTERN = /^### \[\w+\] \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;

/**
 * Splits the raw content of a context.md file into individual entries.
 * Each entry starts with a ### [TYPE] timestamp header and ends before the next entry.
 * Trailing separators (---) are included as part of each entry.
 */
export function splitEntries(content: string): string[] {
  const lines = content.split('\n');
  const entries: string[] = [];
  let current: string[] = [];
  let inEntry = false;

  for (const line of lines) {
    if (ENTRY_HEADER_PATTERN.test(line)) {
      if (inEntry && current.length > 0) {
        entries.push(trimEntry(current));
      }
      current = [line];
      inEntry = true;
    } else if (inEntry) {
      current.push(line);
    }
  }

  // Push the last entry
  if (inEntry && current.length > 0) {
    entries.push(trimEntry(current));
  }

  return entries;
}

/**
 * Trims trailing whitespace and standalone separator lines from an entry,
 * then returns the cleaned string.
 */
function trimEntry(lines: string[]): string {
  // Remove trailing empty lines and standalone '---' lines
  let end = lines.length;
  while (end > 0) {
    const line = lines[end - 1].trim();
    if (line === '' || line === '---') {
      end--;
    } else {
      break;
    }
  }
  return lines.slice(0, end).join('\n').trim();
}

/**
 * Generates an archive filename following the YYYY-MM-DD-NNN.md pattern.
 * Increments the sequence number based on existing archives for the given date.
 */
export function generateArchiveFilename(existingArchives: string[], dateStr: string): string {
  const todayArchives = existingArchives.filter(a => a.startsWith(dateStr));
  let maxSeq = 0;
  for (const archive of todayArchives) {
    const match = archive.match(/-(\d{3})\.md$/);
    if (match) {
      maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
    }
  }
  const seq = String(maxSeq + 1).padStart(3, '0');
  return `${dateStr}-${seq}.md`;
}

/**
 * Performs the archive operation on a project's context.md file.
 * Moves the oldest ~60% of entries into an archive file and keeps
 * the newest ~40% in context.md with an Active State header.
 */
export function performMechanicalArchive(projectRoot: string): {
  archived: boolean;
  archiveFile?: string;
  message?: string;
} {
  const contextFile = new ContextFile(projectRoot);
  const content = contextFile.read();
  const entries = splitEntries(content);

  if (entries.length < 2) {
    return { archived: false, message: 'Not enough entries to archive' };
  }

  // Split: ~60% oldest go to archive, ~40% newest stay
  const keepCount = Math.max(1, Math.ceil(entries.length * 0.4));
  const archiveEntries = entries.slice(0, entries.length - keepCount);
  const keepEntries = entries.slice(entries.length - keepCount);

  // Generate archive filename
  const existingArchives = contextFile.listArchives();
  const today = new Date().toISOString().slice(0, 10);
  const archiveFilename = generateArchiveFilename(existingArchives, today);

  // Write archive file
  const archiveContent = [
    `# Archive: ${archiveFilename}`,
    `Archived: ${new Date().toISOString()}`,
    '',
    archiveEntries.join('\n\n---\n\n'),
    '',
  ].join('\n');
  contextFile.writeArchive(archiveFilename, archiveContent);

  // Extract a summary from the first kept entry for the "continuing from" line
  const firstKeptEntry = keepEntries[0];
  const summaryMatch = firstKeptEntry.match(/^### \[.+\]\s.+\n(.+)/);
  const continuingFrom = summaryMatch ? summaryMatch[1].trim() : 'previous session';

  // Rewrite context.md with Active State header + kept entries
  const newContent = [
    '# Session Context',
    '',
    '## Active State',
    `Archived to: ${archiveFilename}`,
    `Continuing from: ${continuingFrom}`,
    '',
    ...keepEntries.map(entry => entry + '\n\n---\n'),
  ].join('\n');

  contextFile.write(newContent);

  return {
    archived: true,
    archiveFile: archiveFilename,
  };
}
