// Today: add a task and complete it against a mocked HTTP API.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers';

interface Call {
  method: string;
  url: string;
  body: Record<string, unknown> | undefined;
}
const calls: Call[] = [];
const tasks: Record<string, unknown>[] = [];
const ID = '11111111-1111-4111-8111-111111111111';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method || 'GET';
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, url, body });
      if (url === '/health') return json(200, { ok: true });
      if (url === '/api/tasks' && method === 'GET') return json(200, { tasks });
      if (url === '/api/tasks' && method === 'POST') {
        const task = { id: ID, title: body.title, done: false, dueDate: body.dueDate, category: body.category, position: 0, createdAt: new Date().toISOString() };
        tasks.push(task);
        return json(201, { task });
      }
      if (url === `/api/tasks/${ID}` && method === 'PATCH') {
        Object.assign(tasks[0], body);
        return json(200, { task: tasks[0] });
      }
      if (url.startsWith('/api/moods')) return json(200, { moods: [] });
      return json(404, { error: 'not_found' });
    }),
  );
});
afterAll(() => {
  vi.unstubAllGlobals();
});

describe('tasks', () => {
  test('add a task, then complete it', async () => {
    const user = userEvent.setup();
    renderApp();
    await waitFor(() => expect(calls.some((c) => c.url === '/api/tasks' && c.method === 'GET')).toBe(true));

    // An empty title shows an error instead of calling the API.
    await user.click(screen.getByRole('button', { name: /إضافة/ }));
    expect(await screen.findByText('من فضلك اكتب عنوانًا قصيرًا أولًا.')).toBeTruthy();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.type(screen.getByLabelText('مهمة أو عادة جديدة'), 'Drink water');
    await user.click(screen.getByRole('checkbox', { name: 'عادة' }));
    await user.click(screen.getByRole('button', { name: /إضافة/ }));

    const list = await screen.findByRole('list', { name: 'قائمتك' });
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.url).toBe('/api/tasks');
    expect(post?.body).toEqual({ title: 'Drink water', dueDate: null, category: 'habit' });
    expect(within(list).getByText('Drink water')).toBeTruthy();
    expect(within(list).getByText('عادة')).toBeTruthy();

    const box = within(list).getByRole('checkbox', { name: 'Drink water' }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    await user.click(box);
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.method === 'PATCH');
    expect(patch?.url).toBe(`/api/tasks/${ID}`);
    expect(patch?.body).toEqual({ done: true });
    await waitFor(() => expect(box.checked).toBe(true));
    expect(await screen.findByText('أنجزت كل شيء. نبتتك في أجمل تفتحها.')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'نبتة عاداتك' }).getAttribute('aria-valuenow')).toBe('100');
  });
});
