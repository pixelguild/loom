import { describe, it, expect, vi } from 'vitest';
import { VertexProvider } from '../vertex-provider.js';

const mockGenerateContent = vi.fn();

vi.mock('@google-cloud/vertexai', () => ({
  VertexAI: class MockVertexAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

describe('VertexProvider', () => {
  it('isAvailable returns true when project is set', () => {
    const provider = new VertexProvider({ model: 'gemini-2.0-flash', project: 'my-proj', location: 'us-central1' });
    expect(provider.isAvailable()).toBe(true);
  });

  it('isAvailable returns false when project is empty', () => {
    const provider = new VertexProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  it('calls generateContent and extracts text', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        candidates: [{ content: { parts: [{ text: 'Gemini response' }] } }],
        usageMetadata: { totalTokenCount: 200 },
      },
    });

    const provider = new VertexProvider({ model: 'gemini-2.0-flash', project: 'test-proj', location: 'us-east1' });
    const result = await provider.call('Hello Gemini');

    expect(result.response).toBe('Gemini response');
    expect(result.model).toBe('gemini-2.0-flash');
    expect(result.tokens_used).toBe(200);
  });

  it('handles empty response candidates', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { candidates: [], usageMetadata: {} },
    });

    const provider = new VertexProvider({ model: 'gemini-2.0-flash', project: 'test', location: 'us-central1' });
    const result = await provider.call('test');
    expect(result.response).toBe('');
  });

  it('propagates API errors', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Vertex auth failed'));

    const provider = new VertexProvider({ model: 'gemini-2.0-flash', project: 'test', location: 'us-central1' });
    await expect(provider.call('test')).rejects.toThrow('Vertex auth failed');
  });
});
