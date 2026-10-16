import { adjustAccent } from './color.js';
import { PALETTES } from './palettes.js';
import { getPrefs } from './prefs.js';

const root = () => document.documentElement;

export function prefersReducedMotion() {
  return getPrefs().reduceMotion || Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/** Writes the current preferences onto <html> as data attributes and CSS custom properties. */
export function applyTheme(prefs = getPrefs()) {
  const html = root();
  html.dataset.theme = prefs.theme;
  html.dataset.palette = prefs.palette;
  html.dataset.contrast = prefs.contrast;
  html.dataset.textSize = String(prefs.textSize);
  if (prefs.reduceMotion) html.dataset.reduceMotion = 'true';
  else delete html.dataset.reduceMotion;

  const palette = PALETTES.find((p) => p.id === prefs.palette) || PALETTES[0];
  const hue = prefs.accentHue ?? palette.hue;
  const custom = prefs.accentHue !== null;
  const min = prefs.contrast === 'high' ? 7 : 4.5;
  if (!custom && prefs.contrast === 'standard') {
    // The palette's own accent is already checked by tests.
    html.style.removeProperty('--acc-user');
    html.style.removeProperty('--ink-user');
    return;
  }
  const light = adjustAccent({ hue, saturation: palette.sat, mode: 'light', backgrounds: palette.light, min });
  const dark = adjustAccent({ hue, saturation: palette.sat, mode: 'dark', backgrounds: palette.dark, min });
  html.style.setProperty('--acc-user', `light-dark(${light.accent}, ${dark.accent})`);
  html.style.setProperty('--ink-user', `light-dark(${light.ink}, ${dark.ink})`);
}

/**
 * Runs a theme change with a View Transition when possible.
 * kind 'reveal': a circle grows from the pressed control (light/dark/contrast).
 * kind 'fade': a cross-fade (palette and accent).
 * Falls back to an instant change when unsupported or when motion is reduced.
 */
export function transitionChange(change, { origin = null, kind = 'fade' } = {}) {
  const supported = typeof document.startViewTransition === 'function';
  if (!supported || prefersReducedMotion()) {
    change();
    return;
  }
  const html = root();
  let x = innerWidth / 2;
  let y = 0;
  if (origin instanceof Element) {
    const r = origin.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  }
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  html.style.setProperty('--vt-x', `${Math.round(x)}px`);
  html.style.setProperty('--vt-y', `${Math.round(y)}px`);
  html.style.setProperty('--vt-r', `${Math.ceil(radius)}px`);
  html.dataset.vt = kind;
  let transition;
  try {
    transition = document.startViewTransition(() => {
      change();
    });
  } catch {
    delete html.dataset.vt;
    change();
    return;
  }
  const done = () => {
    delete html.dataset.vt;
  };
  transition.finished.then(done, done);
}

export function initTheme() {
  applyTheme(getPrefs());
  document.addEventListener('prefschange', (event) => {
    applyTheme(event.detail.prefs);
  });
}
