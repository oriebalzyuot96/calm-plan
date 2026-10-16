// Palette metadata used by the accent adjuster. Must match the backgrounds in styles.css
// (a test checks this).
export const PALETTES = [
  { id: 'sea', hue: 190, sat: 60, light: ['#eef5f6', '#ffffff'], dark: ['#0f1f27', '#172b35'] },
  { id: 'sage', hue: 140, sat: 40, light: ['#f2f5ee', '#ffffff'], dark: ['#131d17', '#1b2a20'] },
  { id: 'lavender', hue: 265, sat: 45, light: ['#f4f1f8', '#ffffff'], dark: ['#1a1626', '#241e35'] },
  { id: 'sand', hue: 30, sat: 65, light: ['#f8f1e6', '#fffaf2'], dark: ['#1f1912', '#2a2218'] },
  { id: 'rose', hue: 340, sat: 55, light: ['#fbf0f1', '#ffffff'], dark: ['#221419', '#2e1c23'] },
  { id: 'midnight', hue: 230, sat: 50, light: ['#eceef6', '#ffffff'], dark: ['#0b1020', '#131a30'] },
];

export const PALETTE_IDS = PALETTES.map((p) => p.id);
export const ACCENT_SWATCHES = [160, 205, 255, 320, 20, 45];
export const CONTRAST_MODES = ['standard', 'high', 'by', 'gray'];
export const THEMES = ['system', 'light', 'dark'];
