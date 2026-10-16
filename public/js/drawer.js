import { adjustAccent } from './color.js';
import { ACCENT_SWATCHES, PALETTES } from './palettes.js';
import { applyI18n, setLang, t } from './i18n.js';
import { getPrefs, resetPrefs, updatePrefs } from './prefs.js';
import { play } from './sound.js';
import { applyTheme, transitionChange } from './theme.js';
import { radioGroup, setStatus } from './ui.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

let drawer;
let scrim;
let opener = null;
let isOpen = false;
const groups = new Map();

function outsideNodes() {
  return [...document.body.children].filter(
    (n) => n !== drawer && n !== scrim && !['SCRIPT', 'DIALOG'].includes(n.tagName),
  );
}

export function openDrawer(from) {
  if (isOpen) return;
  isOpen = true;
  opener = from instanceof HTMLElement ? from : document.activeElement;
  drawer.inert = false;
  drawer.classList.add('open');
  scrim.classList.add('show');
  document.body.classList.add('drawer-open');
  for (const n of outsideNodes()) n.inert = true;
  document.getElementById('open-drawer')?.setAttribute('aria-expanded', 'true');
  syncDrawer(getPrefs());
  requestAnimationFrame(() => document.getElementById('drawer-close').focus());
}

export function closeDrawer() {
  if (!isOpen) return;
  isOpen = false;
  drawer.classList.remove('open');
  scrim.classList.remove('show');
  document.body.classList.remove('drawer-open');
  for (const n of outsideNodes()) n.inert = false;
  drawer.inert = true;
  document.getElementById('open-drawer')?.setAttribute('aria-expanded', 'false');
  if (opener && document.contains(opener)) opener.focus();
  opener = null;
}

function trapTab(event) {
  const items = [...drawer.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (!drawer.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
}

function syncDrawer(p) {
  groups.get('theme')?.setValue(p.theme);
  groups.get('palette')?.setValue(p.palette);
  groups.get('contrast')?.setValue(p.contrast);
  groups.get('textSize')?.setValue(String(p.textSize));
  groups.get('lang')?.setValue(p.lang);
  groups.get('accent')?.setValue(p.accentHue === null ? 'auto' : ACCENT_SWATCHES.map(String).includes(String(p.accentHue)) ? String(p.accentHue) : null);
  document.getElementById('hue').value = String(p.accentHue ?? PALETTES.find((x) => x.id === p.palette)?.hue ?? 190);
  document.getElementById('motion-toggle').checked = p.reduceMotion;
  document.getElementById('sound-toggle').checked = p.soundOn;
  const vol = document.getElementById('volume');
  vol.value = String(p.volume);
  vol.disabled = !p.soundOn;
  vol.setAttribute('aria-valuetext', `${p.volume}%`);
}

function paintSwatches() {
  const p = getPrefs();
  const palette = PALETTES.find((x) => x.id === p.palette) || PALETTES[0];
  for (const sw of document.querySelectorAll('#swatches .swatch:not(.swatch-auto)')) {
    const hue = Number(sw.dataset.value);
    const light = adjustAccent({ hue, saturation: palette.sat, mode: 'light', backgrounds: palette.light });
    const dark = adjustAccent({ hue, saturation: palette.sat, mode: 'dark', backgrounds: palette.dark });
    sw.style.setProperty('--sw', `light-dark(${light.accent}, ${dark.accent})`);
  }
}

export function initDrawer() {
  drawer = document.getElementById('drawer');
  scrim = document.getElementById('scrim');
  const openBtn = document.getElementById('open-drawer');

  openBtn.addEventListener('click', () => openDrawer(openBtn));
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
    } else if (event.key === 'Tab') {
      trapTab(event);
    }
  });

  for (const el of drawer.querySelectorAll('[data-pref]')) {
    const key = el.dataset.pref;
    const kind = el.dataset.kind;
    groups.set(
      key,
      radioGroup(el, {
        onSelect: (value, btn) => {
          const patch = { [key]: key === 'textSize' ? Number(value) : value };
          if (key === 'lang') {
            setLang(value);
            updatePrefs(patch);
            play('tick');
            return;
          }
          const change = () => updatePrefs(patch);
          if (kind === 'none') change();
          else transitionChange(change, { origin: btn, kind });
          play('tick');
        },
      }),
    );
  }

  groups.set(
    'accent',
    radioGroup(document.getElementById('swatches'), {
      onSelect: (value, btn) => {
        const hue = value === 'auto' ? null : Number(value);
        transitionChange(() => updatePrefs({ accentHue: hue }), { origin: btn, kind: 'fade' });
        play('tick');
      },
    }),
  );

  document.getElementById('hue').addEventListener('input', (event) => {
    updatePrefs({ accentHue: Number(event.target.value) });
  });
  document.getElementById('motion-toggle').addEventListener('change', (event) => {
    updatePrefs({ reduceMotion: event.target.checked });
  });
  document.getElementById('sound-toggle').addEventListener('change', (event) => {
    updatePrefs({ soundOn: event.target.checked });
  });
  document.getElementById('volume').addEventListener('input', (event) => {
    updatePrefs({ volume: Number(event.target.value) });
  });
  document.getElementById('volume').addEventListener('change', () => play('tick'));
  document.getElementById('drawer-reset').addEventListener('click', (event) => {
    transitionChange(
      () => {
        resetPrefs();
        applyTheme(getPrefs());
      },
      { origin: event.currentTarget, kind: 'fade' },
    );
    setStatus(document.getElementById('drawer-status'), t('drawerResetDone'));
  });

  document.addEventListener('prefschange', (event) => {
    syncDrawer(event.detail.prefs);
    paintSwatches();
  });
  document.addEventListener('langchange', () => applyI18n(drawer));

  paintSwatches();
  syncDrawer(getPrefs());
}
