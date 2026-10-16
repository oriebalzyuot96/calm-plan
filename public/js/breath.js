import { t } from './i18n.js';
import { renderOrb, resetOrb } from './orb.js';

const PACE = { in: 4, hold: 4, out: 6 };
let dialog;
let stage;
let toggle;
let live;
let running = false;
let raf = 0;
let startedAt = 0;
let pausedElapsed = 0;
let lastPhase = '';
let opener = null;

function frame(now) {
  if (!running) return;
  const elapsed = pausedElapsed + (now - startedAt) / 1000;
  const ph = renderOrb(stage, PACE, elapsed);
  if (ph.phase !== lastPhase) {
    lastPhase = ph.phase;
    live.textContent = stage.querySelector('.orb-phase').textContent;
  }
  raf = requestAnimationFrame(frame);
}

function start() {
  running = true;
  startedAt = performance.now();
  toggle.textContent = t('breathPause');
  raf = requestAnimationFrame(frame);
}

function pause() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(raf);
  pausedElapsed += (performance.now() - startedAt) / 1000;
  toggle.textContent = t('breathStart');
}

function reset() {
  pause();
  pausedElapsed = 0;
  lastPhase = '';
  live.textContent = '';
  resetOrb(stage, t('breathReady'));
}

export function openBreathing(from) {
  opener = from instanceof HTMLElement ? from : document.activeElement;
  reset();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  toggle.focus();
}

export function initBreath() {
  dialog = document.getElementById('breath-dialog');
  stage = document.getElementById('breath-orb');
  toggle = document.getElementById('breath-toggle');
  live = document.getElementById('breath-live');
  toggle.addEventListener('click', () => (running ? pause() : start()));
  document.getElementById('breath-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    reset();
    if (opener && document.contains(opener)) opener.focus();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener('langchange', () => {
    if (!running && !pausedElapsed) resetOrb(stage, t('breathReady'));
    toggle.textContent = running ? t('breathPause') : t('breathStart');
  });
  resetOrb(stage, t('breathReady'));
}
