import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { call, startTestServer } from './helpers.js';

describe('mood API', () => {
  let srv;
  before(async () => {
    srv = await startTestServer();
  });
  after(async () => {
    await srv.close();
  });

  test('saves a mood check-in with server time and no crisis flag', async () => {
    const res = await call(srv.base, 'POST', '/api/moods', { body: { score: 4, note: 'Calm morning' } });
    assert.equal(res.status, 201);
    assert.equal(res.data.mood.score, 4);
    assert.equal(res.data.mood.note, 'Calm morning');
    assert.ok(!Number.isNaN(Date.parse(res.data.mood.createdAt)));
    assert.equal(res.data.crisis, null);
  });

  test('accepts a mood without a note', async () => {
    const res = await call(srv.base, 'POST', '/api/moods', { body: { score: 1 } });
    assert.equal(res.status, 201);
    assert.equal(res.data.mood.note, '');
  });

  test('rejects scores outside 1 to 5 and non-integers', async () => {
    for (const score of [0, 6, 2.5, '3', null]) {
      const res = await call(srv.base, 'POST', '/api/moods', { body: { score } });
      assert.equal(res.status, 400, `score ${String(score)} should be rejected`);
      assert.equal(res.data.field, 'score');
    }
  });

  test('rejects a note over 500 characters', async () => {
    const res = await call(srv.base, 'POST', '/api/moods', { body: { score: 3, note: 'n'.repeat(501) } });
    assert.equal(res.status, 400);
    assert.equal(res.data.field, 'note');
  });

  test('rejects an invalid createdAt', async () => {
    const res = await call(srv.base, 'POST', '/api/moods', { body: { score: 3, createdAt: 'yesterday' } });
    assert.equal(res.status, 400);
    assert.equal(res.data.field, 'createdAt');
  });

  test('lists moods within the requested window only', async () => {
    const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
    await call(srv.base, 'POST', '/api/moods', { body: { score: 2, note: 'old', createdAt: old } });
    await call(srv.base, 'POST', '/api/moods', { body: { score: 5, note: 'recent' } });

    const recent = await call(srv.base, 'GET', '/api/moods?days=14');
    assert.equal(recent.status, 200);
    const notes = recent.data.moods.map((m) => m.note);
    assert.ok(notes.includes('recent'));
    assert.ok(!notes.includes('old'));

    const wide = await call(srv.base, 'GET', '/api/moods?days=60');
    assert.ok(wide.data.moods.some((m) => m.note === 'old'));
  });

  test('a crisis phrase in the mood note returns crisis guidance', async () => {
    const res = await call(srv.base, 'POST', '/api/moods', {
      body: { score: 1, note: 'I want to kill myself', lang: 'en' },
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.crisis, 'crisis guidance should be returned');
    assert.ok(Array.isArray(res.data.crisis.steps));
    assert.ok(res.data.crisis.steps.length >= 3);
  });

  test('crisis guidance follows the requested language', async () => {
    const res = await call(srv.base, 'POST', '/api/moods', {
      body: { score: 1, note: 'أفكر في الانتحار', lang: 'ar' },
    });
    assert.ok(res.data.crisis);
    assert.match(res.data.crisis.title, /[؀-ۿ]/);
  });
});
