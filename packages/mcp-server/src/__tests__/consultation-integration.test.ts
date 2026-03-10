import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigLoader } from '../config/config-loader.js';
import { handleConsultPeer } from '../tools/consult-peer.js';
import type { LoomContext } from '../types.js';
import type { PeerResponse } from '../providers/types.js';

vi.mock('../providers/provider-factory.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../providers/provider-factory.js')>();
  return {
    ...original,
    createProvider: vi.fn().mockReturnValue({
      name: 'openai',
      isAvailable: () => true,
      call: vi.fn().mockResolvedValue({
        response: 'Mocked peer response',
        model: 'gpt-4o',
        tokens_used: 42,
      } satisfies PeerResponse),
    }),
  };
});

describe('Consultation integration', () => {
  let tmpDir: string;
  let homeDir: string;
  let projectRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-consult-int-'));
    homeDir = path.join(tmpDir, 'home');
    projectRoot = path.join(tmpDir, 'project');
    fs.mkdirSync(path.join(homeDir, '.loom'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, 'docs', 'loom'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeCtx(configOverrides?: Record<string, unknown>): LoomContext {
    if (configOverrides) {
      fs.writeFileSync(
        path.join(projectRoot, 'docs', 'loom', 'loom.config.json'),
        JSON.stringify(configOverrides)
      );
    }
    const loader = new ConfigLoader(projectRoot, homeDir);
    const config = loader.load();
    return {
      projectRoot,
      loomDir: path.join(projectRoot, 'docs', 'loom'),
      contextFilePath: path.join(projectRoot, 'docs', 'loom', 'context.md'),
      archivesDir: path.join(projectRoot, 'docs', 'loom', 'archives'),
      manifestsDir: path.join(projectRoot, 'docs', 'loom', 'manifests'),
      config,
    };
  }

  it('config loading + provider selection + consultation', async () => {
    fs.writeFileSync(
      path.join(homeDir, '.loom', 'config.json'),
      JSON.stringify({ default_provider: 'openai' })
    );

    const ctx = makeCtx();
    const result = await handleConsultPeer(ctx, {
      problem: 'Auth token expiring',
      context: 'Next.js app with Auth0',
      question: 'Why does the session drop after 30 minutes?',
    });

    expect(result.error).toBeUndefined();
    expect(result.response).toBe('Mocked peer response');
    expect(result.provider).toBe('openai');
  });

  it('per-project config disables consultation', async () => {
    const ctx = makeCtx({ peer_consultation: { enabled: false } });
    const result = await handleConsultPeer(ctx, {
      problem: 'test',
      context: 'test',
      question: 'test',
    });

    expect(result.error).toBe('Peer consultation is disabled in config');
  });

  it('per-project config overrides archive thresholds', () => {
    const ctx = makeCtx({
      archive_thresholds: { warning: 10_000, archive: 20_000 },
    });

    expect(ctx.config.archive_thresholds.warning).toBe(10_000);
    expect(ctx.config.archive_thresholds.archive).toBe(20_000);
  });

  it('global config sets provider defaults', () => {
    fs.writeFileSync(
      path.join(homeDir, '.loom', 'config.json'),
      JSON.stringify({
        default_provider: 'vertex',
        providers: {
          vertex: { model: 'gemini-2.0-flash', project: 'my-proj', location: 'us-central1' },
        },
      })
    );

    const ctx = makeCtx();
    expect(ctx.config.default_provider).toBe('vertex');
    expect(ctx.config.providers.vertex?.project).toBe('my-proj');
  });

  it('per-project allowed_providers restricts access', async () => {
    const ctx = makeCtx({
      peer_consultation: { enabled: true, allowed_providers: ['ollama'] },
    });

    const result = await handleConsultPeer(ctx, {
      problem: 'test',
      context: 'test',
      question: 'test',
    });

    expect(result.error).toContain('not in allowed_providers');
  });
});
