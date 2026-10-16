import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { call, startTestServer } from './helpers.js';

describe('task API', () => {
  let srv;
  before(async () => {
    srv = await startTestServer();
  });
  after(async () => {
    await srv.close();
  });

  test('creates a task with defaults and trims the title', async () => {
    const res = await call(srv.base, 'POST', '/api/tasks', { body: { title: '  Drink water  ' } });
    assert.equal(res.status, 201);
    assert.equal(res.data.task.title, 'Drink water');
    assert.equal(res.data.task.done, false);
    assert.equal(res.data.task.category, 'task');
    assert.equal(res.data.task.dueDate, null);
    assert.match(res.data.task.id, /^[0-9a-f-]{36}$/);
  });

  test('creates a habit with a due date', async () => {
    const res = await call(srv.base, 'POST', '/api/tasks', {
      body: { title: 'Walk 10 minutes', category: 'habit', dueDate: '2026-10-20' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.task.category, 'habit');
    assert.equal(res.data.task.dueDate, '2026-10-20');
  });

  test('lists tasks in position order', async () => {
    const res = await call(srv.base, 'GET', '/api/tasks');
    assert.equal(res.status, 200);
    const positions = res.data.tasks.map((t) => t.position);
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
    assert.ok(res.data.tasks.length >= 2);
  });

  test('PATCH marks done and swaps positions', async () => {
    const list = (await call(srv.base, 'GET', '/api/tasks')).data.tasks;
    const [a, b] = list;
    const done = await call(srv.base, 'PATCH', `/api/tasks/${a.id}`, { body: { done: true } });
    assert.equal(done.status, 200);
    assert.equal(done.data.task.done, true);

    const swapA = await call(srv.base, 'PATCH', `/api/tasks/${a.id}`, { body: { position: b.position } });
    const swapB = await call(srv.base, 'PATCH', `/api/tasks/${b.id}`, { body: { position: a.position } });
    assert.equal(swapA.data.task.position, b.position);
    assert.equal(swapB.data.task.position, a.position);
  });

  test('PATCH can change title, category and due date', async () => {
    const created = await call(srv.base, 'POST', '/api/tasks', { body: { title: 'Old' } });
    const id = created.data.task.id;
    const res = await call(srv.base, 'PATCH', `/api/tasks/${id}`, {
      body: { title: 'New', category: 'habit', dueDate: null },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.task.title, 'New');
    assert.equal(res.data.task.category, 'habit');
    assert.equal(res.data.task.dueDate, null);
  });

  test('rejects an empty title', async () => {
    const res = await call(srv.base, 'POST', '/api/tasks', { body: { title: '   ' } });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'validation_failed');
    assert.equal(res.data.field, 'title');
  });

  test('rejects a title over 200 characters', async () => {
    const res = await call(srv.base, 'POST', '/api/tasks', { body: { title: 'a'.repeat(201) } });
    assert.equal(res.status, 400);
    assert.equal(res.data.field, 'title');
  });

  test('rejects an unknown category', async () => {
    const res = await call(srv.base, 'POST', '/api/tasks', { body: { title: 'x', category: 'chore' } });
    assert.equal(res.status, 400);
    assert.equal(res.data.field, 'category');
  });

  test('rejects impossible dates and bad formats', async () => {
    const impossible = await call(srv.base, 'POST', '/api/tasks', { body: { title: 'x', dueDate: '2026-02-30' } });
    assert.equal(impossible.status, 400);
    assert.equal(impossible.data.field, 'dueDate');
    const badFormat = await call(srv.base, 'POST', '/api/tasks', { body: { title: 'x', dueDate: '20/10/2026' } });
    assert.equal(badFormat.status, 400);
  });

  test('rejects non-boolean done and empty PATCH bodies', async () => {
    const created = await call(srv.base, 'POST', '/api/tasks', { body: { title: 'T' } });
    const id = created.data.task.id;
    const badDone = await call(srv.base, 'PATCH', `/api/tasks/${id}`, { body: { done: 'yes' } });
    assert.equal(badDone.status, 400);
    const empty = await call(srv.base, 'PATCH', `/api/tasks/${id}`, { body: {} });
    assert.equal(empty.status, 400);
  });

  test('rejects a body that is not a JSON object', async () => {
    const res = await call(srv.base, 'POST', '/api/tasks', { body: ['x'] });
    assert.equal(res.status, 400);
  });

  test('rejects invalid JSON and wrong content type', async () => {
    const bad = await call(srv.base, 'POST', '/api/tasks', { raw: '{"title":' });
    assert.equal(bad.status, 400);
    assert.equal(bad.data.error, 'invalid_json');
    const wrongType = await call(srv.base, 'POST', '/api/tasks', {
      raw: 'title=x',
      headers: { 'content-type': 'text/plain' },
    });
    assert.equal(wrongType.status, 415);
  });

  test('returns 404 for unknown or malformed task IDs', async () => {
    const missing = await call(srv.base, 'PATCH', '/api/tasks/00000000-0000-4000-8000-000000000000', {
      body: { done: true },
    });
    assert.equal(missing.status, 404);
    const malformed = await call(srv.base, 'DELETE', '/api/tasks/not-a-uuid');
    assert.equal(malformed.status, 404);
  });

  test('DELETE removes a task, then 404s on a second delete', async () => {
    const created = await call(srv.base, 'POST', '/api/tasks', { body: { title: 'Temp' } });
    const id = created.data.task.id;
    const del = await call(srv.base, 'DELETE', `/api/tasks/${id}`);
    assert.equal(del.status, 204);
    const list = await call(srv.base, 'GET', '/api/tasks');
    assert.ok(!list.data.tasks.some((t) => t.id === id));
    const again = await call(srv.base, 'DELETE', `/api/tasks/${id}`);
    assert.equal(again.status, 404);
  });
});
