import { describe, it, expect } from 'vitest';
import { createProvider, resolveProviderName } from '../provider-factory.js';
import { OpenAIProvider } from '../openai-provider.js';
import { VertexProvider } from '../vertex-provider.js';
import { OllamaProvider } from '../ollama-provider.js';
import { DEFAULT_CONFIG } from '../../config/config-loader.js';
import type { LoomConfig } from '../../config/types.js';

const config: LoomConfig = {
  ...DEFAULT_CONFIG,
  providers: {
    openai: { model: 'gpt-4o-mini' },
    vertex: { model: 'gemini-2.0-flash', project: 'test-proj', location: 'us-central1' },
    ollama: { model: 'phi', host: 'http://localhost:11434' },
  },
};

describe('createProvider', () => {
  it('creates OpenAI provider', () => {
    const provider = createProvider('openai', config);
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.name).toBe('openai');
  });

  it('creates Vertex provider', () => {
    const provider = createProvider('vertex', config);
    expect(provider).toBeInstanceOf(VertexProvider);
    expect(provider.name).toBe('vertex');
  });

  it('creates Ollama provider', () => {
    const provider = createProvider('ollama', config);
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe('ollama');
  });

  it('throws for unknown provider', () => {
    expect(() => createProvider('claude', config)).toThrow('Unknown provider: claude');
  });
});

describe('resolveProviderName', () => {
  it('returns requested when provided', () => {
    expect(resolveProviderName('vertex', config)).toBe('vertex');
  });

  it('falls back to default_provider from config', () => {
    expect(resolveProviderName(undefined, config)).toBe('openai');
  });

  it('respects custom default_provider', () => {
    const customConfig = { ...config, default_provider: 'ollama' };
    expect(resolveProviderName(undefined, customConfig)).toBe('ollama');
  });
});
