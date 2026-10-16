import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { call, startTestServer } from './helpers.js';

describe('body size limit', () => {
  let srv;
  before(async () => {
    srv = await startTestServer();
  });
  after(async () => {
    await srv.close();
  });

  test('a body over 8 KB returns 413 (declared length)', async () => {
    const big = JSON.stringify({ title: 'a'.repeat(9000) });
    const res = await call(srv.base, 'POST', '/api/tasks', { raw: big });
    assert.equal(res.status, 413);
    assert.equal(res.data.error, 'payload_too_large');
  });

  test('a streamed body over 8 KB returns 413 (no declared length)', async () => {
    const big = JSON.stringify({ title: 'a'.repeat(9000) });
    const chunks = [big.slice(0, 4000), big.slice(4000)];
    const stream = new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
        controller.close();
      },
    });
    const res = await fetch(`${srv.base}/api/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream,
      duplex: 'half',
    });
    assert.equal(res.status, 413);
  });

  test('a body under the limit still works', async () => {
    const res = await call(srv.base, 'POST', '/api/tasks', { body: { title: 'small' } });
    assert.equal(res.status, 201);
  });
});

describe('rate limit', () => {
  let srv;
  before(async () => {
    srv = await startTestServer({ rateLimitMax: 3 });
  });
  after(async () => {
    await srv.close();
  });

  test('returns 429 with Retry-After after the limit per IP', async () => {
    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await call(srv.base, 'GET', '/api/tasks');
      statuses.push(res.status);
      if (res.status === 429) {
        assert.ok(Number(res.headers.get('retry-after')) >= 1);
        assert.equal(res.data.error, 'rate_limited');
      }
    }
    assert.deepEqual(statuses, [200, 200, 200, 429]);
  });

  test('health checks are not rate limited', async () => {
    for (let i = 0; i < 5; i += 1) {
      const res = await call(srv.base, 'GET', '/health');
      assert.equal(res.status, 200);
    }
  });
});

describe('health and routing', () => {
  let srv;
  before(async () => {
    srv = await startTestServer();
  });
  after(async () => {
    await srv.close();
  });

  test('GET /health returns ok', async () => {
    const res = await call(srv.base, 'GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
  });

  test('unknown API routes return JSON 404', async () => {
    const res = await call(srv.base, 'GET', '/api/nope');
    assert.equal(res.status, 404);
    assert.equal(res.data.error, 'not_found');
  });

  test('path traversal in static paths is refused', async () => {
    const res = await call(srv.base, 'GET', '/%2e%2e/package.json');
    assert.equal(res.status, 404);
    const res2 = await call(srv.base, 'GET', '/..%2F..%2Fpackage.json');
    assert.equal(res2.status, 404);
  });
});
