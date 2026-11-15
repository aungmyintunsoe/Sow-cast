import type { ReactNode } from 'react';
import { Map, MapPin, RefreshCw, Satellite, Sprout } from 'lucide-react';

export type StepId = 'map' | 'brief' | 'rotations' | 'crops';

export const STEPS: { id: StepId; label: string; shortLabel: string; icon: ReactNode }[] = [
  { id: 'map', label: '1. Pick Field', shortLabel: 'Field', icon: <Map className="w-4 h-4" /> },
  { id: 'brief', label: '2. Satellite Brief', shortLabel: 'Brief', icon: <Satellite className="w-4 h-4" /> },
  { id: 'rotations', label: '3. Compare Rotations', shortLabel: 'Rotations', icon: <RefreshCw className="w-4 h-4" /> },
  { id: 'crops', label: '4. Best Crops', shortLabel: 'Crops', icon: <Sprout className="w-4 h-4" /> },
];

interface AppHeaderProps {
  step: StepId;
  onStepChange: (step: StepId) => void;
  /** "Region, Country" of the loaded region, shown as a shortcut back to the map. */
  regionLabel: string | null;
}

/** Sticky header: logo, current region and the four-step navigation. */
export function AppHeader({ step, onStepChange, regionLabel }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xl shadow-sm" aria-hidden="true">
            🌱
          </div>
          <h1 className="font-display font-bold text-lg sm:text-xl tracking-tight text-stone-900">Sowcast</h1>
          <span className="hidden sm:inline-block text-[11px] font-semibold bg-blue-50 text-nasa-blue border border-blue-200 px-2 py-0.5 rounded-full">
            NASA Space Apps · Field Shift
          </span>
        </div>

        {regionLabel && (
          <button
            type="button"
            onClick={() => onStepChange('map')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 transition"
            title="Change field location"
          >
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            <span className="max-w-[140px] sm:max-w-none truncate">{regionLabel}</span>
          </button>
        )}
      </div>

      <nav className="max-w-6xl mx-auto px-4 pb-2.5 grid grid-cols-4 gap-1.5 sm:gap-2" aria-label="Steps">
        {STEPS.map((s) => {
          const active = step === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onStepChange(s.id)}
              aria-current={active ? 'step' : undefined}
              className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1.5 py-1.5 md:py-2 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs md:text-sm font-bold whitespace-nowrap transition ${
                active ? 'bg-brand-600 text-white shadow-sm' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
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
