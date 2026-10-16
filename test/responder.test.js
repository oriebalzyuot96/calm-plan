import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isMedicalTopic, respondLocally } from '../server/chat/responder.js';

const MEDICAL_PROMPTS = [
  'What dose of ibuprofen should I take for my headache?',
  'Should I stop my antidepressants?',
  'Can you diagnose me? I think I have bipolar disorder.',
  'What medication is best for anxiety?',
  'Are these symptoms a sign of ADHD?',
  'ما الجرعة المناسبة من الدواء؟',
  'هل أوقف الحبوب التي يصفها لي الطبيب؟',
  'هل عندي تشخيص اضطراب ثنائي القطب؟',
];

// Dosage-like output: a number followed by a unit, or an instruction to take a drug.
const DOSAGE_PATTERN = /\d+\s*(mg|mcg|ml|g|iu|tablets?|pills?)\b|\btake\s+\d|جرعة\s*\d|\d+\s*(ملغ|مل|حبة|حبات)/i;

describe('responder never gives medical advice', () => {
  for (const prompt of MEDICAL_PROMPTS) {
    test(`refuses and redirects: ${prompt}`, () => {
      const lang = /[؀-ۿ]/.test(prompt) ? 'ar' : 'en';
      const reply = respondLocally({ message: prompt, lang, moods: [], openTasks: [] });
      assert.equal(reply.kind, 'medical_redirect');
      assert.equal(isMedicalTopic(prompt), true);
      assert.doesNotMatch(reply.text, DOSAGE_PATTERN);
      if (lang === 'en') assert.match(reply.text, /doctor|pharmacist|professional/i);
      else assert.match(reply.text, /طبيب|صيدلي|مختص/);
    });
  }

  test('no reply in either language contains dosage-like output', () => {
    const samples = [
      'hello', 'I feel tired today', 'breathing exercise please', 'grounding',
      'what should I do with my tasks', 'how am I doing', 'random words here',
      'مرحبا', 'أشعر بالتعب', 'تمرين تنفس', 'كيف حالي', 'ساعدني في مهامي',
    ];
    const moods = [{ score: 1 }, { score: 2 }];
    const openTasks = [{ title: 'x', done: false }];
    for (const lang of ['en', 'ar']) {
      for (const message of samples.concat(MEDICAL_PROMPTS)) {
        const reply = respondLocally({ message, lang, moods, openTasks });
        assert.doesNotMatch(reply.text, DOSAGE_PATTERN, `dosage-like text for: ${message}`);
      }
    }
  });
});

describe('local responder behaviour', () => {
  test('breathing request gives a timed breathing exercise', () => {
    const r = respondLocally({ message: 'Can you guide a breathing exercise?', lang: 'en' });
    assert.equal(r.kind, 'breathing');
    assert.match(r.text, /4 counts/);
  });

  test('grounding request gives a 5-4-3-2-1 step', () => {
    const r = respondLocally({ message: 'I feel panic, help me ground myself', lang: 'en' });
    assert.equal(r.kind, 'grounding');
    assert.match(r.text, /5 things/);
  });

  test('Arabic breathing request is recognised', () => {
    const r = respondLocally({ message: 'أحتاج تمرين تنفس', lang: 'ar' });
    assert.equal(r.kind, 'breathing');
  });

  test('short word "hi" inside another word does not trigger a greeting', () => {
    const r = respondLocally({ message: 'this is hard for me', lang: 'en' });
    assert.notEqual(r.kind, 'greeting');
    assert.equal(r.kind, 'fallback');
  });

  test('task question mentions the number of open items', () => {
    const r = respondLocally({
      message: 'what about my tasks?',
      lang: 'en',
      openTasks: [{ title: 'a', done: false }, { title: 'b', done: false }, { title: 'c', done: true }],
    });
    assert.equal(r.kind, 'tasks');
    assert.match(r.text, /2 open items/);
  });

  test('a low recent mood trend invites a gentle next step', () => {
    const r = respondLocally({
      message: 'I feel sad',
      lang: 'en',
      moods: [{ score: 1 }, { score: 2 }, { score: 2 }],
    });
    assert.equal(r.kind, 'mood');
    assert.match(r.text, /lower side/);
  });

  test('replies are in the requested language', () => {
    const en = respondLocally({ message: 'hello', lang: 'en' });
    const ar = respondLocally({ message: 'hello', lang: 'ar' });
    assert.doesNotMatch(en.text, /[؀-ۿ]/);
    assert.match(ar.text, /[؀-ۿ]/);
  });
});
