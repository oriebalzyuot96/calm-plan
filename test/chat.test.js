import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { respondToChat, SYSTEM_PROMPT } from '../server/chat/index.js';
import { call, startTestServer } from './helpers.js';

const KEY = 'test-key-not-real';

function okFetch(text) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  fn.calls = calls;
  return fn;
}

function failingFetch(status = 500) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return new Response('{"error":"boom"}', { status });
  };
  fn.calls = calls;
  return fn;
}

const user = (content) => [{ role: 'user', content }];

describe('Anthropic API path', () => {
  test('calls the Messages API with the required headers and model', async () => {
    const fetchImpl = okFetch('You are doing well. What feels heavy today?');
    const out = await respondToChat({
      messages: user('I feel tired'),
      lang: 'en',
      apiKey: KEY,
      model: 'claude-haiku-5-5',
      fetchImpl,
      getContext: () => ({ moods: [], openTasks: [] }),
    });
    assert.equal(out.source, 'anthropic');
    assert.equal(out.reply, 'You are doing well. What feels heavy today?');
    assert.equal(fetchImpl.calls.length, 1);
    const { url, init } = fetchImpl.calls[0];
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(init.headers['x-api-key'], KEY);
    assert.equal(init.headers['anthropic-version'], '2023-06-01');
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'claude-haiku-5-5');
    assert.ok(body.system.includes('NOT a therapist'));
    assert.ok(body.system.includes('Never give medical advice'));
  });

  test('sends no mood or task data to the API', async () => {
    const fetchImpl = okFetch('Okay.');
    await respondToChat({
      messages: user('hello'),
      lang: 'en',
      apiKey: KEY,
      model: 'claude-haiku-5-5',
      fetchImpl,
      getContext: () => ({ moods: [{ score: 1, note: 'SECRET-NOTE' }], openTasks: [{ title: 'SECRET-TASK' }] }),
    });
    const sent = fetchImpl.calls[0].init.body;
    assert.ok(!sent.includes('SECRET-NOTE'));
    assert.ok(!sent.includes('SECRET-TASK'));
  });

  test('falls back to the local responder when the API call fails', async () => {
    const out = await respondToChat({
      messages: user('I feel tired'),
      lang: 'en',
      apiKey: KEY,
      model: 'claude-haiku-5-5',
      fetchImpl: failingFetch(500),
      getContext: () => ({ moods: [], openTasks: [] }),
    });
    assert.equal(out.source, 'local');
    assert.ok(out.reply.length > 0);
  });

  test('falls back when fetch throws', async () => {
    const out = await respondToChat({
      messages: user('hello'),
      lang: 'en',
      apiKey: KEY,
      model: 'claude-haiku-5-5',
      fetchImpl: async () => {
        throw new Error('network down');
      },
      getContext: () => ({ moods: [], openTasks: [] }),
    });
    assert.equal(out.source, 'local');
  });

  test('without an API key the API is never called', async () => {
    const fetchImpl = okFetch('should not be used');
    const out = await respondToChat({
      messages: user('hello'),
      lang: 'en',
      apiKey: '',
      model: 'claude-haiku-5-5',
      fetchImpl,
      getContext: () => ({ moods: [], openTasks: [] }),
    });
    assert.equal(fetchImpl.calls.length, 0);
    assert.equal(out.source, 'local');
  });

  test('medical questions stay local even with an API key', async () => {
    const fetchImpl = okFetch('should not be used');
    const out = await respondToChat({
      messages: user('What dose of ibuprofen should I take?'),
      lang: 'en',
      apiKey: KEY,
      model: 'claude-haiku-5-5',
      fetchImpl,
      getContext: () => ({ moods: [], openTasks: [] }),
    });
    assert.equal(fetchImpl.calls.length, 0);
    assert.equal(out.kind, 'medical_redirect');
  });

  test('the system prompt contains the safety rules', () => {
    assert.match(SYSTEM_PROMPT, /not a therapist/i);
    assert.match(SYSTEM_PROMPT, /medical advice/i);
    assert.match(SYSTEM_PROMPT, /emergency/i);
  });
});

describe('POST /api/chat validation and limits', () => {
  let srv;
  before(async () => {
    srv = await startTestServer();
  });
  after(async () => {
    await srv.close();
  });

  test('accepts a valid conversation and returns a local reply', async () => {
    const res = await call(srv.base, 'POST', '/api/chat', {
      body: { messages: [{ role: 'user', content: 'hello' }], lang: 'en' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.source, 'local');
    assert.equal(typeof res.data.reply, 'string');
  });

  test('a message of exactly 1000 characters is accepted', async () => {
    const res = await call(srv.base, 'POST', '/api/chat', {
      body: { messages: [{ role: 'user', content: 'a'.repeat(1000) }], lang: 'en' },
    });
    assert.equal(res.status, 200);
  });

  test('a message over 1000 characters is rejected', async () => {
    const res = await call(srv.base, 'POST', '/api/chat', {
      body: { messages: [{ role: 'user', content: 'a'.repeat(1001) }], lang: 'en' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'message_too_long');
  });

  test('the last message must come from the user', async () => {
    const res = await call(srv.base, 'POST', '/api/chat', {
      body: { messages: [{ role: 'assistant', content: 'hi' }], lang: 'en' },
    });
    assert.equal(res.status, 400);
  });

  test('empty message lists and bad roles are rejected', async () => {
    const empty = await call(srv.base, 'POST', '/api/chat', { body: { messages: [], lang: 'en' } });
    assert.equal(empty.status, 400);
    const badRole = await call(srv.base, 'POST', '/api/chat', {
      body: { messages: [{ role: 'system', content: 'x' }], lang: 'en' },
    });
    assert.equal(badRole.status, 400);
  });

  test('a whitespace-only message is rejected', async () => {
    const res = await call(srv.base, 'POST', '/api/chat', {
      body: { messages: [{ role: 'user', content: '   ' }], lang: 'en' },
    });
    assert.equal(res.status, 400);
  });
});
