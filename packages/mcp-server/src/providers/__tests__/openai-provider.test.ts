import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from '../openai-provider.js';

vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: class MockOpenAI {
      responses = { create: mockCreate };
    },
    __mockCreate: mockCreate,
  };
});

async function getMockCreate(): Promise<ReturnType<typeof vi.fn>> {
  const mod = await import('openai');
  return (mod as unknown as { __mockCreate: ReturnType<typeof vi.fn> }).__mockCreate;
}

describe('OpenAIProvider', () => {
  const originalEnv = process.env['LOOM_OPENAI_API_KEY'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['LOOM_OPENAI_API_KEY'] = originalEnv;
    } else {
      delete process.env['LOOM_OPENAI_API_KEY'];
    }
  });

  it('isAvailable returns true when API key is set', () => {
    process.env['LOOM_OPENAI_API_KEY'] = 'sk-test-key';
    const provider = new OpenAIProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  it('isAvailable returns false when API key is missing', () => {
    delete process.env['LOOM_OPENAI_API_KEY'];
    const provider = new OpenAIProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  it('isAvailable returns false when API key is empty', () => {
    process.env['LOOM_OPENAI_API_KEY'] = '';
    const provider = new OpenAIProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  it('calls responses.create with correct params', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValueOnce({
      output_text: 'The answer is 42',
      usage: { total_tokens: 150 },
    });

    process.env['LOOM_OPENAI_API_KEY'] = 'sk-test';
    const provider = new OpenAIProvider({ model: 'gpt-4o-mini' });
    const result = await provider.call('What is the meaning of life?');

    expect(result.response).toBe('The answer is 42');
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.tokens_used).toBe(150);
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-4o-mini',
      input: 'What is the meaning of life?',
    });
  });

  it('defaults model to gpt-4o', () => {
    const provider = new OpenAIProvider();
    expect(provider.name).toBe('openai');
  });

  it('propagates API errors', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

    process.env['LOOM_OPENAI_API_KEY'] = 'sk-test';
    const provider = new OpenAIProvider();
    await expect(provider.call('test')).rejects.toThrow('API rate limit exceeded');
  });
});
