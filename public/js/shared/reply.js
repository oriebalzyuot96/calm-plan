import { crisisGuidance, detectCrisis } from './crisis.js';
import { respondLocally } from './responder.js';

/**
 * Crisis check for a chat message. Returns the full crisis reply, or null.
 * Used by the server and by the browser demo so both behave the same way.
 */
export function crisisReply(latest, lang) {
  if (!detectCrisis(latest)) return null;
  const g = crisisGuidance(lang);
  return { reply: `${g.title}\n${g.body}`, kind: 'crisis', source: 'safety', crisis: g };
}

/** Reply from the rule-based responder, in the API response shape. */
export function localReply(latest, lang, { moods = [], openTasks = [] } = {}) {
  const local = respondLocally({ message: latest, lang, moods, openTasks });
  return { reply: local.text, kind: local.kind, source: 'local', crisis: null };
}
