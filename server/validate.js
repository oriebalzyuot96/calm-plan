import { HttpError } from './http.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES = ['task', 'habit'];
const LANGS = ['en', 'ar'];

function fail(field, message) {
  throw new HttpError(400, 'validation_failed', { field, message });
}

function requireObject(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    fail('body', 'must be a JSON object');
  }
  return body;
}

function parseTitle(value) {
  if (typeof value !== 'string') fail('title', 'must be a string');
  const title = value.trim();
  if (title.length < 1 || title.length > 200) fail('title', 'must be 1 to 200 characters');
  return title;
}

function parseDueDate(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !DATE_RE.test(value)) fail('dueDate', 'must be YYYY-MM-DD');
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    fail('dueDate', 'is not a real date');
  }
  return value;
}

function parseCategory(value) {
  if (!CATEGORIES.includes(value)) fail('category', "must be 'task' or 'habit'");
  return value;
}

function parseBool(value, field) {
  if (typeof value !== 'boolean') fail(field, 'must be true or false');
  return value;
}

/** Creates a task. Missing optional fields get defaults. */
export function parseTaskCreate(input) {
  const body = requireObject(input);
  return {
    title: parseTitle(body.title),
    dueDate: parseDueDate(body.dueDate),
    category: body.category === undefined ? 'task' : parseCategory(body.category),
    done: body.done === undefined ? false : parseBool(body.done, 'done'),
  };
}

/** Partial update. Only fields present in the body are returned. */
export function parseTaskPatch(input) {
  const body = requireObject(input);
  const out = {};
  if ('title' in body) out.title = parseTitle(body.title);
  if ('dueDate' in body) out.dueDate = parseDueDate(body.dueDate);
  if ('category' in body) out.category = parseCategory(body.category);
  if ('done' in body) out.done = parseBool(body.done, 'done');
  if ('position' in body) {
    if (!Number.isInteger(body.position) || body.position < 0 || body.position > 100_000) {
      fail('position', 'must be an integer from 0 to 100000');
    }
    out.position = body.position;
  }
  if (Object.keys(out).length === 0) fail('body', 'no updatable fields given');
  return out;
}

export function parseMood(input) {
  const body = requireObject(input);
  if (!Number.isInteger(body.score) || body.score < 1 || body.score > 5) {
    fail('score', 'must be an integer from 1 to 5');
  }
  let note = '';
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== 'string') fail('note', 'must be a string');
    note = body.note.trim();
    if (note.length > 500) fail('note', 'must be 500 characters or fewer');
  }
  let createdAt;
  if (body.createdAt !== undefined) {
    if (typeof body.createdAt !== 'string') fail('createdAt', 'must be an ISO date-time');
    const d = new Date(body.createdAt);
    if (Number.isNaN(d.getTime())) fail('createdAt', 'must be an ISO date-time');
    createdAt = d.toISOString();
  }
  return { score: body.score, note, createdAt, lang: parseLang(body.lang) };
}

export function parseLang(value) {
  return LANGS.includes(value) ? value : 'ar';
}

export function parseChat(input, { maxMessageChars }) {
  const body = requireObject(input);
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 20) {
    fail('messages', 'must be an array of 1 to 20 messages');
  }
  const messages = body.messages.map((m, i) => {
    if (m === null || typeof m !== 'object') fail(`messages[${i}]`, 'must be an object');
    if (m.role !== 'user' && m.role !== 'assistant') fail(`messages[${i}].role`, 'must be user or assistant');
    if (typeof m.content !== 'string') fail(`messages[${i}].content`, 'must be a string');
    if (m.content.length > maxMessageChars) {
      throw new HttpError(400, 'message_too_long', { limit: maxMessageChars });
    }
    const content = m.content.trim();
    if (!content) fail(`messages[${i}].content`, 'must not be empty');
    return { role: m.role, content };
  });
  if (messages[messages.length - 1].role !== 'user') {
    fail('messages', 'the last message must be from the user');
  }
  return { messages, lang: parseLang(body.lang) };
}
