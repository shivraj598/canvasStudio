import { loadConfig, type AppConfig } from '../config.js';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return { ...loadConfig({ NODE_ENV: 'test' }), ...overrides };
}
