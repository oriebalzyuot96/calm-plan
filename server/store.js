import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * SQLite-backed storage. Uses the built-in node:sqlite module (Node 24).
 * Pass ':memory:' for tests.
 */
export function openStore(file) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      category TEXT NOT NULL DEFAULT 'task',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS moods (
      id TEXT PRIMARY KEY,
      score INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS moods_created ON moods(created_at);
  `);

  const q = {
    taskById: db.prepare('SELECT * FROM tasks WHERE id = ?'),
    tasksAll: db.prepare('SELECT * FROM tasks ORDER BY position ASC, created_at ASC'),
    tasksOpen: db.prepare("SELECT * FROM tasks WHERE done = 0 ORDER BY position ASC"),
    nextPosition: db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM tasks'),
    insertTask: db.prepare(
      'INSERT INTO tasks (id, title, done, due_date, category, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ),
    updateTask: db.prepare(
      'UPDATE tasks SET title = ?, done = ?, due_date = ?, category = ?, position = ? WHERE id = ?',
    ),
    deleteTask: db.prepare('DELETE FROM tasks WHERE id = ?'),
    insertMood: db.prepare('INSERT INTO moods (id, score, note, created_at) VALUES (?, ?, ?, ?)'),
    moodsSince: db.prepare(
      'SELECT * FROM moods WHERE created_at >= ? ORDER BY created_at DESC LIMIT ?',
    ),
    moodsRecent: db.prepare('SELECT * FROM moods ORDER BY created_at DESC LIMIT ?'),
    eraseTasks: db.prepare('DELETE FROM tasks'),
    eraseMoods: db.prepare('DELETE FROM moods'),
  };

  const toTask = (r) => ({
    id: r.id,
    title: r.title,
    done: r.done === 1,
    dueDate: r.due_date,
    category: r.category,
    position: r.position,
    createdAt: r.created_at,
  });
  const toMood = (r) => ({ id: r.id, score: r.score, note: r.note, createdAt: r.created_at });

  return {
    close() {
      db.close();
    },

    listTasks() {
      return q.tasksAll.all().map(toTask);
    },

    openTasks() {
      return q.tasksOpen.all().map(toTask);
    },

    getTask(id) {
      const row = q.taskById.get(id);
      return row ? toTask(row) : null;
    },

    createTask({ title, dueDate, category, done }) {
      const id = randomUUID();
      const position = q.nextPosition.get().next;
      const createdAt = new Date().toISOString();
      q.insertTask.run(id, title, done ? 1 : 0, dueDate, category, position, createdAt);
      return toTask({ id, title, done: done ? 1 : 0, due_date: dueDate, category, position, created_at: createdAt });
    },

    updateTask(id, fields) {
      const current = q.taskById.get(id);
      if (!current) return null;
      const next = {
        title: fields.title ?? current.title,
        done: fields.done === undefined ? current.done : fields.done ? 1 : 0,
        dueDate: fields.dueDate === undefined ? current.due_date : fields.dueDate,
        category: fields.category ?? current.category,
        position: fields.position ?? current.position,
      };
      q.updateTask.run(next.title, next.done, next.dueDate, next.category, next.position, id);
      return this.getTask(id);
    },

    deleteTask(id) {
      return q.deleteTask.run(id).changes > 0;
    },

    createMood({ score, note, createdAt }) {
      const id = randomUUID();
      const stamp = createdAt || new Date().toISOString();
      q.insertMood.run(id, score, note, stamp);
      return { id, score, note, createdAt: stamp };
    },

    listMoodsSince(sinceIso, limit = 500) {
      return q.moodsSince.all(sinceIso, limit).map(toMood);
    },

    recentMoods(limit = 14) {
      return q.moodsRecent.all(limit).map(toMood);
    },

    eraseAll() {
      q.eraseTasks.run();
      q.eraseMoods.run();
    },
  };
}
