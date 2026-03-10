<h1 align="center">@pixelguild/loom</h1>

<p align="center">
  Session intelligence layer for <a href="https://claude.ai/code">Claude Code</a>.<br>
  <strong>Persistent memory &middot; Intelligent archiving &middot; Cross-project patterns &middot; Peer LLM consultation</strong>
</p>

<p align="center">
  <a href="https://loom.pixelguild.com">loom.pixelguild.com</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@pixelguild/loom"><img src="https://img.shields.io/npm/v/@pixelguild/loom?color=0a7bca&label=npm" alt="npm"></a>
  <a href="https://github.com/pixelguild/loom/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@pixelguild/loom?color=333" alt="license"></a>
  <a href="https://github.com/pixelguild/loom"><img src="https://img.shields.io/badge/github-pixelguild%2Floom-333?logo=github" alt="github"></a>
</p>

---

Loom is an [MCP server](https://modelcontextprotocol.io) that gives Claude Code a long-term memory. It logs what Claude does, archives context when it grows large, and lets Claude pick up exactly where it left off in the next session.

## Install

```bash
npm install -g @pixelguild/loom
loom init
```

This scaffolds `docs/loom/`, wires the MCP server into `.claude/mcp.json`, and adds instructions to your `CLAUDE.md`. That's it.

Or add manually:

```bash
claude mcp add loom -- loom
```

## What it does

| Feature | Description |
|---------|-------------|
| **Context logging** | Structured entries (decisions, actions, issues, questions) appended to `docs/loom/context.md` |
| **Session pickup** | Claude reads context at session start and resumes where it left off |
| **Intelligent archiving** | Spawns a Claude subprocess to produce narrative archives with rolling carry-forward summaries |
| **Pattern library** | Global SQLite store with FTS5 search — save solutions in one project, find them everywhere |
| **Peer consultation** | Ask OpenAI, Vertex AI, or Ollama for a second opinion on architecture, debugging, or design |
| **Execution manifests** | Save structured plans for headless `claude` runs |
| **Per-project config** | Customize thresholds, providers, and settings via `loom.config.json` |

## How it works

```
Session start                          Session end
     |                                      |
     v                                      v
 loom_get_context  -->  Claude works  -->  loom_log_context
     |                  with full           |
     |                  history             v
     v                                 Token threshold?
 Resume where                          Yes --> loom_archive_context
 you left off                                  |
                                               v
                                         Narrative archive with
                                         carry-forward summary
```

The latest archive's carry-forward summary + current `context.md` always gives Claude full project history without reading every old archive.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `loom_get_context` | Read current context. Call at session start. |
| `loom_log_context` | Log a structured entry (action, decision, issue, question, dead_end, session_end) |
| `loom_get_session_status` | Token count, archive count, threshold status |
| `loom_archive_context` | Archive context (intelligent with Claude subprocess, mechanical fallback) |
| `loom_save_pattern` | Save a reusable pattern to the global library |
| `loom_find_pattern` | Search patterns across all projects |
| `loom_create_manifest` | Save a structured execution manifest |
| `loom_get_manifest` | List or retrieve manifests |
| `loom_consult_peer` | Ask a peer LLM for a second opinion |

## CLI

```bash
loom init      # Scaffold project, wire MCP, inject CLAUDE.md
loom status    # Token count, archive status, context health
```

## Configuration

Layered config — per-project overrides global defaults.

**Global** `~/.loom/config.json`:

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

**Per-project** `docs/loom/loom.config.json`:

```json
{
  "archive_thresholds": { "warning": 40000, "archive": 50000 },
  "peer_consultation": { "enabled": true, "allowed_providers": ["openai", "ollama"] }
}
```

| Variable | Purpose |
|----------|---------|
| `LOOM_PROJECT_ROOT` | Project directory (falls back to cwd) |
| `LOOM_OPENAI_API_KEY` | OpenAI API key for peer consultation |

## Peer Consultation Setup

The `loom_consult_peer` tool lets Claude ask a second LLM for architecture advice, debugging help, or alternative perspectives.

**OpenAI** — Set `LOOM_OPENAI_API_KEY` env var or pass it via MCP config:

```bash
claude mcp add loom -e LOOM_PROJECT_ROOT=$(pwd) -e LOOM_OPENAI_API_KEY=sk-... -- loom
```

```json
{ "default_provider": "openai", "providers": { "openai": { "model": "gpt-4o" } } }
```

**Vertex AI (Gemini)** — Requires `gcloud auth application-default login`:

```json
{ "default_provider": "vertex", "providers": { "vertex": { "model": "gemini-2.0-flash", "project": "your-gcp-project", "location": "us-central1" } } }
```

**Ollama (local)** — No API key needed. Install [Ollama](https://ollama.com) and pull a model:

```json
{ "default_provider": "ollama", "providers": { "ollama": { "model": "llama3.1", "host": "http://localhost:11434" } } }
```

Restrict providers per project in `docs/loom/loom.config.json`:

```json
{ "peer_consultation": { "enabled": true, "allowed_providers": ["openai", "ollama"] } }
```

## Storage

```
docs/loom/
  context.md              # Active session context
  loom.config.json        # Per-project config (optional)
  archives/
    2026-03-08-001.md     # Timestamped narrative archives
  manifests/
    deploy-plan.md        # Execution manifests

~/.loom/
  config.json             # Global config
  loom.db                 # SQLite pattern library (FTS5)
```

## License

MIT &copy; [Pixel Guild, LLC](https://pixelguild.com)
