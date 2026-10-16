// Pure meditation logic: session catalogue, timeline, breathing phase, fades, sleep timer.
// No DOM or audio here, so it is covered by node tests.

export const SESSIONS = [
  { id: 'breath', minutes: 3, pace: { in: 4, hold: 4, out: 6 }, steps: [['med_breath_1', 1], ['med_breath_2', 2], ['med_breath_3', 3], ['med_breath_4', 3], ['med_breath_5', 2], ['med_breath_6', 1]] },
  { id: 'ground', minutes: 5, pace: { in: 4, hold: 2, out: 6 }, steps: [['med_ground_1', 1], ['med_ground_2', 2], ['med_ground_3', 2], ['med_ground_4', 2], ['med_ground_5', 2], ['med_ground_6', 2], ['med_ground_7', 1]] },
  { id: 'thanks', minutes: 5, pace: { in: 4, hold: 2, out: 6 }, steps: [['med_thanks_1', 1], ['med_thanks_2', 2], ['med_thanks_3', 2], ['med_thanks_4', 2], ['med_thanks_5', 1]] },
  { id: 'body', minutes: 10, pace: { in: 4, hold: 2, out: 6 }, steps: [['med_body_1', 1], ['med_body_2', 2], ['med_body_3', 2], ['med_body_4', 2], ['med_body_5', 2], ['med_body_6', 2], ['med_body_7', 2], ['med_body_8', 1]] },
  { id: 'sleep', minutes: 15, pace: { in: 4, hold: 4, out: 8 }, steps: [['med_sleep_1', 1], ['med_sleep_2', 2], ['med_sleep_3', 3], ['med_sleep_4', 3], ['med_sleep_5', 3], ['med_sleep_6', 2], ['med_sleep_7', 1]] },
];

export const SOUNDSCAPES = ['drone', 'bowls', 'rain', 'ocean'];
export const SLEEP_TIMER_OPTIONS = [0, 5, 10, 15, 30]; // minutes, 0 = off
export const SESSION_FADE_SECONDS = 6;

export function getSession(id) {
  return SESSIONS.find((s) => s.id === id) || null;
}

/** Every i18n key the catalogue needs. Used by tests. */
export function sessionKeys() {
  const keys = [];
  for (const s of SESSIONS) {
    keys.push(`med_title_${s.id}`, `med_desc_${s.id}`);
    for (const [k] of s.steps) keys.push(k);
  }
  return keys;
}

/**
 * Splits `totalSeconds` over weighted steps with whole seconds, exactly summing to the total
 * (largest remainder method).
 */
export function allocate(totalSeconds, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * totalSeconds);
  const out = raw.map(Math.floor);
  let left = totalSeconds - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let n = 0; left > 0; n += 1, left -= 1) out[order[n % order.length].i] += 1;
  return out;
}

/** Returns [{ key, start, end, seconds }] covering exactly the session length. */
export function buildTimeline(session) {
  const total = session.minutes * 60;
  const secs = allocate(total, session.steps.map(([, w]) => w));
  let t = 0;
  return session.steps.map(([key], i) => {
    const step = { key, start: t, end: t + secs[i], seconds: secs[i] };
    t += secs[i];
    return step;
  });
}

/** Index of the step active at `elapsed` seconds, or -1 when finished. */
export function stepIndexAt(timeline, elapsed) {
  if (elapsed < 0) return 0;
  for (let i = 0; i < timeline.length; i += 1) if (elapsed < timeline[i].end) return i;
  return -1;
}

/** Breathing phase for the orb: { phase, progress 0..1, scale 0..1, remaining whole seconds }. */
export function phaseAt(pace, elapsed) {
  const cycle = pace.in + pace.hold + pace.out;
  const t = ((elapsed % cycle) + cycle) % cycle;
  if (t < pace.in) return { phase: 'in', progress: t / pace.in, scale: ease(t / pace.in), count: Math.ceil(pace.in - t) };
  if (t < pace.in + pace.hold) return { phase: 'hold', progress: (t - pace.in) / pace.hold, scale: 1, count: Math.ceil(pace.in + pace.hold - t) };
  const o = (t - pace.in - pace.hold) / pace.out;
  return { phase: 'out', progress: o, scale: 1 - ease(o), count: Math.ceil(cycle - t) };
}

function ease(x) {
  const c = Math.max(0, Math.min(1, x));
  return 0.5 - 0.5 * Math.cos(Math.PI * c);
}

/** Smooth fade in at the start and fade out at the end of a session. Returns 0..1. */
export function fadeGain(elapsed, total, fadeSeconds = SESSION_FADE_SECONDS) {
  if (total <= 0) return 0;
  const f = Math.min(fadeSeconds, total / 2);
  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 0;
  if (elapsed < f) return ease(elapsed / f);
  if (elapsed > total - f) return ease((total - elapsed) / f);
  return 1;
}

/**
 * Sleep timer: full volume until (sleepSeconds - fadeSeconds), then a smooth fade to zero.
 * sleepSeconds of 0 or null means the timer is off (always 1).
 */
export function sleepGain(elapsed, sleepSeconds, fadeSeconds = 20) {
  if (!sleepSeconds) return 1;
  const f = Math.min(fadeSeconds, sleepSeconds);
  const start = sleepSeconds - f;
  if (elapsed <= start) return 1;
  if (elapsed >= sleepSeconds) return 0;
  return ease((sleepSeconds - elapsed) / f);
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Should audio stop because the tab has been hidden too long? */
export function hiddenTooLong(hiddenSince, now, limitMs = 60_000) {
  return hiddenSince !== null && now - hiddenSince >= limitMs;
}
