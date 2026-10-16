import { applyI18n, t } from '../i18n.js';
import {
  SESSIONS,
  buildTimeline,
  fadeGain,
  formatClock,
  getSession,
  hiddenTooLong,
  sleepGain,
  stepIndexAt,
} from '../meditation-core.js';
import { renderOrb, resetOrb } from '../orb.js';
import { getPrefs } from '../prefs.js';
import { isAmbientPlaying, play, setAmbientLevel, startAmbient, stopAmbient, unlockAudio } from '../sound.js';
import { el, radioGroup, setStatus } from '../ui.js';

const HIDDEN_LIMIT_MS = 60_000;

const state = {
  sessionId: SESSIONS[0].id,
  scape: 'drone',
  sleepMin: 0,
  mix: false,
  level: 0.7,
  phase: 'idle', // idle | running | paused | done
  elapsed: 0,
  startedAt: 0,
  timeline: [],
  stepIndex: -1,
  clockSecond: -1,
  sleepAnnounced: false,
};

let nodes = {};
let raf = 0;
let interval = 0;
let hiddenTimer = 0;
let hiddenSince = null;
let groups = {};

function session() {
  return getSession(state.sessionId);
}

function totalSeconds() {
  return session().minutes * 60;
}

function currentElapsed() {
  return state.phase === 'running' ? state.elapsed + (performance.now() - state.startedAt) / 1000 : state.elapsed;
}

function soundNote() {
  setStatus(nodes.soundNote, getPrefs().soundOn ? t('medSoundAuto') : t('medSoundOff'));
  nodes.soundNote.classList.remove('error');
}

function buildPicker() {
  nodes.grid.replaceChildren(
    ...SESSIONS.map((s) =>
      el(
        'button',
        { type: 'button', role: 'radio', className: 'session-card', 'data-value': s.id, 'aria-checked': 'false', tabindex: '-1' },
        [
          el('span', { className: 'card-min', 'data-min': s.minutes }),
          el('strong', { 'data-i18n': `med_title_${s.id}` }),
          el('span', { className: 'muted', 'data-i18n': `med_desc_${s.id}` }),
        ],
      ),
    ),
  );
  labelDynamic();
  applyI18n(nodes.grid);
}

function labelDynamic() {
  for (const m of nodes.grid.querySelectorAll('[data-min]')) m.textContent = t('medMinutes', { n: m.dataset.min });
  for (const b of nodes.sleepGrid.querySelectorAll('[data-value]:not([data-i18n])')) {
    b.textContent = t('medSleepMin', { n: b.dataset.value });
  }
}

/* ---------- Audio levels ---------- */

function applyLevel(elapsed) {
  if (!isAmbientPlaying()) return;
  const sleepSec = state.sleepMin * 60;
  const level = state.phase === 'running'
    ? state.level * fadeGain(elapsed, totalSeconds()) * sleepGain(elapsed, sleepSec)
    : 0;
  setAmbientLevel(level);
  if (sleepSec && elapsed >= sleepSec && !state.sleepAnnounced) {
    state.sleepAnnounced = true;
    stopAmbient();
    setStatus(nodes.status, t('medTimerEnded'));
  }
}

function startSound() {
  unlockAudio();
  if (state.scape === 'none' || state.phase === 'done') return;
  if (!isAmbientPlaying() && !state.sleepAnnounced) startAmbient(state.scape);
}

/* ---------- Loop ---------- */

function showStep(index, announce) {
  const step = state.timeline[index];
  if (!step) return;
  const text = t(step.key);
  const stepEl = nodes.step;
  stepEl.classList.add('leaving');
  globalThis.setTimeout(() => {
    stepEl.textContent = text;
    stepEl.classList.remove('leaving');
  }, announce ? 350 : 0);
  nodes.live.textContent = `${t('medStepAnnounce', { n: index + 1, total: state.timeline.length })}. ${text}`;
  if (announce && state.mix) play('step');
}

function tick() {
  if (state.phase !== 'running') return;
  const elapsed = currentElapsed();
  const total = totalSeconds();
  if (elapsed >= total) {
    finish();
    return;
  }
  const idx = stepIndexAt(state.timeline, elapsed);
  if (idx !== state.stepIndex) {
    const first = state.stepIndex === -1;
    state.stepIndex = idx;
    showStep(idx, !first);
  }
  const sec = Math.ceil(total - elapsed);
  if (sec !== state.clockSecond) {
    state.clockSecond = sec;
    nodes.clock.textContent = formatClock(sec);
  }
  applyLevel(elapsed);
}

function frame() {
  if (state.phase !== 'running') return;
  const elapsed = currentElapsed();
  renderOrb(nodes.orb, session().pace, elapsed, { ringProgress: elapsed / totalSeconds() });
  raf = requestAnimationFrame(frame);
}

function startLoops() {
  stopLoops();
  state.startedAt = performance.now();
  state.phase = 'running';
  interval = globalThis.setInterval(tick, 250);
  raf = requestAnimationFrame(frame);
  tick();
}

function stopLoops() {
  cancelAnimationFrame(raf);
  globalThis.clearInterval(interval);
}

/* ---------- Session control ---------- */

function show(which) {
  nodes.picker.hidden = which !== 'picker';
  nodes.player.hidden = which !== 'player';
  nodes.done.hidden = which !== 'done';
}

