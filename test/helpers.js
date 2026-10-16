import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../server/app.js';

// The server prefers the React build (web/dist) when it exists. The static-file tests here check the
// vanilla front end in public/, so they pin it; test/static.test.js covers the choice itself.
const PUBLIC = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'public');

/**
 * Starts the app on a random free port with an in-memory database.
 * No network calls leave the test process unless a test passes its own fetchImpl.
 */
export async function startTestServer(overrides = {}) {
  const server = createServer({
    dataFile: ':memory:',
    publicDir: PUBLIC,
    anthropicApiKey: '',
    rateLimitMax: 10_000,
    ...overrides,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const close = () =>
    new Promise((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
  return { base, server, close };
}

/** Sends a request and returns { status, data, headers, text }. */
export async function call(base, method, path, { body, raw, headers = {} } = {}) {
  const h = { ...headers };
  let payload;
  if (raw !== undefined) {
    payload = raw;
    h['content-type'] = h['content-type'] || 'application/json';
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    h['content-type'] = 'application/json';
  }
  const res = await fetch(base + path, { method, headers: h, body: payload });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { status: res.status, data, headers: res.headers, text };
}
