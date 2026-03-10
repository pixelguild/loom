import { DEFAULT_CONFIG } from '../config/config-loader.js';
import type { LoomConfig } from '../config/types.js';

export function testConfig(overrides?: Partial<LoomConfig>): LoomConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
