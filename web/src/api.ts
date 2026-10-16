// The data layer is shared with the vanilla front end: public/js/api.js talks to the HTTP API
// and switches to the in-memory demo store (public/js/demo-store.js) in demo mode.
import { api as rawApi, isDemoMode } from '../../public/js/api.js';
import type { CrisisGuidance } from './types';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  category: 'task' | 'habit';
  position: number;
  createdAt: string;
}

export interface Mood {
  id: string;
  score: number;
  note: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  reply: string;
  kind: string;
  source: 'local' | 'anthropic' | 'safety' | string;
  crisis: CrisisGuidance | null;
}

export interface Api {
  listTasks(): Promise<{ tasks: Task[] }>;
  createTask(task: { title: string; dueDate?: string | null; category?: 'task' | 'habit' }): Promise<{ task: Task }>;
  updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'done' | 'dueDate' | 'category' | 'position'>>): Promise<{ task: Task }>;
  deleteTask(id: string): Promise<null>;
  listMoods(days?: number): Promise<{ moods: Mood[] }>;
  createMood(mood: { score: number; note?: string; lang?: string }): Promise<{ mood: Mood; crisis: CrisisGuidance | null }>;
  chat(payload: { messages: ChatMessage[]; lang: string }): Promise<ChatResult>;
  eraseAll(): Promise<{ ok: boolean; erased: boolean }>;
}

export const api = rawApi as unknown as Api;
export { isDemoMode };

/** A user-facing message key for an API error. */
export function errorKey(err: unknown): string {
  const e = err as { code?: string; status?: number } | null;
  if (e?.code === 'network') return 'errorNetwork';
  if (e?.status === 429 || e?.code === 'rate_limited') return 'errorRate';
  if (e?.code === 'message_too_long') return 'chatTooLong';
  return 'errorGeneric';
}
