import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { call, startTestServer } from './helpers.js';

describe('erase all data endpoint', () => {
  let srv;
  before(async () => {
    srv = await startTestServer();
  });
  after(async () => {
    await srv.close();
  });

  test('refuses without the confirmation header and keeps data', async () => {
    await call(srv.base, 'POST', '/api/tasks', { body: { title: 'Keep me' } });
    await call(srv.base, 'POST', '/api/moods', { body: { score: 3 } });

    const res = await call(srv.base, 'DELETE', '/api/data');
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'confirmation_required');

    const tasks = await call(srv.base, 'GET', '/api/tasks');
    assert.ok(tasks.data.tasks.some((t) => t.title === 'Keep me'));
  });

  test('erases tasks and moods when confirmed', async () => {
    const res = await call(srv.base, 'DELETE', '/api/data', { headers: { 'X-Confirm-Erase': 'yes' } });
    assert.equal(res.status, 200);
    assert.equal(res.data.erased, true);

    const tasks = await call(srv.base, 'GET', '/api/tasks');
    const moods = await call(srv.base, 'GET', '/api/moods?days=365');
    assert.deepEqual(tasks.data.tasks, []);
    assert.deepEqual(moods.data.moods, []);
  });

  test('only DELETE is allowed on /api/data', async () => {
    const res = await call(srv.base, 'GET', '/api/data');
    assert.equal(res.status, 405);
  });
});
