import { VertexAI } from '@google-cloud/vertexai';
import type { PeerProvider, PeerResponse } from './types.js';
import type { VertexProviderConfig } from '../config/types.js';

export class VertexProvider implements PeerProvider {
  readonly name = 'vertex';
  private readonly model: string;
  private readonly project: string;
  private readonly location: string;

  constructor(config?: VertexProviderConfig) {
    this.model = config?.model ?? 'gemini-2.0-flash';
    this.project = config?.project ?? '';
    this.location = config?.location ?? 'us-central1';
  }

  isAvailable(): boolean {
    return this.project.length > 0;
  }

  async call(prompt: string): Promise<PeerResponse> {
    const vertexAI = new VertexAI({
      project: this.project,
      location: this.location,
    });

    const generativeModel = vertexAI.getGenerativeModel({ model: this.model });
    const result = await generativeModel.generateContent(prompt);
    const response = result.response;

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const tokensUsed = response.usageMetadata?.totalTokenCount;

    return {
      response: text,
      model: this.model,
      tokens_used: tokensUsed,
    };
  }
}
