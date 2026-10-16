// Pure colour helpers. No DOM access, so they can be imported by node tests.

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** h in degrees, s and l in 0..100. */
export function hslToRgb(h, s, l) {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = s / 100;
  const ll = l / 100;
  if (ss === 0) return { r: ll * 255, g: ll * 255, b: ll * 255 };
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const f = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return { r: f(hh + 1 / 3) * 255, g: f(hh) * 255, b: f(hh - 1 / 3) * 255 };
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colours (1 to 21). */
export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const INK_LIGHT_MODE = '#ffffff';
const INK_DARK_MODE = '#0d1816';

/**
 * Returns an accent colour for a hue that keeps WCAG contrast of at least `min`
 * against both the button ink and the page backgrounds.
 * Light mode: darkens the colour. Dark mode: lightens it.
 */
export function adjustAccent({ hue, saturation = 55, mode = 'light', backgrounds, min = 4.5 }) {
  const dark = mode === 'dark';
  const ink = dark ? INK_DARK_MODE : INK_LIGHT_MODE;
  const bgs = backgrounds && backgrounds.length ? backgrounds : [dark ? '#14201f' : '#f6f4ef'];
  const step = dark ? 1 : -1;
  let l = dark ? 62 : 42;
  for (let i = 0; i < 100; i += 1, l += step) {
    const sat = Math.max(20, saturation - (l > 80 ? (l - 80) * 2 : 0));
    const hex = rgbToHex(hslToRgb(hue, sat, Math.max(2, Math.min(98, l))));
    const ok = contrastRatio(hex, ink) >= min && bgs.every((bg) => contrastRatio(hex, bg) >= min);
    if (ok) return { accent: hex, ink };
  }
  // Extreme fallback: pure extremes always satisfy the minimum for a sane background.
  return { accent: dark ? '#ffffff' : '#000000', ink };
}

export function normaliseHue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return ((Math.round(n) % 360) + 360) % 360;
}