function begin() {
  const s = session();
  state.timeline = buildTimeline(s);
  state.elapsed = 0;
  state.stepIndex = -1;
  state.clockSecond = -1;
  state.sleepAnnounced = false;
  setStatus(nodes.status, '');
  nodes.nowTitle.textContent = t(`med_title_${s.id}`);
  nodes.nowTitle.dataset.i18n = `med_title_${s.id}`;
  nodes.step.textContent = '';
  nodes.pause.textContent = t('medPause');
  nodes.pause.dataset.i18n = 'medPause';
  show('player');
  startSound();
  startLoops();
  nodes.nowTitle.setAttribute('tabindex', '-1');
  nodes.nowTitle.focus();
}

function pauseSession() {
  if (state.phase !== 'running') return;
  state.elapsed = currentElapsed();
  state.phase = 'paused';
  stopLoops();
  setAmbientLevel(0);
  resetOrbKeep();
  nodes.pause.textContent = t('medResume');
  nodes.pause.dataset.i18n = 'medResume';
}

function resetOrbKeep() {
  nodes.orb.querySelector('.orb-count').textContent = '';
}

function resumeSession() {
  if (state.phase !== 'paused') return;
  startSound();
  startLoops();
  nodes.pause.textContent = t('medPause');
  nodes.pause.dataset.i18n = 'medPause';
  setStatus(nodes.status, '');
}

/** Ends the session. With `completed` true, shows the summary. */
function endSession(completed) {
  stopLoops();
  stopAmbient();
  globalThis.clearTimeout(hiddenTimer);
  const wasActive = state.phase !== 'idle';
  state.phase = completed ? 'done' : 'idle';
  state.elapsed = 0;
  resetOrb(nodes.orb, '');
  if (!wasActive) return;
  if (completed) {
    show('done');
    play('step');
    nodes.doneTitle.focus();
  } else {
    show('picker');
  }
}

function finish() {
  endSession(true);
}

function leaveToPicker() {
  state.phase = 'idle';
  show('picker');
  nodes.begin.focus();
}

/* ---------- Tab hidden / view left ---------- */

function onVisibility() {
  if (document.hidden) {
    hiddenSince = Date.now();
    globalThis.clearTimeout(hiddenTimer);
    hiddenTimer = globalThis.setTimeout(stopForHidden, HIDDEN_LIMIT_MS);
  } else {
    globalThis.clearTimeout(hiddenTimer);
    if (hiddenTooLong(hiddenSince, Date.now(), HIDDEN_LIMIT_MS)) stopForHidden();
    hiddenSince = null;
  }
}

function stopForHidden() {
  if (state.phase === 'running') {
    pauseSession();
    setStatus(nodes.status, t('medStopped'));
  }
  stopAmbient();
}

function onViewChange(event) {
  if (event.detail.view !== 'meditate' && (state.phase === 'running' || state.phase === 'paused')) {
    endSession(false);
  }
  if (event.detail.view !== 'meditate') stopAmbient();
}

/* ---------- Init ---------- */

export function initMeditate() {
  nodes = {
    picker: document.getElementById('med-picker'),
    player: document.getElementById('med-player'),
    done: document.getElementById('med-done'),
    grid: document.getElementById('session-grid'),
    scapeGrid: document.getElementById('scape-grid'),
    sleepGrid: document.getElementById('sleep-grid'),
    volume: document.getElementById('med-volume'),
    mix: document.getElementById('med-mix'),
    soundNote: document.getElementById('med-sound-note'),
    begin: document.getElementById('med-begin'),
    nowTitle: document.getElementById('med-now-title'),
    orb: document.getElementById('med-orb'),
    clock: document.getElementById('med-clock'),
    step: document.getElementById('med-step'),
    live: document.getElementById('med-live'),
    pause: document.getElementById('med-pause'),
    end: document.getElementById('med-end'),
    status: document.getElementById('med-status'),
    doneTitle: document.getElementById('med-done-title'),
    doneBack: document.getElementById('med-done-back'),
  };

  buildPicker();
  groups.session = radioGroup(nodes.grid, { initial: state.sessionId, onSelect: (v) => (state.sessionId = v) });
  groups.scape = radioGroup(nodes.scapeGrid, {
    initial: state.scape,
    onSelect: (v) => {
      state.scape = v;
      play('tick');
    },
  });
  groups.sleep = radioGroup(nodes.sleepGrid, {
    initial: String(state.sleepMin),
    onSelect: (v) => {
      state.sleepMin = Number(v);
      play('tick');
    },
  });
  nodes.volume.value = String(Math.round(state.level * 100));
  nodes.volume.addEventListener('input', () => {
    state.level = Number(nodes.volume.value) / 100;
    applyLevel(currentElapsed());
  });
  nodes.mix.addEventListener('change', () => (state.mix = nodes.mix.checked));

  nodes.begin.addEventListener('click', begin);
  nodes.pause.addEventListener('click', () => (state.phase === 'running' ? pauseSession() : resumeSession()));
  nodes.end.addEventListener('click', () => {
    endSession(false);
    nodes.begin.focus();
  });
  nodes.doneBack.addEventListener('click', leaveToPicker);

  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('viewchange', onViewChange);
  document.addEventListener('prefschange', (event) => {
    if (event.detail.changed.includes('soundOn')) soundNote();
  });
  document.addEventListener('langchange', () => {
    labelDynamic();
    if (state.phase === 'running' || state.phase === 'paused') {
      nodes.nowTitle.textContent = t(`med_title_${state.sessionId}`);
      const step = state.timeline[state.stepIndex];
      if (step) nodes.step.textContent = t(step.key);
    }
    soundNote();
  });
  globalThis.addEventListener('pagehide', () => stopAmbient(true));

  resetOrb(nodes.orb, '');
  soundNote();
  show('picker');
}
