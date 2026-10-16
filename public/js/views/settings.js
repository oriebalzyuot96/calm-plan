import { api } from '../api.js';
import { setLang, t } from '../i18n.js';
import { confirmDialog, errorMessage, setStatus } from '../ui.js';

const KEY = 'calmPlan.prefs';
const DEFAULTS = { lang: 'ar', theme: 'system', reduceMotion: false };

/** Device-level preferences. Stored in localStorage, which is fine for these. */
export function loadPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      lang: parsed.lang === 'en' ? 'en' : 'ar',
      theme: ['system', 'light', 'dark'].includes(parsed.theme) ? parsed.theme : 'system',
      reduceMotion: parsed.reduceMotion === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage may be blocked (private mode). The page still works.
  }
}

let current = { ...DEFAULTS };

export function applyPrefs(prefs) {
  current = { ...prefs };
  const html = document.documentElement;
  html.dataset.theme = prefs.theme;
  if (prefs.reduceMotion) html.dataset.reduceMotion = 'true';
  else delete html.dataset.reduceMotion;
}

export function initSettings() {
  const langSelect = document.getElementById('lang-select');
  const themeSelect = document.getElementById('theme-select');
  const motion = document.getElementById('motion-toggle');
  const eraseBtn = document.getElementById('erase-btn');
  const status = document.getElementById('settings-status');

  langSelect.value = current.lang;
  themeSelect.value = current.theme;
  motion.checked = current.reduceMotion;

  langSelect.addEventListener('change', () => {
    current.lang = langSelect.value === 'en' ? 'en' : 'ar';
    setLang(current.lang);
    savePrefs(current);
  });

  themeSelect.addEventListener('change', () => {
    current.theme = themeSelect.value;
    applyPrefs(current);
    savePrefs(current);
  });

  motion.addEventListener('change', () => {
    current.reduceMotion = motion.checked;
    applyPrefs(current);
    savePrefs(current);
  });

  eraseBtn.addEventListener('click', async () => {
    const ok = await confirmDialog(`${t('eraseTitle')} ${t('eraseText')}`, t('confirmErase'));
    if (!ok) {
      eraseBtn.focus();
      return;
    }
    eraseBtn.disabled = true;
    setStatus(status, t('erasing'));
    try {
      await api.eraseAll();
      setStatus(status, t('erased'));
      document.dispatchEvent(new CustomEvent('datacleared'));
    } catch (err) {
      setStatus(status, errorMessage(err), true);
    } finally {
      eraseBtn.disabled = false;
    }
  });

  document.addEventListener('langchange', () => {
    langSelect.value = current.lang;
  });
}
