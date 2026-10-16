import { api } from '../api.js';
import { t } from '../i18n.js';
import { el, errorMessage, setStatus } from '../ui.js';

let tasks = [];
let listEl;
let emptyEl;
let statusEl;

function sorted() {
  return [...tasks].sort((a, b) => a.position - b.position);
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(document.documentElement.lang === 'ar' ? 'ar' : 'en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function render() {
  const items = sorted();
  emptyEl.hidden = items.length > 0;
  listEl.replaceChildren();
  items.forEach((task, index) => {
    const checkboxId = `task-cb-${task.id}`;
    const row = el(
      'li',
      { className: `task${task.done ? ' done' : ''}`, 'data-id': task.id },
      [
        el('label', { className: 'task-main', for: checkboxId }, [
          el('input', {
            type: 'checkbox',
            id: checkboxId,
            'data-action': 'toggle',
            checked: task.done,
          }),
          el('span', { className: 'task-title', text: task.title }),
        ]),
        el('span', {
          className: 'badge',
          text: task.category === 'habit' ? t('categoryHabit') : t('categoryTask'),
        }),
        task.dueDate ? el('span', { className: 'due', text: formatDate(task.dueDate) }) : null,
        el('div', { className: 'task-actions' }, [
          el('button', {
            type: 'button',
            className: 'icon-btn',
            'data-action': 'up',
            'aria-label': `${t('moveUp')}: ${task.title}`,
            disabled: index === 0,
            text: '↑',
          }),
          el('button', {
            type: 'button',
            className: 'icon-btn',
            'data-action': 'down',
            'aria-label': `${t('moveDown')}: ${task.title}`,
            disabled: index === items.length - 1,
            text: '↓',
          }),
          el('button', {
            type: 'button',
            className: 'icon-btn',
            'data-action': 'delete',
            'aria-label': `${t('deleteTask')}: ${task.title}`,
            text: t('deleteTask'),
          }),
        ]),
      ],
    );
    listEl.append(row);
  });
}

async function load() {
  try {
    const data = await api.listTasks();
    tasks = data.tasks;
    render();
  } catch (err) {
    setStatus(statusEl, errorMessage(err), true);
  }
}

async function refocus(id, action) {
  const btn = listEl.querySelector(`[data-id="${id}"] [data-action="${action}"]`);
  if (btn && !btn.disabled) btn.focus();
  else listEl.querySelector(`[data-id="${id}"] input`)?.focus();
}

async function move(id, direction) {
  const items = sorted();
  const i = items.findIndex((t) => t.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= items.length) return;
  const a = items[i];
  const b = items[j];
  try {
    await Promise.all([
      api.updateTask(a.id, { position: b.position }),
      api.updateTask(b.id, { position: a.position }),
    ]);
    await load();
    refocus(id, direction < 0 ? 'up' : 'down');
  } catch (err) {
    setStatus(statusEl, errorMessage(err), true);
  }
}

export function initToday() {
  const form = document.getElementById('task-form');
  const titleInput = document.getElementById('task-title');
  const habitInput = document.getElementById('task-habit');
  listEl = document.getElementById('task-list');
  emptyEl = document.getElementById('task-empty');
  statusEl = document.getElementById('task-status');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) {
      setStatus(statusEl, t('titleRequired'), true);
      titleInput.focus();
      return;
    }
    const dueDate = form.elements.dueDate.value || null;
    try {
      const { task } = await api.createTask({
        title,
        dueDate,
        category: habitInput.checked ? 'habit' : 'task',
      });
      tasks.push(task);
      form.reset();
      habitInput.checked = false;
      render();
      setStatus(statusEl, t('taskAdded'));
      titleInput.focus();
    } catch (err) {
      setStatus(statusEl, errorMessage(err), true);
    }
  });

  listEl.addEventListener('change', async (event) => {
    const target = event.target;
    if (target.dataset.action !== 'toggle') return;
    const id = target.closest('[data-id]').dataset.id;
    try {
      const { task } = await api.updateTask(id, { done: target.checked });
      tasks = tasks.map((x) => (x.id === id ? task : x));
      render();
      setStatus(statusEl, task.done ? t('taskDone') : t('taskReopened'));
      refocus(id, 'toggle');
    } catch (err) {
      setStatus(statusEl, errorMessage(err), true);
      target.checked = !target.checked;
    }
  });

  listEl.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.closest('[data-id]').dataset.id;
    const action = button.dataset.action;
    if (action === 'up') return move(id, -1);
    if (action === 'down') return move(id, 1);
    if (action === 'delete') {
      try {
        await api.deleteTask(id);
        tasks = tasks.filter((x) => x.id !== id);
        render();
        setStatus(statusEl, t('taskDeleted'));
        titleInput.focus();
      } catch (err) {
        setStatus(statusEl, errorMessage(err), true);
      }
    }
  });

  document.addEventListener('langchange', render);
  document.addEventListener('datacleared', () => {
    tasks = [];
    render();
  });
  load();
}
