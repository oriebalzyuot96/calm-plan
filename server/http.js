import { readFile } from 'node:fs/promises';
import path from 'node:path';

export class HttpError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function securityHeaders() {
  return {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
      "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; " +
      "form-action 'self'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

export function sendJson(res, status, body, headers = {}) {
  const payload = status === 204 || body === undefined ? '' : JSON.stringify(body);
  const extra = status === 413 ? { Connection: 'close' } : {};
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    ...extra,
    ...headers,
  });
  res.end(payload);
}

const HARD_DRAIN_LIMIT = 1024 * 1024;

/**
 * Reads and parses a JSON request body with a hard size limit.
 * Oversized bodies are rejected with 413 without buffering them.
 */
export function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > limit) {
      req.resume();
      reject(new HttpError(413, 'payload_too_large'));
      return;
    }
    const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/json') {
      req.resume();
      reject(new HttpError(415, 'unsupported_media_type'));
      return;
    }

    const chunks = [];
    let size = 0;
    let rejected = false;
    req.on('data', (chunk) => {
      if (rejected) {
        // Keep draining briefly so the 413 response reaches the client,
        // but stop reading entirely once the drain cap is hit.
        size += chunk.length;
        if (size > HARD_DRAIN_LIMIT) req.destroy();
        return;
      }
      size += chunk.length;
      if (size > limit) {
        rejected = true;
        reject(new HttpError(413, 'payload_too_large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text.trim() ? JSON.parse(text) : {});
      } catch {
        reject(new HttpError(400, 'invalid_json'));
      }
    });
    req.on('error', () => reject(new HttpError(400, 'bad_request')));
  });
}

export function createRateLimiter({ windowMs, max, now = () => Date.now() }) {
  const hits = new Map();
  return {
    check(key) {
      const t = now();
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (t >= v.resetAt) hits.delete(k);
      }
      let entry = hits.get(key);
      if (!entry || t >= entry.resetAt) {
        entry = { count: 0, resetAt: t + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      return {
        allowed: entry.count <= max,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - t) / 1000)),
      };
    },
  };
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

export async function serveStatic(req, res, pathname, publicDir, headers) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'method_not_allowed' }, { Allow: 'GET, HEAD' });
    return;
  }
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    sendJson(res, 400, { error: 'bad_request' });
    return;
  }
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(publicDir, rel));
  if (!file.startsWith(publicDir + path.sep)) {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-cache',
      ...headers,
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    sendJson(res, 404, { error: 'not_found' });
  }
}
