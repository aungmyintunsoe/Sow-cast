import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, CloudRain, Droplets, Flame, Leaf, Sun, Thermometer, TriangleAlert, Waves } from 'lucide-react';
import type { Consequence, RegionOutlook } from '../../types';
import { cn } from '../../lib/format';
import { COLLAPSE } from '../../lib/motion';
import { Card } from '../ui/Card';
import { CropPeek } from '../crops/CropPeek';

const SEVERITY = {
  high: { label: 'High impact', bar: 'bg-red-600', chip: 'bg-red-100 text-red-900', ring: 'border-red-700' },
  medium: { label: 'Moderate impact', bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-900', ring: 'border-stone-900' },
  low: { label: 'Low impact', bar: 'bg-stone-400', chip: 'bg-stone-200 text-stone-800', ring: 'border-stone-900' },
} as const;

const ICONS: Record<string, typeof Sun> = {
  heat: Flame, warming: Thermometer, drying: Sun, wetting: CloudRain, downpours: Waves, dry_spells: Sun,
  water_gap: Droplets, bad_year: TriangleAlert, crop_shift: Leaf, stable: Leaf,
};

const SIG_WORDS: Record<Consequence['significance'], string> = {
  likely: 'Clear trend in 2001–2024 data',
  possible: 'Possible trend in 2001–2024 data',
  none: 'No clear trend',
  variability: 'From year-to-year swings, 2001–2024',
  projection: 'Crop scores at projected 2035 conditions',
};

/** "Projection" label used on every forward-looking number so it is never mistaken for a measurement. */
export function ProjectionBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border border-dashed border-violet-500 bg-violet-50 px-1.5 py-0.5 text-xs font-bold text-violet-800', className)}>
      Projection
    </span>
  );
}

function NowToThen({ c, outlook }: { c: Consequence; outlook: RegionOutlook }) {
  const s = c.metric ? outlook.series[c.metric as keyof RegionOutlook['series']] : undefined;
  if (!s) return null;
  const now = c.kind === 'bad_year' ? s.baseline : s.baseline;
  const then = c.kind === 'bad_year' ? (s.bad_edge === 'low' ? s.at_horizon.lo : s.at_horizon.hi) : s.at_horizon.mid;
  const fmt = (v: number) => `${v.toLocaleString()}${s.unit === '°C' ? ' °C' : ''}`;
  return (
    <div className="flex items-baseline gap-2 tabular-nums">
      <span className="text-lg font-bold text-stone-500">{fmt(now)}</span>
      <ArrowRight className="h-4 w-4 self-center text-stone-400" aria-label="to" />
      <span className="font-display text-3xl font-bold text-stone-900">{fmt(then)}</span>
      <span className="text-sm text-stone-600">{s.unit === '°C' ? '' : s.unit}</span>
    </div>
  );
}

function ConsequenceCard({ c, outlook, big }: { c: Consequence; outlook: RegionOutlook; big: boolean }) {
  const sev = SEVERITY[c.severity];
  const Icon = ICONS[c.kind] ?? TriangleAlert;
  return (
    <Card className={cn('relative overflow-hidden p-5 pl-6', big && c.severity === 'high' && sev.ring)}>
      <span className={cn('absolute inset-y-0 left-0 w-1.5', sev.bar)} aria-hidden="true" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', sev.chip)}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {sev.label}
        </span>
        {c.significance !== 'none' && <ProjectionBadge />}
      </div>
      <NowToThen c={c} outlook={outlook} />
      <h4 className={cn('mt-1 font-bold leading-snug text-stone-900', big ? 'text-lg' : 'text-base')}>{c.headline}</h4>
      <p className="mt-1.5 max-w-[60ch] text-sm text-stone-700 text-pretty">{c.detail}</p>
      {c.crops.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold text-stone-800">Crops affected:</span>
          {c.crops.map((id) => (
            <CropPeek key={id} id={id} className="font-semibold" />
          ))}
        </p>
      )}
      <p className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-900">
        <span className="font-semibold">What to do: </span>
        {c.action}
      </p>
      <p className="mt-2 text-xs text-stone-500">{SIG_WORDS[c.significance]}</p>
    </Card>
  );
}

