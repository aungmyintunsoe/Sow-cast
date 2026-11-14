// Colour scales used by the themes. Values are Tailwind v3 defaults unless marked custom.
export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Shade = (typeof SHADES)[number];
export type Scale = Record<Shade, string>;

const s = (...hex: string[]): Scale =>
  Object.fromEntries(SHADES.map((k, i) => [k, hex[i]])) as Scale;

export const PALETTES = {
  // neutrals
  stone: s('#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c', '#292524', '#1c1917', '#0c0a09'),
  slate: s('#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617'),
  neutral: s('#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717', '#0a0a0a'),
  zinc: s('#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b'),
  // brand candidates
  field: s('#f2fbf4', '#e1f6e6', '#c5eccf', '#97dca7', '#62c279', '#3ba755', '#2c8742', '#256b37', '#21552f', '#1d4628', '#0b2614'), // custom: original Sowcast green
  nasa: s('#eef3fb', '#d9e4f5', '#b3c8eb', '#85a5dc', '#5079c6', '#2a56ad', '#0b3d91', '#0a3377', '#0a2a5f', '#0a234d', '#061632'), // custom: built around NASA blue #0B3D91
  olive: s('#f7f8ee', '#edf0d8', '#dbe1b3', '#c2cc84', '#a6b45a', '#8a9a3e', '#6c7a2f', '#545f27', '#444c24', '#3a4122', '#1e230f'), // custom
  emerald: s('#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'),
  teal: s('#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e'),
  // semantic (warnings, errors, info) and the soil accent
  amber: s('#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'),
  red: s('#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'),
  blue: s('#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'),
  soil: s('#fbf7f4', '#f6ede7', '#eed9ce', '#e1bead', '#d09c85', '#be7e62', '#a7654b', '#8b513c', '#724334', '#5e3a2f', '#3a2219'), // custom: original Sowcast soil
} satisfies Record<string, Scale>;

export type PaletteName = keyof typeof PALETTES;

/** Dark themes flip every scale (50↔950, 100↔900 …). Because the app's markup uses
 *  light backgrounds with dark text, flipping gives dark backgrounds with light text for free. */
export const invert = (scale: Scale): Scale =>
  Object.fromEntries(SHADES.map((k, i) => [k, scale[SHADES[SHADES.length - 1 - i]]])) as Scale;

export const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
