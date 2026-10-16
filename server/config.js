import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Reads runtime configuration from environment variables.
 * Nothing here logs or prints values.
 */
export function loadConfig(env = process.env) {
  const port = Number.parseInt(env.PORT ?? '', 10);
  return {
    root: ROOT,
    publicDir: path.join(ROOT, 'public'),
    port: Number.isInteger(port) && port >= 0 ? port : 3000,
    dataFile: env.DATA_FILE || path.join(ROOT, 'data', 'calm-plan.db'),
    anthropicApiKey: env.ANTHROPIC_API_KEY || '',
    chatModel: env.CHAT_MODEL || 'claude-haiku-5-5',
    // Only enable when running behind a reverse proxy that sets X-Forwarded-For.
    trustProxy: env.TRUST_PROXY === '1',
    maxBodyBytes: 8 * 1024,
    maxMessageChars: 1000,
    rateLimitWindowMs: 60_000,
    rateLimitMax: 120,
  };
}
