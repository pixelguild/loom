import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { handleLogContext } from './tools/log-context.js';
import { handleGetContext } from './tools/get-context.js';
import { handleGetSessionStatus } from './tools/get-session-status.js';
import { handleArchiveContext } from './tools/archive-context.js';
import { handleSavePattern } from './tools/save-pattern.js';
import { handleFindPattern } from './tools/find-pattern.js';
import { handleCreateManifest } from './tools/create-manifest.js';
import { handleGetManifest } from './tools/get-manifest.js';
import { handleConsultPeer } from './tools/consult-peer.js';
import type { LoomContext } from './types.js';

export function createServer(loomCtx: LoomContext): McpServer {
  const server = new McpServer({
    name: 'loom',
    version: '0.1.0',
  });

  server.registerTool(
    'loom_log_context',
    {
      title: 'Log Context',
      description:
        'Append a structured log entry to the session context. Call after every significant action, decision, or discovery.',
      inputSchema: {
        type: z
          .enum(['decision', 'action', 'issue', 'question', 'dead_end', 'session_end'])
          .describe('The type of log entry'),
        summary: z.string().describe('One-line description of what happened'),
        detail: z.string().optional().describe('Optional longer explanation'),
      },
    },
    async (input) => {
      const result = await handleLogContext(loomCtx, input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }
  );

  server.registerTool(
    'loom_get_context',
    {
      title: 'Get Context',
      description:
        'Read the current session context. Call at the start of every session before doing any work.',
    },
    async () => {
      const result = await handleGetContext(loomCtx);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }
  );

  server.registerTool(
    'loom_get_session_status',
    {
      title: 'Get Session Status',
      description:
        'Return current context token count, archive count, and threshold status. Check periodically to monitor context health.',
    },
    async () => {
      const result = await handleGetSessionStatus(loomCtx);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }
  );

  server.registerTool(
    'loom_archive_context',
    {
      title: 'Archive Context',
      description:
        'Archive older context entries when context.md grows too large. Moves older entries to a timestamped archive file and keeps recent entries active.',
      inputSchema: {
        force: z
          .boolean()
          .optional()
          .describe('Archive even if below token threshold'),
      },
    },
    async (input) => {
      const result = await handleArchiveContext(loomCtx, { force: input.force });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }
  );

  server.registerTool(
    'loom_save_pattern',
    {
      title: 'Save Pattern',
      description:
        'Save a reusable implementation pattern to the global library. Patterns are searchable across all projects.',
      inputSchema: {
        name: z.string().describe('Human-readable name for the pattern'),
        content: z.string().describe('The pattern content (code, config, explanation)'),
        tags: z.array(z.string()).optional().describe('Tags for categorization (language, framework, topic)'),
      },
    },
    async (input) => {
      const result = await handleSavePattern(loomCtx, input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }
  );

  server.registerTool(
    'loom_find_pattern',
    {
      title: 'Find Pattern',
      description:
        'Search the global pattern library for reusable implementations. Call before implementing anything non-trivial.',
      inputSchema: {
        query: z.string().describe('Search terms'),
        tags: z.array(z.string()).optional().describe('Filter by tags'),
        project: z.string().optional().describe('Filter by source project path'),
        limit: z.number().optional().describe('Max results (default 5)'),
      },
    },
    async (input) => {
      const result = await handleFindPattern(loomCtx, {
        query: input.query,
        tags: input.tags,
        project: input.project,
        limit: input.limit,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }
  );

  server.registerTool(
    'loom_create_manifest',
    {
      title: 'Create Manifest',
      description:
        'Save a structured execution manifest for headless Claude Code runs. Provide the plan content — the tool generates header, footer, and launch command.',
      inputSchema: {
        name: z.string().describe('Human-readable name for the manifest (used as filename)'),
        content: z.string().describe('Structured manifest body (decisions, ordered tasks, file targets, ambiguities, env requirements)'),
      },
    },
    async (input) => {
      const result = await handleCreateManifest(loomCtx, input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }
  );

  server.registerTool(
    'loom_get_manifest',
    {
      title: 'Get Manifest',
      description:
        'List available manifests (no arguments) or retrieve a specific manifest by name.',
      inputSchema: {
        name: z.string().optional().describe('Manifest name to retrieve. Omit to list all manifests.'),
      },
    },
    async (input) => {
      const result = await handleGetManifest(loomCtx, { name: input.name });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }
  );

  server.registerTool(
    'loom_consult_peer',
    {
      title: 'Consult Peer LLM',
      description:
        'Ask a peer LLM (OpenAI, Vertex AI, or Ollama) for a second opinion on a problem. Useful for architecture decisions, debugging, or getting alternative perspectives.',
      inputSchema: {
        problem: z.string().describe('Brief description of the problem or decision'),
        context: z.string().describe('Relevant context (project type, constraints, what you have tried)'),
        code: z.string().optional().describe('Optional code snippet relevant to the question'),
        question: z.string().describe('The specific question to ask the peer LLM'),
        provider: z.string().optional().describe('Override default provider (openai, vertex, ollama)'),
      },
    },
    async (input) => {
      const result = await handleConsultPeer(loomCtx, input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }
  );

  return server;
}
