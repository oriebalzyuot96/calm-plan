// Front end checks that need no browser.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { adjustAccent, contrastRatio, hexToRgb, normaliseHue, rgbToHex } from '../public/js/color.js';
import { PALETTES, ACCENT_SWATCHES } from '../public/js/palettes.js';
import { DEFAULTS, PREF_KEYS, sanitizePrefs } from '../public/js/prefs.js';
import { STRINGS } from '../public/js/i18n.js';
import {
  SESSIONS,
  SLEEP_TIMER_OPTIONS,
  SOUNDSCAPES,
  allocate,
  buildTimeline,
  fadeGain,
  formatClock,
  hiddenTooLong,
  phaseAt,
  sessionKeys,
  sleepGain,
  stepIndexAt,
} from '../public/js/meditation-core.js';
import { play, startAmbient } from '../public/js/sound.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const read = (...p) => readFile(path.join(PUBLIC, ...p), 'utf8');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

describe('public files', () => {
  const required = [
    'index.html', 'styles.css', 'js/app.js', 'js/api.js', 'js/i18n.js', 'js/strings-extra.js', 'js/ui.js',
    'js/color.js', 'js/palettes.js', 'js/prefs.js', 'js/theme.js', 'js/sound.js', 'js/drawer.js',
    'js/orb.js', 'js/breath.js', 'js/meditation-core.js',
    'js/views/today.js', 'js/views/mood.js', 'js/views/chat.js', 'js/views/meditate.js', 'js/views/settings.js',
  ];
  for (const file of required) {
    test(`${file} exists`, async () => {
      await access(path.join(PUBLIC, file));
    });
  }

  test('every relative import resolves to a file', async () => {
    const files = (await walk(path.join(PUBLIC, 'js'))).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const src = await readFile(file, 'utf8');
      for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
        await access(path.resolve(path.dirname(file), m[1]));
      }
    }
  });

  test('no external URLs, CDNs or audio files are referenced', async () => {
    const files = [...(await walk(path.join(PUBLIC, 'js'))), path.join(PUBLIC, 'index.html'), path.join(PUBLIC, 'styles.css')];
    for (const file of files) {
      const src = await readFile(file, 'utf8');
      const stripped = src.replaceAll('http://www.w3.org/2000/svg', '');
      assert.doesNotMatch(stripped, /https?:\/\//, `${path.basename(file)} references an external URL`);
      assert.doesNotMatch(src, /\.(mp3|wav|ogg|m4a)\b/i, `${path.basename(file)} references an audio file`);
      assert.doesNotMatch(src, /\.innerHTML\s*=/, `${path.basename(file)} uses innerHTML`);
    }
  });
});

