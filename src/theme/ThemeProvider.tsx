import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { PALETTES, SHADES, invert, hexToRgb, type Scale } from './palettes';
import { FONT_PAIRS, SHADOWS, THEMES, type FontPair, type Theme } from './themes';

const STORAGE_KEY = 'sowcast-design';
export const THEME_DEFAULT_FONT = 'theme'; // font choice that follows the theme

/** Effective colour scales for a theme (flipped when dark). */
function scalesFor(theme: Theme) {
  const pick = (name: keyof typeof PALETTES): Scale => (theme.dark ? invert(PALETTES[name]) : PALETTES[name]);
  const neutral = pick(theme.palettes.neutral);
  return {
    stone: neutral,
    brand: pick(theme.palettes.brand),
    soil: pick(theme.palettes.soil),
    nasa: pick(theme.palettes.nasa),
    amber: pick('amber'),
    red: pick('red'),
    blue: pick('blue'),
    plant: pick('field'),
    // "white" = card surface: pure white in light themes, a raised dark grey in dark themes
    white: theme.dark ? PALETTES[theme.palettes.neutral][900] : '#ffffff',
  };
}

export function resolveFont(theme: Theme, fontId: string): FontPair {
  const id = fontId === THEME_DEFAULT_FONT ? theme.font : fontId;
  return FONT_PAIRS.find((f) => f.id === id) ?? FONT_PAIRS[0];
}

/** Writes the design as CSS variables on <html>. Tailwind colours read these (see tailwind.config.js). */
export function applyDesign(theme: Theme, fontId: string) {
  const root = document.documentElement;
  const sc = scalesFor(theme);
  for (const family of ['stone', 'brand', 'soil', 'nasa', 'amber', 'red', 'blue'] as const) {
    for (const shade of SHADES) root.style.setProperty(`--c-${family}-${shade}`, hexToRgb(sc[family][shade]));
  }
  root.style.setProperty('--c-white', hexToRgb(sc.white));
  root.style.setProperty('--c-nasa-main', hexToRgb(sc.nasa[600]));
  root.style.setProperty('--c-nasa-light', hexToRgb(sc.nasa[50]));
  const font = resolveFont(theme, fontId);
  root.style.setProperty('--font-body', font.body);
  root.style.setProperty('--font-display', font.display);
  root.style.setProperty('--radius-scale', String(theme.radius));
  const sh = SHADOWS[theme.shadow];
  root.style.setProperty('--shadow-sm', sh.sm);
  root.style.setProperty('--shadow', sh.base);
  root.style.setProperty('--shadow-md', sh.md);
  root.style.fontSize = `${theme.rootFontSize}px`;
  root.style.colorScheme = theme.dark ? 'dark' : 'light';
  root.dataset.theme = theme.id;
}

/** Initial choice: ?theme=&font= in the URL (shareable), then the last choice, then the first theme. */
export function readInitialDesign(): { themeId: string; fontId: string } {
  const params = new URLSearchParams(window.location.search);
  let saved: { themeId?: string; fontId?: string } = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    /* storage unavailable — fall back to defaults */
  }
  const themeId = params.get('theme') ?? saved.themeId ?? THEMES[0].id;
  const fontId = params.get('font') ?? saved.fontId ?? THEME_DEFAULT_FONT;
  return {
    themeId: THEMES.some((t) => t.id === themeId) ? themeId : THEMES[0].id,
    fontId: fontId === THEME_DEFAULT_FONT || FONT_PAIRS.some((f) => f.id === fontId) ? fontId : THEME_DEFAULT_FONT,
  };
}

/** Colours for Recharts (SVG props can't use Tailwind classes). */
export function chartColors(theme: Theme) {
  const sc = scalesFor(theme);
  return {
    grid: sc.stone[200],
    tick: sc.stone[700],
    tooltipBorder: sc.stone[300],
    tooltipBg: sc.white,
    tooltipText: sc.stone[900],
    rainBar: sc.blue[400],
    rainAxis: sc.blue[700],
    plantLine: sc.plant[600],
    plantAxis: sc.plant[700],
    heatStroke: theme.dark ? '#fb923c' : '#ea580c',
    heatFill: theme.dark ? '#7c2d12' : '#fed7aa',
    rainStroke: sc.blue[600],
    rainFill: sc.blue[200],
    waterStroke: sc.nasa[600],
    waterFill: sc.blue[100],
  };
}

interface DesignContextValue {
  theme: Theme;
  themeIndex: number;
  fontId: string;
  font: FontPair;
  chart: ReturnType<typeof chartColors>;
  setTheme: (id: string) => void;
  nextTheme: () => void;
  setFont: (id: string) => void;
}

const DesignContext = createContext<DesignContextValue | null>(null);

export const DesignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [{ themeId, fontId }, setState] = useState(readInitialDesign);
  const themeIndex = Math.max(0, THEMES.findIndex((t) => t.id === themeId));
  const theme = THEMES[themeIndex];

  useLayoutEffect(() => {
    applyDesign(theme, fontId);
    // If the page was opened with ?theme= / ?font=, keep the URL in step so a reload shows the current design.
    const url = new URL(window.location.href);
    if (url.searchParams.has('theme') || url.searchParams.has('font')) {
      url.searchParams.set('theme', theme.id);
      if (fontId === THEME_DEFAULT_FONT) url.searchParams.delete('font');
      else url.searchParams.set('font', fontId);
      window.history.replaceState(null, '', url);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, fontId }));
    } catch {
      /* ignore */
    }
  }, [theme, themeId, fontId]);

  const setTheme = useCallback((id: string) => setState((s) => ({ ...s, themeId: id })), []);
  const setFont = useCallback((id: string) => setState((s) => ({ ...s, fontId: id })), []);
  const nextTheme = useCallback(
    () => setState((s) => {
      const i = THEMES.findIndex((t) => t.id === s.themeId);
      return { ...s, themeId: THEMES[(i + 1) % THEMES.length].id };
    }),
    [],
  );

  const value = useMemo<DesignContextValue>(
    () => ({ theme, themeIndex, fontId, font: resolveFont(theme, fontId), chart: chartColors(theme), setTheme, nextTheme, setFont }),
    [theme, themeIndex, fontId, setTheme, nextTheme, setFont],
  );
  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
};

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error('useDesign must be used inside <DesignProvider>');
  return ctx;
}
