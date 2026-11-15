import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Copy, Sprout } from 'lucide-react';
import { cn } from '../../lib/format';

export interface SiteNavProps {
  onHome: () => void;
  onOpenApp: () => void;
  onSkill: () => void;
  /** Which page is showing, to mark the current link. */
  current: 'home' | 'skill';
  /** Over the dark-ish hero the bar starts transparent. */
  overHero?: boolean;
}

/** Top bar for the landing and skill pages. The logo always returns to the landing page. */
export function SiteNav({ onHome, onOpenApp, onSkill, current, overHero }: SiteNavProps) {
  const link = 'inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold transition-colors';
  return (
    <header className={cn('absolute inset-x-0 top-0 z-30 pt-[env(safe-area-inset-top)]', !overHero && 'relative border-b border-stone-200 bg-white')}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] py-4" aria-label="Site">
        <a
          href="?step=home"
          onClick={(e) => {
            e.preventDefault();
            onHome();
          }}
          className={cn('group flex items-center gap-2.5 rounded-xl p-1', overHero ? 'text-white' : 'text-stone-900')}
          aria-label="Sowcast home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm ring-1 ring-white/30 transition-transform group-hover:-rotate-6">
            <Sprout className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Sowcast</span>
        </a>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSkill}
            aria-current={current === 'skill' ? 'page' : undefined}
            className={cn(link, 'hidden sm:inline-flex', overHero ? 'text-white/90 hover:bg-white/15 hover:text-white' : 'text-stone-700 hover:bg-stone-100', current === 'skill' && 'underline underline-offset-8')}
          >
            Claude skill
          </button>
          <button
            type="button"
            onClick={onOpenApp}
            className="ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Open the app
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </nav>
    </header>
  );
}

/** A product screenshot set in a frosted-glass pane with a browser-style top bar. */
export function GlassShot({ src, alt, caption, className, tilt = 0, priority = false }: { src: string; alt: string; caption?: ReactNode; className?: string; tilt?: number; priority?: boolean }) {
  return (
    <figure className={cn('group relative', className)} style={{ transform: tilt ? `perspective(1600px) rotateY(${tilt}deg)` : undefined }}>
      <div className="rounded-[22px] border border-white/50 bg-white/30 p-2 shadow-[0_30px_80px_-30px_rgba(20,40,20,0.55),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl transition-transform duration-500 group-hover:-translate-y-1">
        <div className="mb-2 flex items-center gap-1.5 px-2 pt-1" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
        </div>
        <img src={src} alt={alt} width={1920} height={1200} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full rounded-[14px] border border-stone-900/10" />
      </div>
      {caption && <figcaption className="mt-3 px-1 text-sm font-medium text-stone-700">{caption}</figcaption>}
    </figure>
  );
}

/** A command or prompt with a copy button that confirms in place. */
export function CopyBlock({ text, label, dark = false }: { text: string; label?: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the text is still selectable */
    }
  };
  return (
    <div className={cn('group flex items-start gap-2 rounded-xl border px-3 py-2.5', dark ? 'border-white/15 bg-black/30 text-brand-50' : 'border-stone-300 bg-stone-50 text-stone-900')}>
      <code className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">{text}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={label ? `Copy ${label}` : 'Copy'}
        className={cn('inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-colors', dark ? 'text-brand-100 hover:bg-white/10' : 'text-stone-600 hover:bg-stone-200')}
      >
        <motion.span key={copied ? 'y' : 'n'} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-1">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </motion.span>
      </button>
    </div>
  );
}
