import { describe, it, expect } from 'vitest';
import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('lowercases text', () => {
    expect(slugify('Auth Setup')).toBe('auth-setup');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('my cool manifest')).toBe('my-cool-manifest');
  });

  it('replaces underscores with hyphens', () => {
    expect(slugify('api_endpoints')).toBe('api-endpoints');
  });

  it('strips non-alphanumeric characters except hyphens', () => {
    expect(slugify('Auth0 (v2) Setup!')).toBe('auth0-v2-setup');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('foo--bar---baz')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('-hello-world-')).toBe('hello-world');
  });

  it('handles already-slugified input', () => {
    expect(slugify('auth-setup')).toBe('auth-setup');
  });
});
