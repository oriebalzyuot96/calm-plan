import { applyI18n, setLang } from './i18n.js';
import { loadPrefs } from './prefs.js';
import { initTheme } from './theme.js';
import { initSound } from './sound.js';
import { hideCrisis } from './ui.js';
import { initDrawer } from './drawer.js';
import { initBreath } from './breath.js';
import { initToday } from './views/today.js';
import { initMood } from './views/mood.js';
import { initChat } from './views/chat.js';
import { initMeditate } from './views/meditate.js';
import { initSettings } from './views/settings.js';

const VIEWS = ['today', 'mood', 'meditate', 'chat', 'settings'];

function route(focusHeading = false) {
  const name = (location.hash || '#today').slice(1);
  const view = VIEWS.includes(name) ? name : 'today';
  document.documentElement.dataset.view = view;
  for (const section of document.querySelectorAll('.view')) {
    const active = section.dataset.view === view;
    section.hidden = !active;
    if (active) {
      // Restart the staggered entrance animation.
      section.classList.remove('enter');
      void section.offsetWidth;
      section.classList.add('enter');
      if (focusHeading) section.querySelector('h2')?.focus({ preventScroll: true });
    }
  }
  for (const link of document.querySelectorAll('[data-route]')) {
    if (link.dataset.route === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (focusHeading) window.scrollTo({ top: 0 });
  document.dispatchEvent(new CustomEvent('viewchange', { detail: { view } }));
  if (view === 'mood') document.dispatchEvent(new CustomEvent('view:mood'));
}

function boot() {
  const prefs = loadPrefs();
  initTheme();
  setLang(prefs.lang);
  applyI18n(document);
  initSound();

  initToday();
  initMood();
  initChat();
  initMeditate();
  initSettings();
  initBreath();
  initDrawer();

  document.getElementById('crisis').querySelector('[data-crisis-dismiss]').addEventListener('click', hideCrisis);

  window.addEventListener('hashchange', () => route(true));
  route(false);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
