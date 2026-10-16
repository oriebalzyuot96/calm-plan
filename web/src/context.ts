import { createContext, useContext } from 'react';
import type { A11yPrefs } from 'pelagic/core/a11y-prefs';
import type { ChatMessage } from './api';
import type { CrisisGuidance } from './types';

export type View = 'today' | 'mood' | 'meditate' | 'chat' | 'settings';
export const VIEWS: View[] = ['today', 'mood', 'meditate', 'chat', 'settings'];

export interface Bubble {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
  crisis?: boolean;
}

export interface AppState {
  showCrisis: (g: CrisisGuidance | null) => void;
  navigate: (view: View) => void;
  demo: boolean;
  /** Chat transcript, kept in memory only (never stored). */
  chat: { bubbles: Bubble[]; history: ChatMessage[] };
  setChat: (update: (c: AppState['chat']) => AppState['chat']) => void;
  /** Bumped after "erase all data" so views reload. */
  dataVersion: number;
  bumpData: () => void;
  a11y: A11yPrefs;
  setA11y: (patch: Partial<A11yPrefs>) => void;
  replaceA11y: (prefs: A11yPrefs) => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp outside AppContext');
  return v;
}
