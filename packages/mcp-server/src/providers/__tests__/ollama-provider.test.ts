import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '../ollama-provider.js';

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('isAvailable always returns true', () => {
    const provider = new OllamaProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  it('calls fetch with correct URL and body', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: { content: 'Ollama says hello' },
          model: 'llama3.1',
          eval_count: 50,
          prompt_eval_count: 30,
        }),
        { status: 200 }
      )
    );

    const provider = new OllamaProvider({ model: 'llama3.1', host: 'http://localhost:11434' });
    const result = await provider.call('Hello local LLM');

    expect(result.response).toBe('Ollama says hello');
    expect(result.model).toBe('llama3.1');
    expect(result.tokens_used).toBe(80);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"model":"llama3.1"'),
      })
    );
  });

  it('uses custom host from config', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: { content: 'ok' }, model: 'phi' }),
        { status: 200 }
      )
    );

    const provider = new OllamaProvider({ model: 'phi', host: 'http://192.168.1.100:11434' });
    await provider.call('test');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://192.168.1.100:11434/api/chat',
      expect.anything()
    );
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('model not found', { status: 404 })
    );

    const provider = new OllamaProvider();
    await expect(provider.call('test')).rejects.toThrow('Ollama returned 404');
  });

  it('handles missing token counts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: { content: 'response' }, model: 'llama3.1' }),
        { status: 200 }
      )
    );

    const provider = new OllamaProvider();
    const result = await provider.call('test');
    expect(result.tokens_used).toBeUndefined();
  });
});
