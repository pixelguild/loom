import type { PeerProvider } from './types.js';
import type { LoomConfig } from '../config/types.js';
import { OpenAIProvider } from './openai-provider.js';
import { VertexProvider } from './vertex-provider.js';
import { OllamaProvider } from './ollama-provider.js';

export function createProvider(name: string, config: LoomConfig): PeerProvider {
  switch (name) {
    case 'openai':
      return new OpenAIProvider(config.providers.openai);
    case 'vertex':
      return new VertexProvider(config.providers.vertex);
    case 'ollama':
      return new OllamaProvider(config.providers.ollama);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export function resolveProviderName(
  requested: string | undefined,
  config: LoomConfig
): string {
  return requested ?? config.default_provider;
}
