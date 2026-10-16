// Static demo: in-memory store, shared crisis logic, and the build output.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createDemoStore } from '../public/js/demo-store.js';
import { crisisGuidance, detectCrisis } from '../public/js/shared/crisis.js';
import * as serverCrisis from '../server/chat/crisis.js';
import { respondToChat } from '../server/chat/index.js';
import { assertNoInlineScripts, buildDemo } from '../scripts/build-demo.mjs';

describe('demo store', () => {
  test('starts with friendly sample tasks and moods', async () => {
    const store = createDemoStore();
    assert.ok((await store.listTasks()).tasks.length >= 3);
    assert.ok((await store.listMoods(14)).moods.length >= 3);
  });

  test('task create, list, update, reorder and delete', async () => {
    const store = createDemoStore({ seed: false });
    const { task: a } = await store.createTask({ title: '  Water the plants  ' });
    const { task: b } = await store.createTask({ title: 'Stretch', category: 'habit', dueDate: '2026-10-16' });
    assert.equal(a.title, 'Water the plants');
    assert.equal(a.category, 'task');
    assert.equal(a.done, false);
    assert.equal(b.category, 'habit');
    assert.match(a.id, /^[0-9a-f-]{36}$/);

    const { task: done } = await store.updateTask(a.id, { done: true });
    assert.equal(done.done, true);
    await store.updateTask(a.id, { position: b.position });
    await store.updateTask(b.id, { position: a.position });
    assert.deepEqual((await store.listTasks()).tasks.map((t) => t.title), ['Stretch', 'Water the plants']);

    assert.equal(await store.deleteTask(a.id), null);
    assert.deepEqual((await store.listTasks()).tasks.map((t) => t.id), [b.id]);
    await assert.rejects(store.deleteTask(a.id), { code: 'not_found' });
  });

  test('validates like the server', async () => {
    const store = createDemoStore({ seed: false });
    await assert.rejects(store.createTask({ title: '   ' }), { code: 'validation_failed' });
    await assert.rejects(store.createTask({ title: 'x', category: 'chore' }), { code: 'validation_failed' });
    await assert.rejects(store.createMood({ score: 6 }), { code: 'validation_failed' });
  });

  test('returned objects cannot change the stored data', async () => {
    const store = createDemoStore({ seed: false });
    const { task } = await store.createTask({ title: 'Read' });
    task.title = 'changed';
    assert.equal((await store.listTasks()).tasks[0].title, 'Read');
  });

  test('moods list, add with crisis note, and erase all', async () => {
    const store = createDemoStore({ seed: false });
    const ok = await store.createMood({ score: 4, note: 'calm day', lang: 'en' });
    assert.equal(ok.mood.score, 4);
    assert.equal(ok.crisis, null);
    const bad = await store.createMood({ score: 1, note: 'I want to end my life', lang: 'en' });
    assert.deepEqual(bad.crisis, crisisGuidance('en'));
    assert.equal((await store.listMoods(14)).moods.length, 2);

    await store.createTask({ title: 'One' });
    assert.deepEqual(await store.eraseAll(), { ok: true, erased: true });
    assert.equal((await store.listTasks()).tasks.length, 0);
    assert.equal((await store.listMoods(14)).moods.length, 0);
  });

  test('chat replies match the server without an API key', async () => {
    const store = createDemoStore();
    const msgs = [
      ['en', 'Can you help me breathe?'],
      ['ar', 'مرحبا'],
      ['en', 'what dose of ibuprofen should I take'],
      ['en', 'I want to kill myself'],
      ['ar', 'أفكر في الانتحار'],
    ];
    for (const [lang, content] of msgs) {
      const messages = [{ role: 'user', content }];
      const demo = await store.chat({ messages, lang });
      const server = await respondToChat({ messages, lang, getContext: () => ({ moods: [], openTasks: [] }) });
      assert.equal(demo.kind, server.kind, content);
      assert.equal(demo.source, server.source, content);
      assert.deepEqual(demo.crisis, server.crisis, content);
      if (demo.kind !== 'tasks' && demo.kind !== 'check_in') assert.equal(demo.reply, server.reply, content);
    }
  });
});

describe('shared crisis detection', () => {
  test('the server re-exports the shared module', () => {
    assert.equal(serverCrisis.detectCrisis, detectCrisis);
    assert.equal(serverCrisis.crisisGuidance, crisisGuidance);
  });

  test('detects English and Arabic self-harm language', () => {
    assert.equal(detectCrisis('Sometimes I want to kill myself'), true);
    assert.equal(detectCrisis('أفكر في الانتحار كل يوم'), true);
  });

  test('a normal message does not trigger', () => {
    assert.equal(detectCrisis('I finished my tasks and feel calm today'), false);
    assert.equal(detectCrisis('أريد أن أنام مبكرًا الليلة.'), false);
  });

  test('shared modules have no Node imports', async () => {
    const dir = path.resolve(import.meta.dirname, '../public/js/shared');
    for (const name of await readdir(dir)) {
      const src = await readFile(path.join(dir, name), 'utf8');
      assert.doesNotMatch(src, /from\s+'node:/, name);
      assert.doesNotMatch(src, /\bprocess\.|\bBuffer\b|require\(/, name);
    }
  });
});

describe('demo build', () => {
  let out;
  let html;
  before(async () => {
    out = await mkdtemp(path.join(os.tmpdir(), 'calm-plan-demo-'));
    await buildDemo({ out });
    html = await readFile(path.join(out, 'index.html'), 'utf8');
  });
  after(() => rm(out, { recursive: true, force: true }));

  test('has the demo meta tag and a CSP meta tag', () => {
    assert.match(html, /<meta name="calm-plan-mode" content="demo">/);
    assert.match(html, /<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self'/);
    assert.doesNotMatch(html, /frame-ancestors/);
  });

  test('has no inline scripts or handlers', () => {
    assert.doesNotThrow(() => assertNoInlineScripts(html));
    for (const tag of html.match(/<script\b[^>]*>/gi) || []) assert.match(tag, /\ssrc="[^/"][^"]*"/);
    assert.throws(() => assertNoInlineScripts('<script>alert(1)</script>'));
  });

  test('uses relative paths only, so it works under /samples/calm-plan/', () => {
    assert.doesNotMatch(html, /\s(?:href|src)="\/(?!\/)/);
    assert.match(html, /href="styles\.css"/);
    assert.match(html, /src="js\/app\.js"/);
  });

  test('ships the demo store and shared chat modules', async () => {
    for (const f of ['js/demo-store.js', 'js/shared/crisis.js', 'js/shared/responder.js', 'js/shared/text.js', 'js/shared/reply.js']) {
      await readFile(path.join(out, f));
    }
  });
});
