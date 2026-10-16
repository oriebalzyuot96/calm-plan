import { api } from '../api.js';
import { getLang, t } from '../i18n.js';
import { el, errorMessage, setStatus, showCrisis } from '../ui.js';
import { play } from '../sound.js';
import { openBreathing } from '../breath.js';

const MAX_HISTORY = 12;
const MAX_CHARS = 1000;
let history = [];
let logEl;
let inputEl;
let statusEl;
let busy = false;

function addBubble(role, text, meta = '', quiet = true) {
  const wrap = el('div', { className: `msg ${role}` }, [
    el('div', { text }),
    meta ? el('div', { className: 'msg-meta', text: meta }) : null,
  ]);
  const label = role === 'user' ? t('chatYou') : t('chatCompanion');
  wrap.setAttribute('aria-label', label);
  logEl.append(wrap);
  if (!quiet) play('pop');
  logEl.scrollTop = logEl.scrollHeight;
}

function renderChips() {
  const chips = document.getElementById('chat-chips');
  chips.setAttribute('aria-label', t('chatSuggestions'));
  chips.replaceChildren(
    el('button', { type: 'button', className: 'chip chip-breath', 'data-breath': 'open', text: t('chipBreath') }),
    ...[1, 2, 3, 4].map((n) =>
      el('button', {
        type: 'button',
        className: 'chip',
        'data-msg': t(`chipMsg${n}`),
        text: t(`chip${n}`),
      }),
    ),
  );
}

async function send(text) {
  const content = text.trim();
  if (!content || busy) return;
  if (content.length > MAX_CHARS) {
    setStatus(statusEl, t('chatTooLong'), true);
    return;
  }
  busy = true;
  setStatus(statusEl, '');
  addBubble('user', content);
  history.push({ role: 'user', content });
  history = history.slice(-MAX_HISTORY);
  inputEl.value = '';
  logEl.setAttribute('aria-busy', 'true');
  const pending = el('p', { className: 'muted', text: t('chatBusy') });
  logEl.append(pending);

  try {
    const result = await api.chat({ messages: history, lang: getLang() });
    pending.remove();
    addBubble(
      'assistant',
      result.reply,
      result.source === 'anthropic' ? t('chatSourceApi') : t('chatSource'),
      false,
    );
    history.push({ role: 'assistant', content: result.reply });
    history = history.slice(-MAX_HISTORY);
    if (result.crisis) showCrisis(result.crisis);
  } catch (err) {
    pending.remove();
    setStatus(statusEl, errorMessage(err), true);
    addBubble('assistant', t('chatError'), '', false);
    // Drop the unanswered user message so the next turn is well formed.
    history.pop();
  } finally {
    busy = false;
    logEl.setAttribute('aria-busy', 'false');
  }
}

function renderWelcome() {
  logEl.replaceChildren();
  addBubble('assistant', t('chatWelcome'));
}

export function initChat() {
  logEl = document.getElementById('chat-log');
  inputEl = document.getElementById('chat-input');
  statusEl = document.getElementById('chat-status');
  const form = document.getElementById('chat-form');

  logEl.setAttribute('aria-label', t('chatLog'));
  renderChips();
  renderWelcome();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    send(inputEl.value);
  });

  inputEl.addEventListener('keydown', (event) => {
    // Enter sends; Shift+Enter inserts a new line.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      send(inputEl.value);
    }
  });

  document.getElementById('chat-chips').addEventListener('click', (event) => {
    const breath = event.target.closest('button[data-breath]');
    if (breath) {
      openBreathing(breath);
      return;
    }
    const chip = event.target.closest('button[data-msg]');
    if (chip) send(chip.dataset.msg);
  });

  document.addEventListener('langchange', () => {
    logEl.setAttribute('aria-label', t('chatLog'));
    renderChips();
    if (history.length === 0 && logEl.children.length <= 1) renderWelcome();
  });
}
