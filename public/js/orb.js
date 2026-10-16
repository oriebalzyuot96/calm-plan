import { t } from './i18n.js';
import { phaseAt } from './meditation-core.js';
import { prefersReducedMotion } from './theme.js';

const PHASE_KEY = { in: 'breathIn', hold: 'breathHold', out: 'breathOut' };

/**
 * Draws one frame of a breathing orb into a `[data-orb]` stage.
 * Returns the phase so callers can announce changes.
 * With reduced motion the orb does not move: only the text cue changes.
 */
export function renderOrb(stage, pace, elapsed, { ringProgress = null } = {}) {
  const ph = phaseAt(pace, elapsed);
  const scale = prefersReducedMotion() ? 0.75 : 0.55 + 0.45 * ph.scale;
  stage.style.setProperty('--orb-scale', scale.toFixed(3));
  const ring = ringProgress === null ? ph.progress : ringProgress;
  stage.style.setProperty('--ring', (Math.max(0, Math.min(1, ring)) * 100).toFixed(2));
  stage.dataset.phase = ph.phase;
  stage.querySelector('.orb-phase').textContent = t(PHASE_KEY[ph.phase]);
  stage.querySelector('.orb-count').textContent = String(ph.count);
  return ph;
}

export function resetOrb(stage, text = '') {
  stage.style.setProperty('--orb-scale', '0.55');
  stage.style.setProperty('--ring', '0');
  delete stage.dataset.phase;
  stage.querySelector('.orb-phase').textContent = text;
  stage.querySelector('.orb-count').textContent = '';
}
