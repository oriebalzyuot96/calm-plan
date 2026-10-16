import { api } from '../api.js';
import { t } from '../i18n.js';
import { el, errorMessage, pulse, setStatus } from '../ui.js';
import { play } from '../sound.js';

let tasks = [];
let listEl;
let emptyEl;
let statusEl;
let justDone = null;
let lastAllDone = false;

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

const SVG_NS = 'http://www.w3.org/2000/svg';

function tickSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'tick');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M6 12.5l4 4 8-9');
  path.setAttribute('pathLength', '1');
  svg.append(path);
  return svg;
}

/** Grows the plant with the share of tasks that are done. */
function updatePlant() {
  const plant = document.getElementById('plant');
  const text = document.getElementById('plant-text');
  const meter = document.getElementById('plant-meter');
  if (!plant) return;
  const total = tasks.length;
  const done = tasks.filter((x) => x.done).length;
  let stage = 0;
  if (total > 0) {
    const ratio = done / total;
    stage = ratio === 1 ? 4 : ratio >= 0.6 ? 3 : ratio >= 0.3 ? 2 : done > 0 ? 1 : 0;
  }
  const allDone = total > 0 && done === total;
  plant.dataset.stage = String(stage);
  meter.dataset.pct = String(total ? Math.round((done / total) * 100) : 0);
  meter.style.setProperty('--pct', total ? String(done / total) : '0');
  if (!total) text.textContent = t('plantEmpty');
  else if (allDone) text.textContent = t('plantAllDone');
  else text.textContent = t('plantProgress', { done, total });
  lastAllDone = allDone;
}

function render() {
  const items = sorted();
  emptyEl.hidden = items.length > 0;
  listEl.replaceChildren();
  items.forEach((task, index) => {
    const checkboxId = `task-cb-${task.id}`;
    const row = el(
      'li',
      { className: `task${task.done ? ' done' : ''}${task.id === justDone ? ' just-done' : ''}`, 'data-id': task.id },
      [
        el('label', { className: 'task-main', for: checkboxId }, [
          el('span', { className: 'check' }, [
            el('input', {
              type: 'checkbox',
              id: checkboxId,
              'data-action': 'toggle',
              checked: task.done,
            }),
            tickSvg(),
          ]),
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
    row.style.setProperty('--i', String(Math.min(index, 12)));
    listEl.append(row);
  });
  justDone = null;
  updatePlant();
}

async function load() {
  try {
    const data = await api.listTasks();
    tasks = data.tasks;
    listEl.classList.add('fresh');
    render();
    globalThis.setTimeout(() => listEl.classList.remove('fresh'), 1500);
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
      const wasAll = lastAllDone;
      justDone = task.done ? id : null;
      render();
      if (task.done && lastAllDone && !wasAll) {
        pulse(document.getElementById('plant-card'), 'sparkle', 2600);
        play('chimeAll');
      } else if (task.done) {
        play('chime');
      } else {
        play('tick');
      }
      setStatus(statusEl, task.done ? (lastAllDone ? t('taskAllDone') : t('taskDone')) : t('taskReopened'));
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
