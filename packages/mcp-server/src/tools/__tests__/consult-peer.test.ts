import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleConsultPeer } from '../consult-peer.js';
import { testConfig } from '../../__tests__/helpers.js';
import type { LoomContext } from '../../types.js';
import type { PeerProvider, PeerResponse } from '../../providers/types.js';

vi.mock('../../providers/provider-factory.js', () => ({
  createProvider: vi.fn(),
  resolveProviderName: vi.fn((requested: string | undefined, config: { default_provider: string }) =>
    requested ?? config.default_provider
  ),
}));

import { createProvider } from '../../providers/provider-factory.js';

const mockCreateProvider = vi.mocked(createProvider);

function makeCtx(configOverrides?: Parameters<typeof testConfig>[0]): LoomContext {
  return {
    projectRoot: '/tmp/test',
    loomDir: '/tmp/test/docs/loom',
    contextFilePath: '/tmp/test/docs/loom/context.md',
    archivesDir: '/tmp/test/docs/loom/archives',
    manifestsDir: '/tmp/test/docs/loom/manifests',
    config: testConfig(configOverrides),
  };
}

function mockProvider(overrides?: Partial<PeerProvider & { callResult: PeerResponse }>): PeerProvider {
  return {
    name: overrides?.name ?? 'openai',
    isAvailable: vi.fn().mockReturnValue(overrides?.isAvailable?.() ?? true),
    call: vi.fn().mockResolvedValue(overrides?.callResult ?? {
      response: 'Mocked response',
      model: 'gpt-4o',
      tokens_used: 100,
    }),
  };
}

const baseInput = {
  problem: 'Auth not working',
  context: 'Next.js app with Auth0',
  question: 'Why does the session expire?',
};

describe('handleConsultPeer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when consultation is disabled', async () => {
    const ctx = makeCtx({
      peer_consultation: { enabled: false, allowed_providers: ['openai'] },
    });
    const result = await handleConsultPeer(ctx, baseInput);
    expect(result.error).toBe('Peer consultation is disabled in config');
  });

  it('returns error when provider is not in allowed list', async () => {
    const ctx = makeCtx({
      peer_consultation: { enabled: true, allowed_providers: ['ollama'] },
    });
    const result = await handleConsultPeer(ctx, { ...baseInput, provider: 'openai' });
    expect(result.error).toContain('not in allowed_providers');
  });

  it('returns error when provider is not available', async () => {
    const provider = mockProvider({ isAvailable: (() => false) as PeerProvider['isAvailable'] });
    mockCreateProvider.mockReturnValue(provider);

    const ctx = makeCtx();
    const result = await handleConsultPeer(ctx, baseInput);
    expect(result.error).toContain('not available');
  });

  it('returns error when createProvider throws', async () => {
    mockCreateProvider.mockImplementation(() => { throw new Error('Unknown provider: foo'); });

    const ctx = makeCtx({
      peer_consultation: { enabled: true, allowed_providers: ['foo'] },
    });
    const result = await handleConsultPeer(ctx, { ...baseInput, provider: 'foo' });
    expect(result.error).toContain('Failed to create provider');
  });

  it('returns error when provider call fails', async () => {
    const provider = mockProvider();
    (provider.call as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API timeout'));
    mockCreateProvider.mockReturnValue(provider);

    const ctx = makeCtx();
    const result = await handleConsultPeer(ctx, baseInput);
    expect(result.error).toContain('Provider call failed: API timeout');
  });

  it('returns successful response', async () => {
    const provider = mockProvider({
      callResult: { response: 'Check token expiry settings', model: 'gpt-4o', tokens_used: 250 },
    });
    mockCreateProvider.mockReturnValue(provider);

    const ctx = makeCtx();
    const result = await handleConsultPeer(ctx, baseInput);

    expect(result.error).toBeUndefined();
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o');
    expect(result.response).toBe('Check token expiry settings');
    expect(result.tokens_used).toBe(250);
  });

  it('builds prompt with code block when code is provided', async () => {
    const provider = mockProvider();
    mockCreateProvider.mockReturnValue(provider);

    const ctx = makeCtx();
    await handleConsultPeer(ctx, {
      ...baseInput,
      code: 'const session = await getSession(req);',
    });

    const callArg = (provider.call as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(callArg).toContain('## Code');
    expect(callArg).toContain('const session = await getSession(req);');
  });

  it('builds prompt without code block when code is absent', async () => {
    const provider = mockProvider();
    mockCreateProvider.mockReturnValue(provider);

    const ctx = makeCtx();
    await handleConsultPeer(ctx, baseInput);

    const callArg = (provider.call as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(callArg).not.toContain('## Code');
    expect(callArg).toContain('## Problem');
    expect(callArg).toContain('## Question');
  });

  it('uses requested provider override', async () => {
    const provider = mockProvider({ name: 'ollama' });
    mockCreateProvider.mockReturnValue(provider);

    const ctx = makeCtx();
    const result = await handleConsultPeer(ctx, { ...baseInput, provider: 'ollama' });
    expect(result.provider).toBe('ollama');
  });
});
