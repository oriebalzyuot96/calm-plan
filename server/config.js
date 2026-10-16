import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Folder with the front end. The React build in web/dist is used when it exists
 * (npm run build); otherwise the server falls back to the vanilla front end in public/.
 */
export function resolvePublicDir(root = ROOT, exists = existsSync) {
  const built = path.join(root, 'web', 'dist');
  return exists(path.join(built, 'index.html')) ? built : path.join(root, 'public');
}

/**
 * Reads runtime configuration from environment variables.
 * Nothing here logs or prints values.
 */
export function loadConfig(env = process.env) {
  const port = Number.parseInt(env.PORT ?? '', 10);
  return {
    root: ROOT,
    publicDir: resolvePublicDir(),
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