describe('index.html is CSP compliant', () => {
  test('no inline script, handler or style attribute', async () => {
    const html = await read('index.html');
    for (const tag of html.match(/<script\b[^>]*>/gi) || []) assert.match(tag, /\ssrc\s*=/i);
    assert.equal((html.match(/<script\b(?![^>]*\ssrc\s*=)[^>]*>[\s\S]*?<\/script>/gi) || []).length, 0);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
    assert.doesNotMatch(html, /\sstyle\s*=/i);
    assert.doesNotMatch(html, /<style\b/i);
    assert.doesNotMatch(html, /javascript:/i);
  });

  test('no native select element anywhere', async () => {
    const html = await read('index.html');
    assert.doesNotMatch(html, /<select\b/i);
    for (const file of await walk(path.join(PUBLIC, 'js'))) {
      assert.doesNotMatch(await readFile(file, 'utf8'), /createElement\(\s*'select'/);
    }
  });

  test('keeps a persistent safety note and the drawer, breathing guide and meditation view', async () => {
    const html = await read('index.html');
    assert.match(html, /class="safety-chip"/);
    assert.match(html, /id="drawer"[^>]*role="dialog"[^>]*aria-modal="true"/);
    assert.match(html, /id="breath-dialog"/);
    assert.match(html, /data-view="meditate"/);
    assert.match(html, /data-route="meditate"/);
  });
});

describe('i18n', () => {
  const en = Object.keys(STRINGS.en).sort();
  const ar = Object.keys(STRINGS.ar).sort();

  test('Arabic and English have exactly the same keys', () => {
    assert.deepEqual(ar.filter((k) => !(k in STRINGS.en)), []);
    assert.deepEqual(en.filter((k) => !(k in STRINGS.ar)), []);
  });

  test('no empty strings and placeholders match across languages', () => {
    for (const k of en) {
      assert.ok(STRINGS.en[k].trim(), `en.${k} empty`);
      assert.ok(STRINGS.ar[k].trim(), `ar.${k} empty`);
      const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
      assert.equal(ph(STRINGS.ar[k]), ph(STRINGS.en[k]), `placeholders differ for ${k}`);
    }
  });

  test('every key used in the HTML or in t() calls exists in both languages', async () => {
    const used = new Set();
    const html = await read('index.html');
    for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) used.add(m[1]);
    for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
      for (const pair of m[1].split(';')) used.add(pair.split(':')[1].trim());
    }
    for (const file of await walk(path.join(PUBLIC, 'js'))) {
      const src = await readFile(file, 'utf8');
      for (const m of src.matchAll(/\bt\('([A-Za-z0-9_]+)'/g)) used.add(m[1]);
    }
    for (const key of used) {
      assert.ok(key in STRINGS.en, `missing en.${key}`);
      assert.ok(key in STRINGS.ar, `missing ar.${key}`);
    }
  });

  test('every meditation session string exists in both languages', () => {
    for (const key of sessionKeys()) {
      assert.ok(STRINGS.en[key], `missing en.${key}`);
      assert.ok(STRINGS.ar[key], `missing ar.${key}`);
    }
    for (const k of ['medScapeNone', 'medScapeDrone', 'medScapeBowls', 'medScapeRain', 'medScapeOcean', 'palSea', 'palSage', 'palLavender', 'palSand', 'palRose', 'palMidnight']) {
      assert.ok(STRINGS.en[k] && STRINGS.ar[k], k);
    }
  });

  test('guidance text avoids medical and therapy claims', () => {
    const banned = /\b(cure|cures|treat|treatment|therapy session|diagnos|heal your|medicat|depress|anxiety disorder)\w*/i;
    for (const key of sessionKeys()) assert.doesNotMatch(STRINGS.en[key], banned, key);
  });
});

describe('colour helpers', () => {
  test('hex conversions round trip', () => {
    assert.equal(rgbToHex(hexToRgb('#2f6f60')), '#2f6f60');
    assert.equal(rgbToHex(hexToRgb('#fff')), '#ffffff');
  });

  test('contrastRatio matches known values', () => {
    assert.ok(Math.abs(contrastRatio('#000000', '#ffffff') - 21) < 0.01);
    assert.ok(Math.abs(contrastRatio('#777777', '#ffffff') - 4.48) < 0.05);
  });

  test('normaliseHue wraps and rejects junk', () => {
    assert.equal(normaliseHue(-10), 350);
    assert.equal(normaliseHue(725), 5);
    assert.equal(normaliseHue('abc'), null);
  });

  for (const palette of PALETTES) {
    for (const mode of ['light', 'dark']) {
      for (const min of [4.5, 7]) {
        test(`adjustAccent keeps contrast >= ${min} in ${mode} mode for every hue (${palette.id})`, () => {
          for (let hue = 0; hue < 360; hue += 3) {
            const { accent, ink } = adjustAccent({ hue, saturation: palette.sat, mode, backgrounds: palette[mode], min });
            assert.ok(contrastRatio(accent, ink) >= min, `button text hue ${hue}: ${accent} on ${ink}`);
            for (const bg of palette[mode]) {
              assert.ok(contrastRatio(accent, bg) >= min, `text on page hue ${hue}: ${accent} on ${bg}`);
            }
          }
        });
      }
    }
  }

  test('adjustAccent darkens in light mode and lightens in dark mode', () => {
    const light = adjustAccent({ hue: 60, mode: 'light' });
    const dark = adjustAccent({ hue: 60, mode: 'dark' });
    assert.ok(contrastRatio(light.accent, '#ffffff') >= 4.5);
    assert.ok(contrastRatio(dark.accent, dark.ink) >= 4.5);
    assert.notEqual(light.accent, dark.accent);
  });

  test('the swatch hues are all valid', () => {
    for (const h of ACCENT_SWATCHES) assert.ok(h >= 0 && h < 360);
  });
});

