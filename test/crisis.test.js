import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { detectCrisis, crisisGuidance } from '../server/chat/crisis.js';
import { call, startTestServer } from './helpers.js';

const POSITIVE = [
  'I want to kill myself',
  'I keep thinking about suicide',
  'I think I want to end my life',
  'honestly I dont want to live anymore',
  'I might self-harm tonight',
  'أنتحر',
  'أفكر في الانتحار كل يوم',
  'أقتل نفسي',
  'لا أريد العيش بعد الآن',
  'أؤذي نفسي',
  'أريد أن أنهي حياتي',
];

const NEGATIVE = [
  'I finished my tasks today and I feel calm. Can we plan tomorrow?',
  'I had a stressful meeting but I am okay now.',
  'Can you suggest a short breathing exercise?',
  'أنهيت مهامي اليوم وأشعر بالهدوء.',
  'أريد أن أنام مبكرًا الليلة.',
  'لا أريد شيئًا الآن، شكرًا.',
];

describe('crisis detection', () => {
  for (const text of POSITIVE) {
    test(`detects crisis language: ${text}`, () => {
      assert.equal(detectCrisis(text), true);
    });
  }

  for (const text of NEGATIVE) {
    test(`does not trigger on a normal message: ${text}`, () => {
      assert.equal(detectCrisis(text), false);
    });
  }

  test('handles empty and non-string input', () => {
    assert.equal(detectCrisis(''), false);
    assert.equal(detectCrisis(undefined), false);
  });

  test('guidance exists in both languages and names emergency numbers and a person', () => {
    for (const lang of ['en', 'ar']) {
      const g = crisisGuidance(lang);
      assert.ok(g.title && g.body && g.prompt);
      assert.ok(g.steps.length >= 3);
      assert.ok(g.steps.join(' ').includes('911'));
    }
  });
});

describe('crisis handling in chat', () => {
  let srv;
  let fetchCalls = 0;
  before(async () => {
    srv = await startTestServer({
      anthropicApiKey: 'test-key-not-real',
      fetchImpl: async () => {
        fetchCalls += 1;
        throw new Error('model must not be called for crisis messages');
      },
    });
  });
  after(async () => {
    await srv.close();
  });

  test('a crisis message returns guidance and never calls the model', async () => {
    const before = fetchCalls;
    const res = await call(srv.base, 'POST', '/api/chat', {
      body: { messages: [{ role: 'user', content: 'I want to kill myself' }], lang: 'en' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.kind, 'crisis');
    assert.equal(res.data.source, 'safety');
    assert.ok(res.data.crisis.steps.length >= 3);
    assert.equal(fetchCalls, before);
  });

  test('an Arabic crisis message returns Arabic guidance', async () => {
    const res = await call(srv.base, 'POST', '/api/chat', {
      body: { messages: [{ role: 'user', content: 'أقتل نفسي' }], lang: 'ar' },
    });
    assert.equal(res.data.kind, 'crisis');
    assert.match(res.data.crisis.title, /[؀-ۿ]/);
  });
});
