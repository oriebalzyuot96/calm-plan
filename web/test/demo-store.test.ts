// Demo mode: the React app reuses public/js/api.js, which switches to the in-memory demo store.
import { describe, expect, test } from 'vitest';
import { useDemoMeta } from './helpers';
import { api, isDemoMode } from '../src/api';
import { createDemoStore } from '../../public/js/demo-store.js';
import { crisisGuidance } from '../../public/js/shared/crisis.js';
import { plantStage } from '../src/views/Today';
import { buckets } from '../src/views/Mood';

useDemoMeta();

describe('demo store', () => {
  test('the calm-plan-mode meta tag turns demo mode on, with seeded data and no network', async () => {
    let fetched = false;
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetched = true;
      throw new Error('no network in demo');
    }) as typeof fetch;
    try {
      expect(await isDemoMode()).toBe(true);
      const { tasks } = await api.listTasks();
      expect(tasks.length).toBeGreaterThanOrEqual(3);
      const { task } = await api.createTask({ title: 'Stretch', category: 'habit' });
      const { task: done } = await api.updateTask(task.id, { done: true });
      expect(done.done).toBe(true);
      const reply = await api.chat({ messages: [{ role: 'user', content: 'I want to kill myself' }], lang: 'en' });
      expect(reply.kind).toBe('crisis');
      expect(reply.crisis).toEqual(crisisGuidance('en'));
      const mood = await api.createMood({ score: 2, note: 'أفكر في الانتحار', lang: 'ar' });
      expect(mood.crisis).toEqual(crisisGuidance('ar'));
      expect(await api.eraseAll()).toEqual({ ok: true, erased: true });
      expect((await api.listTasks()).tasks).toEqual([]);
      expect(fetched).toBe(false);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test('validates like the server', async () => {
    const store = createDemoStore({ seed: false });
    await expect(store.createTask({ title: '  ' })).rejects.toMatchObject({ code: 'validation_failed' });
    await expect(store.createMood({ score: 9 })).rejects.toMatchObject({ code: 'validation_failed' });
  });
});

describe('view logic', () => {
  test('the plant grows in stages with the share of done tasks', () => {
    const t = (done: boolean) => ({ done });
    expect(plantStage([])).toBe(0);
    expect(plantStage([t(false), t(false)])).toBe(0);
    expect(plantStage([t(true), t(false), t(false), t(false)])).toBe(1);
    expect(plantStage([t(true), t(false), t(false)])).toBe(2);
    expect(plantStage([t(true), t(true), t(false)])).toBe(3);
    expect(plantStage([t(true), t(true)])).toBe(4);
  });

  test('mood buckets cover 14 local days and average each day', () => {
    const now = new Date(2026, 9, 16, 15);
    const at = (d: number, h: number) => new Date(2026, 9, d, h).toISOString();
    const days = buckets(
      [
        { score: 2, createdAt: at(16, 9) },
        { score: 4, createdAt: at(16, 20) },
        { score: 5, createdAt: at(3, 10) },
        { score: 1, createdAt: at(1, 10) },
      ],
      now,
    );
    expect(days).toHaveLength(14);
    expect(days[13].avg).toBe(3);
    expect(days[0].avg).toBe(5);
    expect(days.filter((d) => d.avg !== null)).toHaveLength(2);
  });
});
