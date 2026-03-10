import OpenAI from 'openai';
import type { PeerProvider, PeerResponse } from './types.js';
import type { OpenAIProviderConfig } from '../config/types.js';

export class OpenAIProvider implements PeerProvider {
  readonly name = 'openai';
  private readonly model: string;

  constructor(config?: OpenAIProviderConfig) {
    this.model = config?.model ?? 'gpt-4o';
  }

  isAvailable(): boolean {
    const key = process.env['LOOM_OPENAI_API_KEY'];
    return typeof key === 'string' && key.length > 0;
  }

  async call(prompt: string): Promise<PeerResponse> {
    const client = new OpenAI({ apiKey: process.env['LOOM_OPENAI_API_KEY'] });
    const response = await client.responses.create({
      model: this.model,
      input: prompt,
    });

    return {
      response: response.output_text,
      model: this.model,
      tokens_used: response.usage?.total_tokens,
    };
  }
}
