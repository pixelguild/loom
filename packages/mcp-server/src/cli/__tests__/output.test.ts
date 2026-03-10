import { describe, it, expect } from 'vitest';
import { formatCreated, formatSkipped, formatWarning, formatError, stripAnsi } from '../output.js';

describe('output helpers', () => {
  it('formatCreated includes message', () => {
    expect(stripAnsi(formatCreated('docs/loom/'))).toBe('  + created docs/loom/');
  });

  it('formatSkipped includes message', () => {
    expect(stripAnsi(formatSkipped('docs/loom/ already exists'))).toBe('  - skipped docs/loom/ already exists');
  });

  it('formatWarning includes message', () => {
    expect(stripAnsi(formatWarning('claude not found on PATH'))).toBe('  ! warning claude not found on PATH');
  });

  it('formatError includes message', () => {
    expect(stripAnsi(formatError('something broke'))).toBe('  x error something broke');
  });
});
