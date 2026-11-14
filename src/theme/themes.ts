// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TESTING — add or edit themes and fonts here. Nothing else needs to change.
// Each theme maps the colour families used in the app's Tailwind classes
// (stone-*, brand-*, soil-*, amber-*, red-*, blue-*, nasa-*, white) to a palette.
// ─────────────────────────────────────────────────────────────────────────────
import type { PaletteName } from './palettes';

/** Show the design switcher in the header. Set to false before the final demo. */
export const SHOW_DESIGN_SWITCHER = true;

export interface FontPair {
  id: string;
  label: string;
  body: string; // CSS font-family stack for body text
  display: string; // CSS font-family stack for headings (h1-h3, .font-display)
}

// Every family listed here is loaded in index.html (one Google Fonts request).
export const FONT_PAIRS: FontPair[] = [
  { id: 'jakarta', label: 'Plus Jakarta Sans + Space Grotesk', body: "'Plus Jakarta Sans', system-ui, sans-serif", display: "'Space Grotesk', system-ui, sans-serif" },
  { id: 'plex', label: 'IBM Plex Sans + Barlow Condensed', body: "'IBM Plex Sans', system-ui, sans-serif", display: "'Barlow Condensed', 'IBM Plex Sans', sans-serif" },
  { id: 'fraunces', label: 'Source Sans 3 + Fraunces (serif)', body: "'Source Sans 3', system-ui, sans-serif", display: "'Fraunces', Georgia, serif" },
  { id: 'atkinson', label: 'Atkinson Hyperlegible + Lexend', body: "'Atkinson Hyperlegible', system-ui, sans-serif", display: "'Lexend', system-ui, sans-serif" },
  { id: 'inter', label: 'Inter + Space Grotesk', body: "'Inter', system-ui, sans-serif", display: "'Space Grotesk', system-ui, sans-serif" },
  { id: 'dm', label: 'DM Sans + DM Serif Display', body: "'DM Sans', system-ui, sans-serif", display: "'DM Serif Display', Georgia, serif" },
  { id: 'nunito', label: 'Nunito (rounded)', body: "'Nunito', system-ui, sans-serif", display: "'Nunito', system-ui, sans-serif" },
];

export interface Theme {
  id: string;
  name: string;
  description: string;
  dark: boolean; // true = every palette is flipped (light ↔ dark)
  palettes: {
    neutral: PaletteName; // drives stone-* and white
    brand: PaletteName; // primary buttons, active tabs
    soil: PaletteName;
    nasa: PaletteName;
  };
  font: FontPair['id'];
  radius: number; // multiplier on Tailwind's rounded-* sizes (1 = default, 0 = square)
  shadow: 'soft' | 'flat' | 'lifted';
  rootFontSize: number; // px; 16 is browser default
}

export const THEMES: Theme[] = [
  {
    id: 'field',
    name: 'Field (current)',
    description: 'The prototype as built: warm greys, Sowcast green, rounded cards.',
    dark: false,
    palettes: { neutral: 'stone', brand: 'field', soil: 'soil', nasa: 'nasa' },
    font: 'jakarta', radius: 1, shadow: 'soft', rootFontSize: 16,
  },
  {
    id: 'mission',
    name: 'Mission Control',
    description: 'NASA-blue, cool greys, tight corners, flat — technical and data-first.',
    dark: false,
    palettes: { neutral: 'slate', brand: 'nasa', soil: 'soil', nasa: 'nasa' },
    font: 'plex', radius: 0.35, shadow: 'flat', rootFontSize: 16,
  },
  {
    id: 'earth',
    name: 'Earth & Soil',
    description: 'Olive and sand with a serif headline — editorial, farm-almanac feel.',
    dark: false,
    palettes: { neutral: 'stone', brand: 'olive', soil: 'soil', nasa: 'nasa' },
    font: 'fraunces', radius: 0.6, shadow: 'soft', rootFontSize: 16,
  },
  {
    id: 'legible',
    name: 'Outdoor Legible',
    description: 'Atkinson Hyperlegible (designed for low vision), larger text, strong contrast.',
    dark: false,
    palettes: { neutral: 'neutral', brand: 'emerald', soil: 'soil', nasa: 'nasa' },
    font: 'atkinson', radius: 1.25, shadow: 'lifted', rootFontSize: 17,
  },
  {
    id: 'night',
    name: 'Night Sky',
    description: 'Dark mode with teal accents — satellite / space mood, easy on eyes at night.',
    dark: true,
    palettes: { neutral: 'zinc', brand: 'teal', soil: 'soil', nasa: 'blue' },
    font: 'inter', radius: 1, shadow: 'flat', rootFontSize: 16,
  },
];

export const SHADOWS: Record<Theme['shadow'], { sm: string; base: string; md: string }> = {
  soft: { sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
  flat: { sm: '0 0 #0000', base: '0 0 #0000', md: '0 0 #0000' }, // not 'none': Tailwind joins this into a list
  lifted: { sm: '0 2px 6px -1px rgb(0 0 0 / 0.12)', base: '0 4px 10px -2px rgb(0 0 0 / 0.15)', md: '0 10px 20px -4px rgb(0 0 0 / 0.18)' },
};