describe('palettes in styles.css', () => {
  const pair = (block, name) => {
    const m = block.match(new RegExp(`--${name}:\\s*light-dark\\(\\s*(#[0-9a-fA-F]{6})\\s*,\\s*(#[0-9a-fA-F]{6})\\s*\\)`));
    assert.ok(m, `missing --${name}`);
    return { light: m[1], dark: m[2] };
  };

  async function blockFor(id) {
    const css = await read('styles.css');
    const sel = id === 'sea' ? ':root {' : `:root[data-palette="${id}"] {`;
    const start = css.indexOf(sel);
    assert.ok(start >= 0, `no block for ${id}`);
    return css.slice(start, css.indexOf('\n}', start));
  }

  for (const palette of PALETTES) {
    test(`${palette.id}: backgrounds match palettes.js and text/accent contrast is AA`, async () => {
      const block = await blockFor(palette.id);
      const bg = pair(block, 'bg');
      const surface = pair(block, 'surface');
      assert.equal(bg.light, palette.light[0]);
      assert.equal(surface.light, palette.light[1]);
      assert.equal(bg.dark, palette.dark[0]);
      assert.equal(surface.dark, palette.dark[1]);
      for (const mode of ['light', 'dark']) {
        const c = (n) => pair(block, n)[mode];
        for (const base of [c('bg'), c('surface'), c('soft')]) {
          assert.ok(contrastRatio(c('text'), base) >= 7, `${palette.id} ${mode} text on ${base}`);
          assert.ok(contrastRatio(c('muted'), base) >= 4.5, `${palette.id} ${mode} muted on ${base}`);
        }
        assert.ok(contrastRatio(c('p-ink'), c('p-accent')) >= 4.5, `${palette.id} ${mode} button`);
        assert.ok(contrastRatio(c('p-accent'), c('bg')) >= 4.5, `${palette.id} ${mode} accent on bg`);
        assert.ok(contrastRatio(c('p-accent'), c('surface')) >= 4.5, `${palette.id} ${mode} accent on surface`);
      }
    });
  }
});

