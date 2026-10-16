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

export const api = {
  listTasks: () => request('GET', '/api/tasks'),
  createTask: (task) => request('POST', '/api/tasks', { body: task }),
  updateTask: (id, patch) => request('PATCH', `/api/tasks/${encodeURIComponent(id)}`, { body: patch }),
  deleteTask: (id) => request('DELETE', `/api/tasks/${encodeURIComponent(id)}`),
  listMoods: (days = 14) => request('GET', `/api/moods?days=${days}`),
  createMood: (mood) => request('POST', '/api/moods', { body: mood }),
  chat: (payload) => request('POST', '/api/chat', { body: payload }),
  eraseAll: () => request('DELETE', '/api/data', { headers: { 'X-Confirm-Erase': 'yes' } }),
};
