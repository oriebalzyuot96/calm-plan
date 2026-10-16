import http from 'node:http';
import { respondToChat } from './chat/index.js';
import { loadConfig } from './config.js';
import { HttpError, createRateLimiter, readJson, securityHeaders, sendJson, serveStatic } from './http.js';
import { openStore } from './store.js';
import { crisisGuidance, detectCrisis } from './chat/crisis.js';
import { parseChat, parseLang, parseMood, parseTaskCreate, parseTaskPatch } from './validate.js';

const TASK_ID_RE = /^[0-9a-f-]{36}$/;

/**
 * Creates the HTTP server. Options override values from environment
 * variables (see config.js). Tests pass dataFile ':memory:' and a fetchImpl.
 */
export function createServer(overrides = {}) {
  const config = { ...loadConfig(), ...overrides };
  const store = openStore(config.dataFile);
  const limiter = createRateLimiter({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax });
  const fetchImpl = overrides.fetchImpl || globalThis.fetch;
  const headers = securityHeaders();

  const server = http.createServer((req, res) => {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    handle(req, res, { config, store, limiter, fetchImpl }).catch((err) => {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: err.code, ...err.extra });
        return;
      }
      // Log the error type only. Never log request contents.
      console.error('internal_error', err && err.name);
      if (!res.headersSent) sendJson(res, 500, { error: 'internal_error' });
    });
  });
  server.on('close', () => store.close());
  return server;
}

function clientIp(req, config) {
  if (config.trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || 'unknown';
}

async function handle(req, res, deps) {
  const { config } = deps;
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  if (pathname === '/health') {
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method_not_allowed');
    sendJson(res, 200, { ok: true, service: 'calm-plan', time: new Date().toISOString() });
    return;
  }

  if (pathname.startsWith('/api/') || pathname === '/api') {
    const limit = deps.limiter.check(clientIp(req, config));
    if (!limit.allowed) {
      sendJson(res, 429, { error: 'rate_limited' }, { 'Retry-After': String(limit.retryAfterSeconds) });
      return;
    }
    await routeApi(req, res, url, deps);
    return;
  }

  await serveStatic(req, res, pathname, config.publicDir, securityHeaders());
}

function notFound() {
  return new HttpError(404, 'not_found');
}

function methodNotAllowed(allow) {
  const err = new HttpError(405, 'method_not_allowed');
  err.extra = { allow };
  return err;
}

async function routeApi(req, res, url, deps) {
  const { store, config, fetchImpl } = deps;
  const { pathname } = url;
  const method = req.method;

  // /api/tasks
  if (pathname === '/api/tasks') {
    if (method === 'GET') return sendJson(res, 200, { tasks: store.listTasks() });
    if (method === 'POST') {
      const input = parseTaskCreate(await readJson(req, config.maxBodyBytes));
      return sendJson(res, 201, { task: store.createTask(input) });
    }
    throw methodNotAllowed('GET, POST');
  }

  // /api/tasks/:id
  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const id = decodeURIComponent(taskMatch[1]);
    if (method !== 'PATCH' && method !== 'DELETE') throw methodNotAllowed('PATCH, DELETE');
    if (!TASK_ID_RE.test(id) || !store.getTask(id)) throw notFound();
    if (method === 'DELETE') {
      store.deleteTask(id);
      return sendJson(res, 204, undefined);
    }
    const patch = parseTaskPatch(await readJson(req, config.maxBodyBytes));
    return sendJson(res, 200, { task: store.updateTask(id, patch) });
  }

  // /api/moods
  if (pathname === '/api/moods') {
    if (method === 'GET') {
      const days = Number.parseInt(url.searchParams.get('days') ?? '30', 10);
      const safeDays = Number.isInteger(days) && days >= 1 && days <= 365 ? days : 30;
      const since = new Date(Date.now() - safeDays * 86_400_000).toISOString();
      return sendJson(res, 200, { moods: store.listMoodsSince(since) });
    }
    if (method === 'POST') {
      const input = parseMood(await readJson(req, config.maxBodyBytes));
      const mood = store.createMood(input);
      const crisis = detectCrisis(input.note) ? crisisGuidance(input.lang) : null;
      return sendJson(res, 201, { mood, crisis });
    }
    throw methodNotAllowed('GET, POST');
  }

  // /api/data: erase everything. Requires an explicit header, which also
  // blocks cross-site form posts.
  if (pathname === '/api/data') {
    if (method !== 'DELETE') throw methodNotAllowed('DELETE');
    if (req.headers['x-confirm-erase'] !== 'yes') {
      throw new HttpError(400, 'confirmation_required', { header: 'X-Confirm-Erase: yes' });
    }
    store.eraseAll();
    return sendJson(res, 200, { ok: true, erased: true });
  }

  // /api/chat
  if (pathname === '/api/chat') {
    if (method !== 'POST') throw methodNotAllowed('POST');
    const { messages, lang } = parseChat(await readJson(req, config.maxBodyBytes), {
      maxMessageChars: config.maxMessageChars,
    });
    const result = await respondToChat({
      messages,
      lang: parseLang(lang),
      apiKey: config.anthropicApiKey,
      model: config.chatModel,
      fetchImpl,
      getContext: () => ({
        moods: store.recentMoods(14),
        openTasks: store.openTasks(),
      }),
    });
    return sendJson(res, 200, result);
  }

  throw notFound();
}
