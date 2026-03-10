import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigLoader, DEFAULT_CONFIG } from '../config-loader.js';

describe('ConfigLoader', () => {
  let tmpDir: string;
  let homeDir: string;
  let projectRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-config-test-'));
    homeDir = path.join(tmpDir, 'home');
    projectRoot = path.join(tmpDir, 'project');
    fs.mkdirSync(path.join(homeDir, '.loom'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, 'docs', 'loom'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns defaults when no config files exist', () => {
    const loader = new ConfigLoader(projectRoot, homeDir);
    const config = loader.load();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('loads global config only', () => {
    fs.writeFileSync(
      path.join(homeDir, '.loom', 'config.json'),
      JSON.stringify({
        default_provider: 'vertex',
        providers: {
          vertex: { model: 'gemini-2.0-flash', project: 'my-proj', location: 'us-central1' },
        },
      })
    );

    const loader = new ConfigLoader(projectRoot, homeDir);
    const config = loader.load();
    expect(config.default_provider).toBe('vertex');
    expect(config.providers.vertex?.model).toBe('gemini-2.0-flash');
    expect(config.archive_thresholds).toEqual(DEFAULT_CONFIG.archive_thresholds);
  });

  it('loads per-project config only', () => {
    fs.writeFileSync(
      path.join(projectRoot, 'docs', 'loom', 'loom.config.json'),
      JSON.stringify({
        archive_thresholds: { warning: 40_000, archive: 50_000 },
      })
    );

    const loader = new ConfigLoader(projectRoot, homeDir);
    const config = loader.load();
    expect(config.archive_thresholds.warning).toBe(40_000);
    expect(config.archive_thresholds.archive).toBe(50_000);
    expect(config.default_provider).toBe('openai');
  });

  it('merges global and per-project config (per-project wins)', () => {
    fs.writeFileSync(
      path.join(homeDir, '.loom', 'config.json'),
      JSON.stringify({
        default_provider: 'vertex',
        archive_thresholds: { warning: 50_000, archive: 70_000 },
      })
    );
    fs.writeFileSync(
      path.join(projectRoot, 'docs', 'loom', 'loom.config.json'),
      JSON.stringify({
        archive_thresholds: { warning: 30_000 },
      })
    );

    const loader = new ConfigLoader(projectRoot, homeDir);
    const config = loader.load();
    expect(config.default_provider).toBe('vertex');
    expect(config.archive_thresholds.warning).toBe(30_000);
    // archive from global overrides default, but project only overrides warning
    expect(config.archive_thresholds.archive).toBe(70_000);
  });

  it('handles invalid JSON gracefully', () => {
    fs.writeFileSync(
      path.join(homeDir, '.loom', 'config.json'),
      'not valid json {'
    );

    const loader = new ConfigLoader(projectRoot, homeDir);
    const config = loader.load();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('handles missing directories gracefully', () => {
    const nonexistent = path.join(tmpDir, 'does-not-exist');
    const loader = new ConfigLoader(nonexistent, path.join(tmpDir, 'no-home'));
    const config = loader.load();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('merges peer_consultation settings', () => {
    fs.writeFileSync(
      path.join(projectRoot, 'docs', 'loom', 'loom.config.json'),
      JSON.stringify({
        peer_consultation: { enabled: false },
      })
    );

    const loader = new ConfigLoader(projectRoot, homeDir);
    const config = loader.load();
    expect(config.peer_consultation.enabled).toBe(false);
    expect(config.peer_consultation.allowed_providers).toEqual(
      DEFAULT_CONFIG.peer_consultation.allowed_providers
    );
  });

  it('partial archive_thresholds merge preserves other fields', () => {
    fs.writeFileSync(
      path.join(projectRoot, 'docs', 'loom', 'loom.config.json'),
      JSON.stringify({
        archive_thresholds: { archive: 100_000 },
      })
    );

    const loader = new ConfigLoader(projectRoot, homeDir);
    const config = loader.load();
    expect(config.archive_thresholds.warning).toBe(60_000);
    expect(config.archive_thresholds.archive).toBe(100_000);
  });
});
