import { applyI18n, setLang } from './i18n.js';
import { hideCrisis } from './ui.js';
import { initToday } from './views/today.js';
import { initMood } from './views/mood.js';
import { initChat } from './views/chat.js';
import { initSettings, applyPrefs, loadPrefs } from './views/settings.js';

const VIEWS = ['today', 'mood', 'chat', 'settings'];

function route(focusHeading = false) {
  const name = (location.hash || '#today').slice(1);
  const view = VIEWS.includes(name) ? name : 'today';
  for (const section of document.querySelectorAll('.view')) {
    const active = section.dataset.view === view;
    section.hidden = !active;
    if (active && focusHeading) section.querySelector('h2')?.focus();
  }
  for (const link of document.querySelectorAll('[data-route]')) {
    if (link.dataset.route === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (view === 'mood') document.dispatchEvent(new CustomEvent('view:mood'));
}

function boot() {
  const prefs = loadPrefs();
  applyPrefs(prefs);
  setLang(prefs.lang);
  applyI18n(document);

  initToday();
  initMood();
  initChat();
  initSettings();

  document.getElementById('crisis').querySelector('[data-crisis-dismiss]').addEventListener('click', hideCrisis);

  window.addEventListener('hashchange', () => route(true));
  route(false);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