describe('preferences', () => {
  test('sanitizePrefs stores only the known settings', () => {
    const out = sanitizePrefs({ lang: 'en', chat: 'secret message', mood: 'note', theme: 'dark', volume: 500, textSize: 9, palette: 'nope' });
    assert.deepEqual(Object.keys(out).sort(), [...PREF_KEYS].sort());
    assert.equal(out.lang, 'en');
    assert.equal(out.theme, 'dark');
    assert.equal(out.volume, 100);
    assert.equal(out.textSize, DEFAULTS.textSize);
    assert.equal(out.palette, DEFAULTS.palette);
    assert.ok(!JSON.stringify(out).includes('secret'));
  });

  test('defaults are Arabic, system theme, sound on and low volume', () => {
    const out = sanitizePrefs(undefined);
    assert.equal(out.lang, 'ar');
    assert.equal(out.theme, 'system');
    assert.equal(out.soundOn, true);
    assert.ok(out.volume <= 50);
  });

  test('localStorage use is wrapped in try/catch and limited to the prefs key', async () => {
    const src = await read('js/prefs.js');
    assert.equal((src.match(/localStorage/g) || []).length, 2);
    assert.equal((src.match(/try \{/g) || []).length, 2);
    for (const file of await walk(path.join(PUBLIC, 'js'))) {
      if (file.endsWith('prefs.js')) continue;
      assert.doesNotMatch(await readFile(file, 'utf8'), /localStorage|sessionStorage/, file);
    }
  });
});

describe('meditation timeline', () => {
  test('offers sessions of 3, 5, 10 and 15 minutes (4 to 6 sessions)', () => {
    assert.ok(SESSIONS.length >= 4 && SESSIONS.length <= 6);
    const mins = new Set(SESSIONS.map((s) => s.minutes));
    for (const m of [3, 5, 10, 15]) assert.ok(mins.has(m), `no ${m} minute session`);
    for (const id of ['breath', 'body', 'ground', 'thanks', 'sleep']) assert.ok(SESSIONS.some((s) => s.id === id));
  });

  test('step durations sum exactly to the session length and are contiguous', () => {
    for (const s of SESSIONS) {
      const tl = buildTimeline(s);
      assert.equal(tl.reduce((a, x) => a + x.seconds, 0), s.minutes * 60, s.id);
      assert.equal(tl[0].start, 0);
      assert.equal(tl.at(-1).end, s.minutes * 60);
      for (let i = 1; i < tl.length; i += 1) assert.equal(tl[i].start, tl[i - 1].end);
      for (const step of tl) assert.ok(step.seconds >= 5, `${s.id} step too short`);
    }
  });

  test('allocate always sums to the total', () => {
    for (const total of [1, 7, 60, 179, 180, 901]) {
      for (const weights of [[1], [1, 1, 1], [1, 2, 3, 3, 2, 1], [5, 1, 1]]) {
        const out = allocate(total, weights);
        assert.equal(out.reduce((a, b) => a + b, 0), total);
        assert.ok(out.every((n) => Number.isInteger(n) && n >= 0));
      }
    }
  });

  test('stepIndexAt follows the timeline and returns -1 at the end', () => {
    const tl = buildTimeline(SESSIONS[0]);
    assert.equal(stepIndexAt(tl, 0), 0);
    assert.equal(stepIndexAt(tl, tl[1].start), 1);
    assert.equal(stepIndexAt(tl, tl.at(-1).end - 0.1), tl.length - 1);
    assert.equal(stepIndexAt(tl, tl.at(-1).end), -1);
  });

  test('breathing phase follows the pace and the orb scale stays within 0..1', () => {
    const pace = { in: 4, hold: 4, out: 6 };
    assert.equal(phaseAt(pace, 0).phase, 'in');
    assert.equal(phaseAt(pace, 3.9).phase, 'in');
    assert.equal(phaseAt(pace, 4).phase, 'hold');
    assert.equal(phaseAt(pace, 8).phase, 'out');
    assert.equal(phaseAt(pace, 14).phase, 'in');
    assert.ok(phaseAt(pace, 4).scale === 1 && phaseAt(pace, 0).scale === 0);
    for (let t = 0; t < 60; t += 0.37) {
      const p = phaseAt(pace, t);
      assert.ok(p.scale >= 0 && p.scale <= 1 && p.progress >= 0 && p.progress <= 1);
    }
  });

  test('fade curve rises, holds and falls smoothly', () => {
    const total = 180;
    assert.equal(fadeGain(0, total), 0);
    assert.equal(fadeGain(total, total), 0);
    assert.equal(fadeGain(90, total), 1);
    let prev = 0;
    for (let t = 0; t <= 6; t += 0.25) {
      const g = fadeGain(t, total, 6);
      assert.ok(g >= prev && g >= 0 && g <= 1);
      prev = g;
    }
    assert.ok(Math.abs(fadeGain(3, total, 6) - 0.5) < 1e-9);
    assert.ok(Math.abs(fadeGain(total - 3, total, 6) - 0.5) < 1e-9);
    // Very short sessions never exceed 1 or go negative.
    for (let t = 0; t <= 4; t += 0.5) assert.ok(fadeGain(t, 4, 6) >= 0 && fadeGain(t, 4, 6) <= 1);
  });

  test('sleep timer holds full volume then fades to silence at the deadline', () => {
    const sleep = 10 * 60;
    assert.equal(sleepGain(0, sleep), 1);
    assert.equal(sleepGain(sleep - 20, sleep), 1);
    assert.ok(sleepGain(sleep - 10, sleep) < 1 && sleepGain(sleep - 10, sleep) > 0);
    assert.ok(Math.abs(sleepGain(sleep - 10, sleep) - 0.5) < 1e-9);
    assert.equal(sleepGain(sleep, sleep), 0);
    assert.equal(sleepGain(sleep + 50, sleep), 0);
    assert.equal(sleepGain(9999, 0), 1, 'timer off means no fade');
    let prev = 1;
    for (let t = sleep - 20; t <= sleep; t += 1) {
      const g = sleepGain(t, sleep);
      assert.ok(g <= prev + 1e-12);
      prev = g;
    }
    assert.deepEqual(SLEEP_TIMER_OPTIONS, [0, 5, 10, 15, 30]);
  });

  test('at least four soundscapes, formatted clock and hidden-tab rule', () => {
    assert.deepEqual([...SOUNDSCAPES].sort(), ['bowls', 'drone', 'ocean', 'rain']);
    assert.equal(formatClock(65), '1:05');
    assert.equal(formatClock(0), '0:00');
    assert.equal(formatClock(179.2), '3:00');
    assert.equal(hiddenTooLong(null, 100000), false);
    assert.equal(hiddenTooLong(0, 59_999), false);
    assert.equal(hiddenTooLong(0, 60_000), true);
  });
});

describe('sound module without a browser', () => {
  test('nothing plays before a user gesture or without an AudioContext', () => {
    assert.equal(play('chime'), false);
    assert.equal(startAmbient('drone'), false);
  });
});
