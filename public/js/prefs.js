import { PALETTE_IDS, CONTRAST_MODES, THEMES } from './palettes.js';
import { normaliseHue } from './color.js';

// ONLY these preferences are ever stored. Never chat, mood or task text.
export const PREF_KEYS = ['lang', 'theme', 'palette', 'accentHue', 'contrast', 'textSize', 'reduceMotion', 'soundOn', 'volume'];
export const DEFAULTS = Object.freeze({
  lang: 'ar',
  theme: 'system',
  palette: 'sea',
  accentHue: null,
  contrast: 'standard',
  textSize: 1,
  reduceMotion: false,
  soundOn: true,
  volume: 40,
});

const KEY = 'calmPlan.prefs';

/** Validates untrusted input and returns a complete prefs object with only known keys. */
export function sanitizePrefs(input) {
  const p = input && typeof input === 'object' ? input : {};
  const size = Number(p.textSize);
  const vol = Number(p.volume);
  return {
    lang: p.lang === 'en' ? 'en' : 'ar',
    theme: THEMES.includes(p.theme) ? p.theme : DEFAULTS.theme,
    palette: PALETTE_IDS.includes(p.palette) ? p.palette : DEFAULTS.palette,
    accentHue: p.accentHue === null || p.accentHue === undefined ? null : normaliseHue(p.accentHue),
    contrast: CONTRAST_MODES.includes(p.contrast) ? p.contrast : DEFAULTS.contrast,
    textSize: Number.isInteger(size) && size >= 0 && size <= 3 ? size : DEFAULTS.textSize,
    reduceMotion: p.reduceMotion === true,
    soundOn: p.soundOn === false ? false : true,
    volume: Number.isFinite(vol) ? Math.max(0, Math.min(100, Math.round(vol))) : DEFAULTS.volume,
  };
}

let current = { ...DEFAULTS };

export function loadPrefs() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    current = sanitizePrefs(raw ? JSON.parse(raw) : {});
  } catch {
    current = { ...DEFAULTS };
  }
  return { ...current };
}

function savePrefs() {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage may be blocked. The page still works.
  }
}

export function getPrefs() {
  return { ...current };
}

/** Merges a patch, stores it, and tells the rest of the app. */
export function updatePrefs(patch) {
  const before = current;
  current = sanitizePrefs({ ...current, ...patch });
  savePrefs();
  const changed = PREF_KEYS.filter((k) => before[k] !== current[k]);
  if (changed.length && typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('prefschange', { detail: { prefs: { ...current }, changed } }));
  }
  return { ...current };
}

export function resetPrefs() {
  return updatePrefs({ ...DEFAULTS, lang: current.lang });
}
