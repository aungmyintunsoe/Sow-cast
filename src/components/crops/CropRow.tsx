import { AlertCircle, ChevronDown, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { RankedCrop } from '../../lib/cropScoring';
import { capitalize } from '../../lib/format';
import { LabelValue } from '../ui/LabelValue';
import { Pill } from '../ui/Pill';

const TRENDS = {
  increasing: { label: 'Improving fit', Icon: TrendingUp, cls: 'bg-brand-50 text-brand-700' },
  declining: { label: 'Facing stress', Icon: TrendingDown, cls: 'bg-amber-50 text-amber-800' },
  flat: { label: 'Steady fit', Icon: Minus, cls: 'bg-stone-100 text-stone-600' },
} as const;

const rankStyle = (rank: number) =>
  rank === 1 ? 'bg-brand-600 text-white' : rank <= 3 ? 'bg-brand-100 text-brand-900' : 'bg-stone-100 text-stone-700';

interface CropRowProps {
  item: RankedCrop;
  rank: number;
  open: boolean;
  onToggle: () => void;
}

/** One crop in the ranked list; click to show its traits and score breakdown. */
export function CropRow({ item, rank, open, onToggle }: CropRowProps) {
  const { cropObj: crop, goalScore, fit, trend, limits, why, common_locally, parts } = item;
  const trendInfo = trend === 'unknown' ? null : TRENDS[trend];

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/70 transition"
      >
        <div className="flex items-start gap-3.5">
          <div className={`w-9 h-9 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 ${rankStyle(rank)}`}>
            #{rank}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-stone-900">{crop.name}</h3>
              <Pill>{capitalize(crop.season)}</Pill>
              {common_locally && <Pill tone="info" className="font-bold">Grown here</Pill>}
              {crop.nitrogen_fixing && <Pill tone="brand" className="font-bold">Fixes nitrogen</Pill>}
            </div>
            <p className="text-sm text-stone-600 mt-1">{crop.plain_description}</p>
            {why.length > 0 && (
              <p className="text-xs text-brand-800 mt-1.5">
                <span className="font-semibold">Why it fits: </span>
                {why.join('; ')}
              </p>
            )}
            {limits.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                {limits.map((lim) => (
                  <Pill key={lim} tone="warn" className="text-xs font-medium">{lim}</Pill>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pl-12 sm:pl-0">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-stone-900">{goalScore}</span>
            <span className="text-xs font-semibold text-stone-500">/100</span>
          </div>
          <div className="flex items-center gap-2">
            {trendInfo && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${trendInfo.cls}`}>
                <trendInfo.Icon className="w-3.5 h-3.5" />
                {trendInfo.label}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-stone-100 bg-stone-50/50 text-xs sm:text-sm space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <LabelValue className="p-2.5" label="Water need" value={`${crop.water_need} / 5`} />
            <LabelValue className="p-2.5" label="Root depth" value={<span className="capitalize">{crop.root_depth}</span>} />
            <LabelValue
              className="p-2.5"
              label="Tolerates drought / flood / salt"
              value={`${crop.drought_tolerance} / ${crop.flood_tolerance} / ${crop.salinity_tolerance} of 5`}
            />
            <LabelValue className="p-2.5" label="Days to harvest" value={`~${crop.season_days} days`} />
          </div>
          <div className="text-xs text-stone-700 bg-white p-3 rounded-xl border border-stone-200">
            <strong className="text-stone-900">Pest and field notes: </strong>
            {crop.pest_notes}
            <span className="block mt-1 text-stone-500">
              Base fit {fit}/100 from climate {Math.round(parts.climate * 100)}%, water {Math.round(parts.water * 100)}%, soil{' '}
              {Math.round(parts.soil * 100)}%, risk {Math.round(parts.risk * 100)}% and benefit {Math.round(parts.benefit * 100)}% (draft rule-based score).
            </span>
          </div>
        </div>
      )}
    </li>
  );
}
