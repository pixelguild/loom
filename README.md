<p align="center">
  <img src="assets/loom_app_icon.png" width="128" height="128" alt="Loom">
</p>

<h1 align="center">Loom</h1>

<p align="center">
  Session intelligence layer for <a href="https://claude.ai/code">Claude Code</a>.<br>
  Persistent memory, intelligent archiving, cross-project patterns, peer LLM consultation, and a native macOS companion app.
</p>

---

## What it does

- **Context logging** — Claude automatically logs decisions, actions, issues, and questions to `docs/loom/context.md`
- **Session pickup** — At session start, Claude reads the context file and picks up exactly where you left off
- **Intelligent archiving** — When context grows large, Loom spawns a Claude subprocess to produce narrative archives with rolling carry-forward summaries. Falls back to mechanical archiving if the CLI isn't available.
- **Cross-project patterns** — Save reusable solutions to a global SQLite library with FTS5 search. Check before building, save after solving.
- **Peer consultation** — Ask a second LLM (OpenAI, Vertex AI, or Ollama) for architecture advice, debugging help, or alternative perspectives
- **Execution manifests** — Save structured plans for headless `claude` runs
- **Per-project config** — Customize thresholds, providers, and consultation settings per project via `loom.config.json`
- **CLI** — `loom init` scaffolds a project, wires MCP config, and injects CLAUDE.md instructions. `loom status` shows context health.
- **macOS companion app** — Native SwiftUI menubar app for browsing project context, archives, and patterns at a glance

## Quick Start

### 1. Install

```bash
npm install -g @pixelguild/loom
```

### 2. Initialize a project

From the project you want Loom in:

```bash
loom init
```

This will:
- Create `docs/loom/` with `archives/` and `manifests/` directories
- Add Loom instructions to your `CLAUDE.md`
- Wire Loom into `.claude/mcp.json`

Or manually add to any project:

```bash
claude mcp add loom -- loom
```

### 3. Start working

Open a Claude Code session in your project. Claude will automatically:
1. Read existing context at session start
2. Log progress as it works
3. Archive when context gets large
4. Resume seamlessly in the next session

### 4. Check status

```bash
loom status
```

Shows token count, archive count, last entry, and whether archiving is needed.

## MCP Tools

| Tool | Description |
|------|-------------|
| `loom_get_context` | Read current session context. Call at session start. |
| `loom_log_context` | Log a structured entry (action, decision, issue, question, dead_end, session_end). |
| `loom_get_session_status` | Get token count, archive count, and threshold status. |
| `loom_archive_context` | Archive context intelligently via Claude subprocess, or mechanically as fallback. |
| `loom_save_pattern` | Save a reusable pattern to the global library. Searchable across all projects. |
| `loom_find_pattern` | Search the global pattern library for reusable implementations. |
| `loom_create_manifest` | Save a structured execution manifest for headless runs. |
| `loom_get_manifest` | List available manifests or retrieve one by name. |
| `loom_consult_peer` | Ask a peer LLM for a second opinion. Supports OpenAI, Vertex AI, Ollama. |

### loom_log_context

```
type: "decision" | "action" | "issue" | "question" | "dead_end" | "session_end"
summary: string       # One-line description
detail?: string       # Optional longer explanation
```

Returns `{ success: true, tokenCount: number }`

### loom_get_context

No input. Returns:
```
{
  content: string       # Full context.md content
  archives: string[]    # List of archive filenames
  tokenCount: number
}
```

### loom_get_session_status

No input. Returns:
```
{
  tokenCount: number
  archiveCount: number
  lastEntryTimestamp: string | null
  warningThreshold: 60000
  archiveThreshold: 80000
  needsArchive: boolean
}
```

### loom_archive_context

```
force?: boolean    # Archive even if below threshold
```

Returns `{ archived, archiveFile?, previousTokenCount?, newTokenCount?, method?, warning? }`

When `method` is `"intelligent"`, Claude produced a narrative archive with:
- **Carry-forward summary** — compressed history of all sessions (~2000 tokens)
- **Session narrative** — chronological story of what happened
- **Reference sections** — decisions, files, issues, dead ends, open questions, current state

When `method` is `"mechanical"`, the fallback 60/40 split was used. The `warning` field explains why.

### loom_save_pattern

```
name: string          # Human-readable pattern name
content: string       # The pattern (code, config, explanation)
tags?: string[]       # Tags for categorization
```

Returns `{ id, name, tags, source_project }`

### loom_find_pattern

```
query: string         # Search terms
tags?: string[]       # Filter by tags
project?: string      # Filter by source project
limit?: number        # Max results (default 5)
```

Returns `{ patterns: PatternRecord[], total: number }`

### loom_create_manifest

```
name: string          # Manifest name (used as filename slug)
content: string       # Structured manifest body
```

Returns `{ name, slug, path, launch_command }`

### loom_get_manifest

```
name?: string         # Omit to list all; provide to get specific manifest
```

List mode returns `{ manifests: [{ name, slug, created_at, path }] }`
Get mode returns `{ name, slug, content, launch_command }`

### loom_consult_peer

```
problem: string       # Brief description of the problem
context: string       # Relevant context (project type, constraints)
question: string      # Specific question for the peer LLM
code?: string         # Optional code snippet
provider?: string     # Override default provider (openai, vertex, ollama)
```

