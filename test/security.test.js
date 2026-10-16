import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { call, startTestServer } from './helpers.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('security headers', () => {
  let srv;
  before(async () => {
    srv = await startTestServer();
  });
  after(async () => {
    await srv.close();
  });

  test('CSP, nosniff and referrer policy are present on the front end', async () => {
    const res = await call(srv.base, 'GET', '/');
    assert.equal(res.status, 200);
    const csp = res.headers.get('content-security-policy');
    assert.ok(csp, 'Content-Security-Policy header missing');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /script-src 'self'/);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  });

  test('security headers are also present on API responses', async () => {
    const res = await call(srv.base, 'GET', '/api/tasks');
    assert.ok(res.headers.get('content-security-policy'));
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  test('static assets are served with the right content type', async () => {
    const css = await call(srv.base, 'GET', '/styles.css');
    assert.match(css.headers.get('content-type'), /text\/css/);
    const js = await call(srv.base, 'GET', '/js/app.js');
    assert.match(js.headers.get('content-type'), /text\/javascript/);
  });
});

describe('front end is CSP-compliant', () => {
  test('index.html has no inline <script> without src', async () => {
    const html = await readFile(path.join(ROOT, 'public', 'index.html'), 'utf8');
    const tags = html.match(/<script\b[^>]*>/gi) || [];
    assert.ok(tags.length > 0, 'expected at least one script tag');
    for (const tag of tags) {
      assert.match(tag, /\ssrc\s*=/i, `inline script found: ${tag}`);
    }
    const inlineBodies = html.match(/<script\b(?![^>]*\ssrc\s*=)[^>]*>[\s\S]*?<\/script>/gi) || [];
    assert.equal(inlineBodies.length, 0);
  });

  test('index.html has no inline event handlers or style attributes', async () => {
    const html = await readFile(path.join(ROOT, 'public', 'index.html'), 'utf8');
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
    assert.doesNotMatch(html, /\sstyle\s*=/i);
  });

  test('index.html declares Arabic RTL by default and has a skip link', async () => {
    const html = await readFile(path.join(ROOT, 'public', 'index.html'), 'utf8');
    assert.match(html, /<html lang="ar" dir="rtl"/);
    assert.match(html, /class="skip-link"/);
  });

  test('index.html includes both English and Arabic safety notices', async () => {
    const html = await readFile(path.join(ROOT, 'public', 'index.html'), 'utf8');
    assert.match(html, /<p lang="en"[^>]*>[\s\S]*not therapy/);
    assert.match(html, /<p lang="ar"[^>]*>[\s\S]*ليست علاجًا نفسيًا/);
  });
});
