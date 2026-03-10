import { describe, it, expect } from 'vitest';
import { countTokens } from '../tokens.js';

describe('countTokens', () => {
  it('returns 0 for empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('returns a positive number for non-empty text', () => {
    const count = countTokens('Hello, world! This is a test of token counting.');
    expect(count).toBeGreaterThan(0);
  });

  it('returns more tokens for longer text', () => {
    const short = countTokens('Hello');
    const long = countTokens('Hello, world! This is a much longer sentence with many more tokens.');
    expect(long).toBeGreaterThan(short);
  });

  it('handles markdown content', () => {
    const md = '# Header\n\n## Subheader\n\n- Item 1\n- Item 2\n\n```typescript\nconst x = 1;\n```';
    const count = countTokens(md);
    expect(count).toBeGreaterThan(0);
  });
});
