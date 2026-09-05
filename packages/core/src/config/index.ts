import fs from 'node:fs';
import path from 'node:path';
import { ConfigError } from '../errors.js';
import type { CentrConfig } from '../types.js';

export const CENTR_DIR = '.centr';
export const CONFIG_FILE = 'config.json';

export const DEFAULT_CONFIG: CentrConfig = {
  database: { path: '.centr/centr.db' },
  ignore: {
    patterns: ['node_modules/**', 'dist/**', '.git/**'],
    secretPatterns: ['.env*', '*.pem'],
  },
  context: { maxTokens: 100000, defaultBudget: 80000 },
  search: { maxResults: 50, minRelevance: 0.5 },
  learning: { autoPromote: false, promotionThreshold: 0.8, minEvidence: 3 },
  brain: {
    enabled: false,
    provider: 'ollama',
    model: 'qwen2.5:1.5b',
    profile: 'minimal',
    endpoint: 'http://127.0.0.1:11434',
    timeoutMs: 10000,
    maxInputTokens: 2048,
    maxOutputTokens: 512,
    maxConcurrentRequests: 1,
  },
  logging: { level: 'info' },
};

export function initCentrDirectory(projectRoot: string): void {
  try {
    const dirPath = path.join(projectRoot, CENTR_DIR);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    throw new ConfigError(
      `Failed to initialize ${CENTR_DIR} directory`,
      error instanceof Error ? error : undefined,
    );
  }
}

export function loadConfig(projectRoot: string): CentrConfig {
  try {
    const configPath = path.join(projectRoot, CENTR_DIR, CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      return { ...DEFAULT_CONFIG };
    }
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const parsedConfig = JSON.parse(configContent);
    return { ...DEFAULT_CONFIG, ...parsedConfig };
  } catch (error) {
    throw new ConfigError('Failed to load config', error instanceof Error ? error : undefined);
  }
}

export function saveConfig(projectRoot: string, config: CentrConfig): void {
  try {
    initCentrDirectory(projectRoot);
    const configPath = path.join(projectRoot, CENTR_DIR, CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    throw new ConfigError('Failed to save config', error instanceof Error ? error : undefined);
  }
}