/** How each top crop's match holds up: today, if trends continue to 2035, and in a bad year around 2035. */
function CropOutlook({ outlook }: { outlook: RegionOutlook }) {
  const rows = outlook.crop_outlook.slice(0, 6);
  if (!rows.length) return null;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-lg font-bold text-stone-900">How the best crops hold up by {outlook.horizon}</h4>
        <ProjectionBadge />
      </div>
      <p className="mt-1 max-w-[65ch] text-sm text-stone-600">Crop match out of 100, using the team's scoring rules with projected rain, temperature and dry months.</p>
      <div className="mt-4 space-y-3">
        {rows.map((r) => {
          const lo = Math.min(r.fit_now, r.fit_trend_2035, r.fit_bad_year_2035);
          return (
            <div key={r.crop} className="grid grid-cols-[7.5rem_1fr_6.5rem] items-center gap-3 text-sm">
              <CropPeek id={r.crop} className="justify-self-start font-semibold" />
              <div className="relative h-6" role="img" aria-label={`Today ${r.fit_now}, ${outlook.horizon} trend ${r.fit_trend_2035}, dry hot year ${r.fit_bad_year_2035}`}>
                <span className="absolute inset-x-0 top-1/2 h-px bg-stone-200" />
                <span className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-red-200" style={{ left: `${lo}%`, width: `${Math.max(0, r.fit_now - lo)}%` }} />
                <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 shadow" style={{ left: `${r.fit_bad_year_2035}%` }} title={`Dry, hot year ~${outlook.horizon}: ${r.fit_bad_year_2035}`} />
                <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-violet-700 bg-white" style={{ left: `${r.fit_trend_2035}%` }} title={`${outlook.horizon} if trends continue: ${r.fit_trend_2035}`} />
                <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-900" style={{ left: `${r.fit_now}%` }} title={`Today: ${r.fit_now}`} />
              </div>
              <span className="text-right tabular-nums text-stone-700">
                <span className="font-bold text-stone-900">{r.fit_now}</span>
                {r.fit_bad_year_2035 < r.fit_now && <span className="ml-1 font-semibold text-red-700">→ {r.fit_bad_year_2035}</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-stone-900" />Today</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-dashed border-violet-700" />{outlook.horizon} if trends continue</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-600" />A dry, hot year around {outlook.horizon} (1 in 10)</span>
      </div>
    </Card>
  );
}

/** Step 2 headline: what today's trends mean for this farm by 2035. Strongest consequences first. */
export function OutlookPanel({ outlook }: { outlook: RegionOutlook }) {
  const [more, setMore] = useState(false);
  const [first, ...rest] = outlook.consequences;
  if (!first) return null;
  const shown = rest.slice(0, 2), hidden = rest.slice(2);
  return (
    <section aria-labelledby="outlook-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="outlook-title" className="text-xl font-bold text-stone-900">What this means for your farm by {outlook.horizon}</h3>
          <p className="mt-1 max-w-[70ch] text-sm text-stone-600">
            If the {outlook.base_period.replace('-', '–')} trends continue. Purple dashed marks are projections, not measurements.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ConsequenceCard c={first} outlook={outlook} big />
        </div>
        <div className="grid gap-4 lg:col-span-2 sm:grid-cols-2">
          {shown.map((c) => (
            <ConsequenceCard key={c.kind} c={c} outlook={outlook} big={false} />
          ))}
        </div>
      </div>
      {hidden.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-900"
          >
            {more ? 'Show fewer' : `${hidden.length} more ${hidden.length === 1 ? 'effect' : 'effects'}`}
            <ChevronDown className={cn('h-4 w-4 transition-transform', more && 'rotate-180')} />
          </button>
          <AnimatePresence initial={false}>
            {more && (
              <motion.div {...COLLAPSE} className="overflow-hidden">
                <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                  {hidden.map((c) => (
                    <ConsequenceCard key={c.kind} c={c} outlook={outlook} big={false} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <CropOutlook outlook={outlook} />
      <details className="group rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
        <summary className="cursor-pointer select-none font-semibold text-stone-900">How these projections are made</summary>
        <p className="mt-2 max-w-[75ch] text-pretty">{outlook.method}</p>
        <p className="mt-1 max-w-[75ch] text-pretty">
          The range shown is where {Math.round(outlook.interval * 100)}% of single years are expected to fall. Full method and sources: data/ANALYSIS.md in the project.
        </p>
      </details>
    </section>
  );
}
