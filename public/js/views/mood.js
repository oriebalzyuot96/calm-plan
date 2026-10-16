import { api } from '../api.js';
import { getLang, t } from '../i18n.js';
import { el, errorMessage, setStatus, showCrisis } from '../ui.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DAYS = 14;
const W = 640;
const H = 240;
const PAD_X = 36;
const PAD_Y = 22;

let selected = null;
let statusEl;
let group;
let noteEl;

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Builds one bucket per local day for the last 14 days, oldest first. */
function buckets(moods) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const days = [];
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ key: dayKey(d), date: d, scores: [] });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const m of moods) {
    const bucket = byKey.get(dayKey(new Date(m.createdAt)));
    if (bucket) bucket.scores.push(m.score);
  }
  return days.map((d) => ({
    ...d,
    avg: d.scores.length ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : null,
  }));
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function renderChart(days) {
  const wrap = document.getElementById('mood-chart');
  const x = (i) => PAD_X + (i / (DAYS - 1)) * (W - PAD_X * 2);
  const y = (score) => PAD_Y + ((5 - score) / 4) * (H - PAD_Y * 2 - 18);
  const locale = getLang() === 'ar' ? 'ar' : 'en-GB';

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-labelledby': 'mood-chart-title',
    focusable: 'false',
  });
  const title = svgEl('title', { id: 'mood-chart-title' });
  title.textContent = t('chartAria');
  svg.append(title);

  for (let s = 1; s <= 5; s += 1) {
    svg.append(svgEl('line', { class: 'chart-grid', x1: PAD_X, x2: W - PAD_X, y1: y(s), y2: y(s) }));
    const label = svgEl('text', { class: 'chart-label', x: PAD_X - 10, y: y(s) + 4, 'text-anchor': 'end' });
    label.textContent = String(s);
    svg.append(label);
  }

  const points = days.map((d, i) => ({ i, avg: d.avg })).filter((p) => p.avg !== null);
  if (points.length > 1) {
    svg.append(
      svgEl('polyline', {
        class: 'chart-line',
        points: points.map((p) => `${x(p.i)},${y(p.avg)}`).join(' '),
      }),
    );
  }
  for (const p of points) {
    const dot = svgEl('circle', { class: 'chart-dot', cx: x(p.i), cy: y(p.avg), r: 5 });
    const tip = svgEl('title');
    tip.textContent = `${days[p.i].date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}: ${p.avg.toFixed(1)}`;
    dot.append(tip);
    svg.append(dot);
  }

  days.forEach((d, i) => {
    if (i % 2 !== 0 && i !== DAYS - 1) return;
    const label = svgEl('text', { class: 'chart-label', x: x(i), y: H - 2, 'text-anchor': 'middle' });
    label.textContent = d.date.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' });
    svg.append(label);
  });

  wrap.replaceChildren(svg);

  const tbody = document.querySelector('#mood-table tbody');
  tbody.replaceChildren(
    ...days.map((d) =>
      el('tr', {}, [
        el('td', { text: d.date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) }),
        el('td', { text: d.avg === null ? '-' : d.avg.toFixed(1) }),
      ]),
    ),
  );

  const withData = points.map((p) => p.avg);
  const summary = document.getElementById('mood-summary');
  if (!withData.length) {
    summary.textContent = t('chartSummaryNone');
  } else {
    const avg = withData.reduce((a, b) => a + b, 0) / withData.length;
    summary.textContent = t('chartSummary', { days: withData.length, avg: avg.toFixed(1) });
  }
}

function setSelected(score, focus = false) {
  selected = score;
  for (const btn of group.querySelectorAll('[role="radio"]')) {
    const on = Number(btn.dataset.score) === score;
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.tabIndex = on || (score === null && btn.dataset.score === '1') ? 0 : -1;
    if (on && focus) btn.focus();
  }
}

async function loadChart() {
  try {
    const { moods } = await api.listMoods(DAYS);
    renderChart(buckets(moods));
  } catch (err) {
    setStatus(statusEl, errorMessage(err), true);
  }
}

export function initMood() {
  const form = document.getElementById('mood-form');
  statusEl = document.getElementById('mood-status');
  group = document.getElementById('mood-group');
  noteEl = document.getElementById('mood-note');

  group.addEventListener('click', (event) => {
    const btn = event.target.closest('[role="radio"]');
    if (btn) setSelected(Number(btn.dataset.score));
  });

  group.addEventListener('keydown', (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = selected ?? 3;
    let next = current;
    if (event.key === 'Home') next = 1;
    else if (event.key === 'End') next = 5;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(1, current - 1);
    else next = Math.min(5, current + 1);
    setSelected(next, true);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selected) {
      setStatus(statusEl, t('selectMoodFirst'), true);
      group.querySelector('[role="radio"]').focus();
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const result = await api.createMood({
        score: selected,
        note: noteEl.value,
        lang: getLang(),
      });
      setStatus(statusEl, t('moodSaved'));
      noteEl.value = '';
      setSelected(null);
      if (result.crisis) showCrisis(result.crisis);
      await loadChart();
    } catch (err) {
      setStatus(statusEl, errorMessage(err), true);
    } finally {
      submit.disabled = false;
    }
  });

  setSelected(null);
  document.addEventListener('view:mood', loadChart);
  document.addEventListener('langchange', loadChart);
  document.addEventListener('datacleared', loadChart);
}
