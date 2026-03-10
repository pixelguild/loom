import type { PeerProvider, PeerResponse } from './types.js';
import type { OllamaProviderConfig } from '../config/types.js';

interface OllamaChatResponse {
  message: { content: string };
  model: string;
  eval_count?: number;
  prompt_eval_count?: number;
}

export class OllamaProvider implements PeerProvider {
  readonly name = 'ollama';
  private readonly model: string;
  private readonly host: string;

  constructor(config?: OllamaProviderConfig) {
    this.model = config?.model ?? 'llama3.1';
    this.host = config?.host ?? 'http://localhost:11434';
  }

  isAvailable(): boolean {
    return true;
  }

  async call(prompt: string): Promise<PeerResponse> {
    const url = `${this.host}/api/chat`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama returned ${res.status}: ${body}`);
    }

    const data = (await res.json()) as OllamaChatResponse;

    return {
      response: data.message.content,
      model: data.model,
      tokens_used:
        data.eval_count !== undefined && data.prompt_eval_count !== undefined
          ? data.eval_count + data.prompt_eval_count
          : undefined,
    };
  }
}
