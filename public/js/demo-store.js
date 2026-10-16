import { crisisGuidance, detectCrisis } from './shared/crisis.js';
import { crisisReply, localReply } from './shared/reply.js';

/**
 * In-memory data layer for the static demo (GitHub Pages, no server).
 * It implements the same operations as api.js and returns the same shapes
 * as the HTTP API. Nothing is written to browser storage or sent anywhere:
 * data lives in this object and disappears when the tab is closed.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MESSAGE_CHARS = 1000;
const DAY = 86_400_000;

function invalid(field, message) {
  const err = new Error('validation_failed');
  err.code = 'validation_failed';
  err.status = 400;
  err.field = field;
  err.message = message;
  throw err;
}

function notFound() {
  const err = new Error('not_found');
  err.code = 'not_found';
  err.status = 404;
  throw err;
}

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function parseTitle(value) {
  if (typeof value !== 'string') invalid('title', 'must be a string');
  const title = value.trim();
  if (title.length < 1 || title.length > 200) invalid('title', 'must be 1 to 200 characters');
  return title;
}

function parseDueDate(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !DATE_RE.test(value)) invalid('dueDate', 'must be YYYY-MM-DD');
  return value;
}

function parseCategory(value) {
  if (value !== 'task' && value !== 'habit') invalid('category', "must be 'task' or 'habit'");
  return value;
}

const clone = (v) => (v === null || v === undefined ? v : JSON.parse(JSON.stringify(v)));

function seedTasks(now) {
  const today = new Date(now).toISOString().slice(0, 10);
  const items = [
    { title: 'Drink a glass of water | اشرب كوب ماء', category: 'habit', done: true },
    { title: 'Take a 10-minute walk | امشِ عشر دقائق', category: 'habit', done: false },
    { title: 'Reply to one message | رد على رسالة واحدة', category: 'task', done: false, dueDate: today },
    { title: 'Three slow breaths before lunch | ثلاثة أنفاس بطيئة قبل الغداء', category: 'habit', done: false },
  ];
  return items.map((t, i) => ({
    id: newId(),
    title: t.title,
    done: t.done,
    dueDate: t.dueDate || null,
    category: t.category,
    position: i,
    createdAt: new Date(now - (items.length - i) * 60_000).toISOString(),
  }));
}

function seedMoods(now) {
  const scores = [3, 2, 3, 4, 3, 4, 5, 4];
  return scores.map((score, i) => ({
    id: newId(),
    score,
    note: '',
    createdAt: new Date(now - (scores.length - i) * DAY + 9 * 3_600_000).toISOString(),
  }));
}

/** Creates a fresh store. Pass { seed: false } for an empty one (tests). */
export function createDemoStore({ seed = true, now = () => Date.now() } = {}) {
  let tasks = seed ? seedTasks(now()) : [];
  let moods = seed ? seedMoods(now()) : [];

  const sortedTasks = () =>
    [...tasks].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
  const recentMoods = (limit) =>
    [...moods].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

  return {
    async listTasks() {
      return { tasks: clone(sortedTasks()) };
    },

    async createTask(input = {}) {
      const task = {
        id: newId(),
        title: parseTitle(input.title),
        done: input.done === undefined ? false : Boolean(input.done),
        dueDate: parseDueDate(input.dueDate),
        category: input.category === undefined ? 'task' : parseCategory(input.category),
        position: tasks.reduce((m, t) => Math.max(m, t.position), -1) + 1,
        createdAt: new Date(now()).toISOString(),
      };
      tasks.push(task);
      return { task: clone(task) };
    },

    async updateTask(id, patch = {}) {
      const task = tasks.find((t) => t.id === id);
      if (!task) notFound();
      const next = { ...task };
      if ('title' in patch) next.title = parseTitle(patch.title);
      if ('dueDate' in patch) next.dueDate = parseDueDate(patch.dueDate);
      if ('category' in patch) next.category = parseCategory(patch.category);
      if ('done' in patch) {
        if (typeof patch.done !== 'boolean') invalid('done', 'must be true or false');
        next.done = patch.done;
      }
      if ('position' in patch) {
        if (!Number.isInteger(patch.position) || patch.position < 0 || patch.position > 100_000) {
          invalid('position', 'must be an integer from 0 to 100000');
        }
        next.position = patch.position;
      }
      Object.assign(task, next);
      return { task: clone(task) };
    },

    async deleteTask(id) {
      const before = tasks.length;
      tasks = tasks.filter((t) => t.id !== id);
      if (tasks.length === before) notFound();
      return null;
    },

    async listMoods(days = 14) {
      const safe = Number.isInteger(days) && days >= 1 && days <= 365 ? days : 30;
      const since = new Date(now() - safe * DAY).toISOString();
      return { moods: clone(recentMoods(500).filter((m) => m.createdAt >= since)) };
    },

    async createMood(input = {}) {
      if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
        invalid('score', 'must be an integer from 1 to 5');
      }
      const note = typeof input.note === 'string' ? input.note.trim() : '';
      if (note.length > 500) invalid('note', 'must be 500 characters or fewer');
      const stamp = input.createdAt ? new Date(input.createdAt) : new Date(now());
      if (Number.isNaN(stamp.getTime())) invalid('createdAt', 'must be an ISO date-time');
      const mood = { id: newId(), score: input.score, note, createdAt: stamp.toISOString() };
      moods.push(mood);
      const crisis = detectCrisis(note) ? crisisGuidance(input.lang === 'en' ? 'en' : 'ar') : null;
      return { mood: clone(mood), crisis };
    },

    async chat({ messages, lang } = {}) {
      if (!Array.isArray(messages) || messages.length < 1) invalid('messages', 'must be a non-empty array');
      const last = messages[messages.length - 1];
      if (!last || last.role !== 'user' || typeof last.content !== 'string') {
        invalid('messages', 'the last message must be from the user');
      }
      if (last.content.length > MAX_MESSAGE_CHARS) {
        const err = new Error('message_too_long');
        err.code = 'message_too_long';
        err.status = 400;
        throw err;
      }
      const latest = last.content.trim();
      if (!latest) invalid('messages', 'must not be empty');
      const language = lang === 'en' ? 'en' : 'ar';
      return (
        crisisReply(latest, language) ||
        localReply(latest, language, {
          moods: recentMoods(14),
          openTasks: sortedTasks().filter((t) => !t.done),
        })
      );
    },

    async eraseAll() {
      tasks = [];
      moods = [];
      return { ok: true, erased: true };
    },
  };
}
