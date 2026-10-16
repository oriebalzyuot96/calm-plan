import { crisisGuidance, detectCrisis } from './crisis.js';
import { isMedicalTopic, respondLocally } from './responder.js';

export const SYSTEM_PROMPT = `You are a gentle, supportive self-help companion inside a personal wellbeing app called Calm Plan.

Rules you must always follow:
- You are NOT a therapist, counsellor, doctor, or crisis service. Say so when it is relevant, briefly.
- Never give medical advice, medication advice, dosages, or diagnoses. If asked, politely decline and suggest a doctor, pharmacist, or other qualified professional.
- If the user mentions wanting to hurt themselves or end their life, encourage them to contact local emergency services or a trusted person right away, and a local mental-health helpline. Do not try to counsel them through it.
- Keep replies short (at most about 120 words), warm, calm, and practical. Ask one gentle follow-up question at most.
- Offer a breathing exercise or a short grounding step when it fits.
- Reply in the same language the user writes in. If unclear, use the language code given by the app.
- Never claim to remember earlier sessions. Do not invent facts about the user.`;

/**
 * Produces the chat reply. Order: crisis check (never calls a model), then
 * medical refusal (local only), then the Anthropic API if a key is set, then
 * the local responder as the fallback.
 */
export async function respondToChat({ messages, lang, apiKey, model, fetchImpl, getContext }) {
  const latest = messages[messages.length - 1].content;

  if (detectCrisis(latest)) {
    const g = crisisGuidance(lang);
    return {
      reply: `${g.title}\n${g.body}`,
      kind: 'crisis',
      source: 'safety',
      crisis: g,
    };
  }

  if (apiKey && !isMedicalTopic(latest)) {
    try {
      const reply = await callAnthropic({ apiKey, model, lang, messages, fetchImpl });
      return { reply, kind: 'supportive', source: 'anthropic', crisis: null };
    } catch {
      // Fall through to the local responder. Errors are not logged, since they
      // could carry user content.
    }
  }

  const ctx = getContext ? getContext() : { moods: [], openTasks: [] };
  const local = respondLocally({ message: latest, lang, moods: ctx.moods, openTasks: ctx.openTasks });
  return { reply: local.text, kind: local.kind, source: 'local', crisis: null };
}

export async function callAnthropic({ apiKey, model, lang, messages, fetchImpl = globalThis.fetch }) {
  // Send only the last 10 turns, and make sure the first turn is from the user.
  let turns = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
  while (turns.length && turns[0].role !== 'user') turns = turns.slice(1);
  if (!turns.length) throw new Error('no_user_turn');

  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system: `${SYSTEM_PROMPT}\nApp language code: ${lang === 'en' ? 'en' : 'ar'}.`,
      messages: turns,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`anthropic_status_${res.status}`);
  const data = await res.json();
  const text = (Array.isArray(data.content) ? data.content : [])
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('anthropic_empty');
  return text.slice(0, 2000);
}
