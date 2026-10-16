// Theme helpers on top of Pelagic's theme engine (pelagic/core/theme).
//
// Mode (light, dark, system) and colour themes (presets) use switchTheme(), which animates the change
// and stores the choice. A custom brand colour uses createTheme() to build a WCAG AA palette for light,
// dark and high contrast, then sets the accent variables on <html> through the CSSOM. Pelagic's own
// applyCustomTheme() injects a <style> element, which the strict CSP (style-src 'self') would block.
import { createTheme } from 'pelagic/core/theme';

export const BRAND_ACCENT = 'calm-brand';
const BRAND_KEY = 'calmPlan.brand';
const MODES = ['light', 'dark', 'hc'] as const;
const ACCENT_VARS = {
  primary: 'primary',
  primaryHover: 'primary-hover',
  primaryInk: 'primary-ink',
  onPrimary: 'on-primary',
} as const;

export const PRESETS = ['default', 'lagoon', 'abyss', 'reef', 'kelp', 'sage', 'dune', 'aurora', 'merlot', 'ink', 'graphite'] as const;
export type Preset = (typeof PRESETS)[number];
export const DEFAULT_PRESET: Preset = 'lagoon';

export const BRAND_SWATCHES = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04'];

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function loadBrand(): string | null {
  try {
    const v = globalThis.localStorage?.getItem(BRAND_KEY) ?? null;
    return v && HEX_RE.test(v) ? v.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function saveBrand(color: string | null) {
  try {
    if (color) globalThis.localStorage?.setItem(BRAND_KEY, color);
    else globalThis.localStorage?.removeItem(BRAND_KEY);
  } catch {
    // Storage may be blocked; the colour still applies for this visit.
  }
}

/** Applies (or with null removes) a brand colour on `root`, fitted to the active colour theme. */
export function applyBrand(color: string | null, root: HTMLElement = document.documentElement) {
  for (const mode of MODES) for (const v of Object.values(ACCENT_VARS)) root.style.removeProperty(`--pl-a-${mode}-${v}`);
  if (!color || !HEX_RE.test(color)) {
    if (root.getAttribute('data-accent') === BRAND_ACCENT) root.removeAttribute('data-accent');
    return null;
  }
  const preset = root.getAttribute('data-theme-preset');
  const theme = createTheme({
    primary: color,
    preset: preset && (PRESETS as readonly string[]).includes(preset) && preset !== 'default' ? (preset as Exclude<Preset, 'default'>) : undefined,
  });
  for (const mode of MODES) {
    for (const [key, v] of Object.entries(ACCENT_VARS)) {
      const value = theme.palette[mode][key as keyof typeof ACCENT_VARS];
      if (value) root.style.setProperty(`--pl-a-${mode}-${v}`, value);
    }
  }
  root.setAttribute('data-accent', BRAND_ACCENT);
  return theme;
}
