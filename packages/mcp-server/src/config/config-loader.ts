import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {
  LoomConfig,
  ArchiveThresholdsConfig,
  PeerConsultationConfig,
  ProvidersConfig,
} from './types.js';

export const DEFAULT_CONFIG: LoomConfig = {
  default_provider: 'openai',
  providers: {},
  archive_thresholds: {
    warning: 60_000,
    archive: 80_000,
  },
  peer_consultation: {
    enabled: true,
    allowed_providers: ['openai', 'vertex', 'ollama'],
  },
};

interface RawConfig {
  default_provider?: string;
  providers?: Partial<ProvidersConfig>;
  archive_thresholds?: Partial<ArchiveThresholdsConfig>;
  peer_consultation?: Partial<PeerConsultationConfig>;
}

function readJsonFile(filePath: string): RawConfig | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as RawConfig;
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error(`Warning: failed to parse config at ${filePath}:`, err);
    return null;
  }
}

function mergeConfig(base: LoomConfig, overlay: RawConfig): LoomConfig {
  return {
    default_provider: overlay.default_provider ?? base.default_provider,
    providers: overlay.providers
      ? { ...base.providers, ...overlay.providers }
      : base.providers,
    archive_thresholds: overlay.archive_thresholds
      ? { ...base.archive_thresholds, ...overlay.archive_thresholds }
      : base.archive_thresholds,
    peer_consultation: overlay.peer_consultation
      ? { ...base.peer_consultation, ...overlay.peer_consultation }
      : base.peer_consultation,
  };
}

export class ConfigLoader {
  private readonly globalPath: string;
  private readonly projectPath: string;

  constructor(projectRoot: string, homedir?: string) {
    const home = homedir ?? os.homedir();
    this.globalPath = path.join(home, '.loom', 'config.json');
    this.projectPath = path.join(projectRoot, 'docs', 'loom', 'loom.config.json');
  }

  load(): LoomConfig {
    let config = { ...DEFAULT_CONFIG };

    const globalRaw = readJsonFile(this.globalPath);
    if (globalRaw) {
      config = mergeConfig(config, globalRaw);
    }

    const projectRaw = readJsonFile(this.projectPath);
    if (projectRaw) {
      config = mergeConfig(config, projectRaw);
    }

    return config;
  }
}
