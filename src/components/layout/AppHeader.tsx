import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Map, MapPin, RefreshCw, Satellite, Search, Sprout } from 'lucide-react';
import { SPRING } from '../../lib/motion';
import { preloadStep, type PageId, type StepId } from '../../lib/stepLoaders';
import { Kbd, MOD_KEY } from '../ui/Kbd';

export type { StepId };

export const STEPS: { id: StepId; label: string; shortLabel: string; icon: ReactNode }[] = [
  { id: 'map', label: '1. Pick Field', shortLabel: 'Field', icon: <Map className="w-4 h-4" /> },
  { id: 'brief', label: '2. Satellite Brief', shortLabel: 'Brief', icon: <Satellite className="w-4 h-4" /> },
  { id: 'rotations', label: '3. Compare Rotations', shortLabel: 'Rotations', icon: <RefreshCw className="w-4 h-4" /> },
  { id: 'crops', label: '4. Best Crops', shortLabel: 'Crops', icon: <Sprout className="w-4 h-4" /> },
];

interface AppHeaderProps {
  step: PageId;
  onStepChange: (step: StepId) => void;
  /** Logo: back to the landing page. */
  onHome: () => void;
  /** "Region, Country" of the loaded region, shown as a shortcut back to the map. */
  regionLabel: string | null;
  onOpenMenu: () => void;
}

/** Sticky header: logo, current region, search (Ctrl/⌘ K) and the four-step navigation. */
export function AppHeader({ step, onStepChange, onHome, regionLabel, onOpenMenu }: AppHeaderProps) {
  // Keys 1–4 jump between steps (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, select, [contenteditable="true"]')) return;
      const target = STEPS[Number(e.key) - 1];
      if (target) onStepChange(target.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStepChange]);

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] py-3">
        <div className="flex items-center gap-2.5">
          <a
            href="?step=home"
            onClick={(e) => {
              e.preventDefault();
              onHome();
            }}
            className="group -m-1 flex items-center gap-2.5 rounded-xl p-1"
            aria-label="Sowcast home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition-transform group-hover:-rotate-6" aria-hidden="true">
              <Sprout className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-stone-900 sm:text-xl">Sowcast</span>
          </a>
          <span className="hidden rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-nasa-blue md:inline-block">
            NASA Space Apps
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {regionLabel && (
            <button
              type="button"
              onClick={() => onStepChange('map')}
              className="inline-flex min-h-10 min-w-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-200"
              title="Change field location"
            >
              <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="truncate max-w-[9rem] sm:max-w-none">{regionLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Search regions and steps"
            className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100"
          >
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline">Search</span>
            <span className="hidden sm:contents">
              <Kbd>{MOD_KEY} K</Kbd>
            </span>
          </button>
        </div>
      </div>

      <nav className="mx-auto grid max-w-6xl grid-cols-4 gap-1.5 px-[max(1rem,env(safe-area-inset-left))] pb-2.5 sm:gap-2" aria-label="Steps">
        {STEPS.map((s, i) => {
          const active = step === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onStepChange(s.id)}
              onPointerEnter={() => preloadStep(s.id)}
              onFocus={() => preloadStep(s.id)}
              aria-current={active ? 'step' : undefined}
              title={`${s.label.replace(/^\d\. /, '')} (key ${i + 1})`}
              className={`relative isolate flex min-h-11 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-xl px-1 text-xs font-bold transition-colors sm:px-3 md:flex-row md:gap-1.5 md:text-sm ${
                active ? 'text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {/* One shared highlight that slides to the active step. */}
              {active && <motion.span layoutId="active-step" transition={SPRING} className="absolute inset-0 -z-10 rounded-xl bg-brand-600 shadow-sm" />}
              {s.icon}
              <span className="hidden md:inline">{s.label}</span>
              <span className="md:hidden">{s.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
