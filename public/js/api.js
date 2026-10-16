import { createDemoStore } from './demo-store.js';

async function request(method, path, { body, headers = {} } = {}) {
  const init = { method, headers: { Accept: 'application/json', ...headers } };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(path, init);
  } catch {
    const err = new Error('network');
    err.code = 'network';
    throw err;
  }
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || `http_${res.status}`);
    err.code = data?.error || `http_${res.status}`;
    err.status = res.status;
    throw err;
  }
  return data;
}

const server = {
  listTasks: () => request('GET', '/api/tasks'),
  createTask: (task) => request('POST', '/api/tasks', { body: task }),
  updateTask: (id, patch) => request('PATCH', `/api/tasks/${encodeURIComponent(id)}`, { body: patch }),
  deleteTask: (id) => request('DELETE', `/api/tasks/${encodeURIComponent(id)}`),
  listMoods: (days = 14) => request('GET', `/api/moods?days=${days}`),
  createMood: (mood) => request('POST', '/api/moods', { body: mood }),
  chat: (payload) => request('POST', '/api/chat', { body: payload }),
  eraseAll: () => request('DELETE', '/api/data', { headers: { 'X-Confirm-Erase': 'yes' } }),
};

/** True when the page asks for demo mode via ?demo=1 or the calm-plan-mode meta tag. */
export function demoRequested(loc = globalThis.location, doc = globalThis.document) {
  try {
    if (loc && new URLSearchParams(loc.search).get('demo') === '1') return true;
  } catch {
    // Ignore malformed URLs.
  }
  const meta = doc?.querySelector?.('meta[name="calm-plan-mode"]');
  return meta?.getAttribute('content') === 'demo';
}

async function serverReachable() {
  try {
    const res = await fetch('/health', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}

let backendPromise;

/** Resolves once to either the HTTP API or the in-memory demo store. */
function backend() {
  if (!backendPromise) {
    backendPromise = (async () => {
      if (demoRequested() || !(await serverReachable())) return { demo: true, impl: createDemoStore() };
      return { demo: false, impl: server };
    })();
  }
  return backendPromise;
}

/** Resolves to true when the app runs on the in-memory demo store. */
export async function isDemoMode() {
  return (await backend()).demo;
}

const call =
  (name) =>
  async (...args) =>
    (await backend()).impl[name](...args);

export const api = {
  listTasks: call('listTasks'),
  createTask: call('createTask'),
  updateTask: call('updateTask'),
  deleteTask: call('deleteTask'),
  listMoods: call('listMoods'),
  createMood: call('createMood'),
  chat: call('chat'),
  eraseAll: call('eraseAll'),
};
