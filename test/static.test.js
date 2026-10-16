// Which front end the server serves: the React build (web/dist) when present, else public/.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolvePublicDir } from '../server/config.js';
import { call, startTestServer } from './helpers.js';

describe('front end folder', () => {
  test('uses web/dist when its index.html exists', () => {
    const root = path.join('x', 'app');
    const exists = (p) => p === path.join(root, 'web', 'dist', 'index.html');
    assert.equal(resolvePublicDir(root, exists), path.join(root, 'web', 'dist'));
  });

  test('falls back to public/ when web/dist is missing', () => {
    const root = path.join('x', 'app');
    assert.equal(resolvePublicDir(root, () => false), path.join(root, 'public'));
  });
});

describe('serving a built front end', () => {
  let dir;
  let srv;
  before(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'calm-plan-web-'));
    await mkdir(path.join(dir, 'assets'));
    await writeFile(path.join(dir, 'index.html'), '<!doctype html><html lang="ar" dir="rtl"><script type="module" src="/assets/app.js"></script></html>');
    await writeFile(path.join(dir, 'assets', 'app.js'), 'export {};');
    await writeFile(path.join(dir, 'assets', 'font.woff2'), 'x');
    srv = await startTestServer({ publicDir: dir });
  });
  after(async () => {
    await srv.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('serves index.html, hashed assets and fonts with CSP headers', async () => {
    const home = await call(srv.base, 'GET', '/');
    assert.equal(home.status, 200);
    assert.match(home.text, /assets\/app\.js/);
    assert.match(home.headers.get('content-security-policy'), /script-src 'self'/);
    const js = await call(srv.base, 'GET', '/assets/app.js');
    assert.match(js.headers.get('content-type'), /text\/javascript/);
    const font = await call(srv.base, 'GET', '/assets/font.woff2');
    assert.equal(font.headers.get('content-type'), 'font/woff2');
  });

  test('the API is unchanged', async () => {
    const res = await call(srv.base, 'GET', '/api/tasks');
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { tasks: [] });
    assert.equal((await call(srv.base, 'GET', '/health')).status, 200);
  });

  test('paths outside the folder are refused', async () => {
    const res = await call(srv.base, 'GET', '/../package.json');
    assert.notEqual(res.status, 200);
  });
});