Returns `{ provider, model, response, tokens_used }` or `{ error }`

#### Setting up peer consultation

Peer consultation lets Claude ask a second LLM for architecture advice, debugging help, or alternative perspectives. Three providers are supported:

**OpenAI**

Set the `LOOM_OPENAI_API_KEY` environment variable, then configure `~/.loom/config.json`:

```json
{
  "default_provider": "openai",
  "providers": {
    "openai": { "model": "gpt-4o" }
  }
}
```

You can pass the key via MCP config instead of a global env var:

```bash
claude mcp add loom -e LOOM_PROJECT_ROOT=$(pwd) -e LOOM_OPENAI_API_KEY=sk-... -- loom
```

**Vertex AI (Google Gemini)**

Requires `gcloud` CLI authenticated (`gcloud auth application-default login`):

```json
{
  "default_provider": "vertex",
  "providers": {
    "vertex": {
      "model": "gemini-2.0-flash",
      "project": "your-gcp-project-id",
      "location": "us-central1"
    }
  }
}
```

**Ollama (local)**

Run any model locally with [Ollama](https://ollama.com). No API key needed:

```json
{
  "default_provider": "ollama",
  "providers": {
    "ollama": {
      "model": "llama3.1",
      "host": "http://localhost:11434"
    }
  }
}
```

**Per-project overrides**

Restrict or configure consultation per project in `docs/loom/loom.config.json`:

```json
{
  "peer_consultation": {
    "enabled": true,
    "allowed_providers": ["openai", "ollama"]
  }
}
```

## How it works

### Storage

Loom stores context per-project in `docs/loom/`:

```
docs/loom/
  context.md          # Active session context
  loom.config.json    # Per-project config (optional)
  archives/
    2026-03-08-001.md # Archived context (timestamped)
    2026-03-08-002.md
  manifests/
    deploy-plan.md    # Execution manifests
```

### Logging

Each `loom_log_context` call appends a structured entry to `context.md`:

```markdown
### [DECISION] 2026-03-08 14:32:05
Use Auth0 for authentication

Evaluated Auth0 vs Clerk. Auth0 has existing tenant and better pricing.

---
```

### Intelligent Archiving

When context exceeds the token threshold, Loom spawns a `claude` CLI subprocess to read the full context and produce a structured narrative archive:

- **Carry-forward summary** — compresses all project history into ~2000 tokens. Each archive re-summarizes previous summaries, keeping total size bounded.
- **Session narrative** — chronological story preserving cause-and-effect relationships between decisions, problems, and solutions.
- **Reference sections** — quick-lookup sections for grep-ability.

This means the latest archive's carry-forward + current `context.md` always gives Claude full project history without reading every old archive.

If the `claude` CLI isn't available, Loom falls back to mechanical archiving (60/40 entry split) and warns the user.

### Pattern Library

Loom maintains a global SQLite database at `~/.loom/loom.db` for cross-project patterns. Patterns are indexed with FTS5 full-text search, so solutions saved in one project are discoverable everywhere.

### Execution Manifests

Manifests are stored as markdown files in `docs/loom/manifests/`. Each includes a generated launch command for headless `claude` runs.

## CLI

```bash
loom init      # Scaffold docs/loom/, wire MCP config, inject CLAUDE.md instructions
loom status    # Show token count, archive status, and context health
```

## macOS Companion App

A native SwiftUI menubar app that provides a read-only view of all your Loom-enabled projects. Browse context, archives, and patterns without opening a terminal.

Built with:
- SwiftUI + AppKit (NSStatusItem + NSPopover)
- GRDB for read-only SQLite access to `~/.loom/loom.db`
- MarkdownUI for rendering context files

Build from source:
```bash
cd packages/menubar
xcodegen generate
xcodebuild -project Loom.xcodeproj -scheme Loom build
```

## Configuration

Set `LOOM_PROJECT_ROOT` to tell Loom which project to manage. Falls back to the current working directory.

### Config files

Loom uses layered configuration — per-project settings override global defaults:

- **Global**: `~/.loom/config.json` — provider credentials, default provider
- **Per-project**: `docs/loom/loom.config.json` — archive thresholds, consultation settings

Example `~/.loom/config.json`:
```json
{
  "default_provider": "openai",
  "providers": {
    "openai": { "model": "gpt-4o" },
    "vertex": { "model": "gemini-2.0-flash", "project": "my-gcp-project", "location": "us-central1" },
    "ollama": { "model": "llama3.1", "host": "http://localhost:11434" }
  }
}
```

Example `docs/loom/loom.config.json`:
```json
{
  "archive_thresholds": { "warning": 40000, "archive": 50000 },
  "peer_consultation": { "enabled": true, "allowed_providers": ["openai", "ollama"] }
}
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `LOOM_PROJECT_ROOT` | Project directory to manage |
| `LOOM_OPENAI_API_KEY` | OpenAI API key for peer consultation |

## Architecture

**Monorepo** (npm workspaces):

- `packages/mcp-server` — TypeScript MCP server, CLI, and all tool handlers
- `packages/menubar` — Swift/SwiftUI macOS companion app

## Development

```bash
npm run build -w packages/mcp-server     # Build
npm run test:run -w packages/mcp-server  # Run tests (173 tests)
npm run test -w packages/mcp-server      # Watch mode
npm run dev -w packages/mcp-server       # Build watch mode
```

## License

MIT
