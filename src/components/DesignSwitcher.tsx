import React, { useEffect, useRef, useState } from 'react';
import { Palette, ChevronDown, Check, Link2 } from 'lucide-react';
import { FONT_PAIRS, THEMES } from '../theme/themes';
import { THEME_DEFAULT_FONT, useDesign } from '../theme/ThemeProvider';

/**
 * Design-testing control. Main button = cycle to the next theme (one click per comparison).
 * Chevron = panel to pick a theme directly and override the font independently.
 * Keyboard: Shift+T cycles themes.
 */
export const DesignSwitcher: React.FC = () => {
  const { theme, themeIndex, fontId, font, setTheme, nextTheme, setFont } = useDesign();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      if (e.shiftKey && e.key.toLowerCase() === 't') nextTheme();
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [nextTheme]);

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('theme', theme.id);
    if (fontId === THEME_DEFAULT_FONT) url.searchParams.delete('font');
    else url.searchParams.set('font', fontId);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy this link:', url.toString());
    }
  };

  return (
    <div ref={ref} className="relative flex items-stretch">
      <button
        onClick={nextTheme}
        className="inline-flex items-center gap-1.5 text-xs font-bold pl-3 pr-2 py-1.5 rounded-l-xl border border-r-0 border-stone-300 bg-white text-stone-700 hover:bg-stone-100 transition"
        title="Next design (Shift+T)"
      >
        <Palette className="w-3.5 h-3.5 text-brand-600" />
        <span className="hidden sm:inline">Design {themeIndex + 1}/{THEMES.length}</span>
        <span className="hidden lg:inline font-medium text-stone-500">· {theme.name}</span>
      </button>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-1.5 rounded-r-xl border border-stone-300 bg-white text-stone-600 hover:bg-stone-100 transition"
        title="Choose design and font"
        aria-expanded={open}
      >
        <ChevronDown className={`w-3.5 h-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white text-stone-900 border border-stone-200 rounded-2xl shadow-md p-3 z-[60]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Theme</div>
          <ul className="space-y-1">
            {THEMES.map((t, i) => (
              <li key={t.id}>
                <button
                  onClick={() => setTheme(t.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl transition flex gap-2 ${
                    t.id === theme.id ? 'bg-brand-50 border border-brand-200' : 'hover:bg-stone-100 border border-transparent'
                  }`}
                >
                  <span className="w-4 pt-0.5 shrink-0">{t.id === theme.id && <Check className="w-4 h-4 text-brand-600" />}</span>
                  <span>
                    <span className="block text-sm font-bold">{i + 1}. {t.name}</span>
                    <span className="block text-xs text-stone-500 leading-snug">{t.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-3 mb-1.5" htmlFor="font-select">
            Font
          </label>
          <select
            id="font-select"
            value={fontId}
            onChange={(e) => setFont(e.target.value)}
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-2 text-stone-900"
          >
            <option value={THEME_DEFAULT_FONT}>Theme default ({FONT_PAIRS.find((f) => f.id === theme.font)?.label})</option>
            {FONT_PAIRS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <p className="text-xs text-stone-500 mt-1.5">
            Now showing: <span className="font-semibold text-stone-700">{font.label}</span>
          </p>

          <button
            onClick={copyLink}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition"
          >
            <Link2 className="w-3.5 h-3.5" />
            {copied ? 'Link copied' : 'Copy link to this design'}
          </button>
          <p className="text-[11px] text-stone-400 mt-2 text-center">Shift+T cycles designs</p>
        </div>
      )}
    </div>
  );
};
