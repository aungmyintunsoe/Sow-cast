import { AnimatePresence, motion } from 'framer-motion';
import { CropIcon } from '../../lib/cropIcons';
import { AlertCircle, ChevronDown, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { RankedCrop } from '../../lib/cropScoring';
import { capitalize } from '../../lib/format';
import { COLLAPSE, FADE, SPRING } from '../../lib/motion';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { CropDetails } from './CropDetails';
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
  /** Small per-row delay for the first appearance only (rows keep their keys, so it never replays). */
  enterDelay: number;
  open: boolean;
  onToggle: () => void;
}

/** One crop in the ranked list; click to show its traits and score breakdown. */
export function CropRow({ item, rank, enterDelay, open, onToggle }: CropRowProps) {
  const { cropObj: crop, goalScore, fit, trend, limits, why, common_locally, parts } = item;
  const trendInfo = trend === 'unknown' ? null : TRENDS[trend];
  const detailsId = `crop-details-${item.crop}`;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ layout: SPRING, opacity: { ...FADE, delay: enterDelay }, y: { ...FADE, delay: enterDelay } }}
      className="relative bg-white"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={detailsId}
        className="group w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-stone-50"
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 tabular-nums transition-colors ${rankStyle(rank)}`}>
            {rank}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-1.5 text-base sm:text-lg font-bold text-stone-900 leading-tight">
                <CropIcon id={item.crop} className="h-[18px] w-[18px] text-brand-700" />
                {crop.name}
              </h3>
              <Pill className="text-xs">{capitalize(crop.season)}</Pill>
              {common_locally && <Pill tone="info" className="text-xs font-bold">Grown here</Pill>}
              {crop.nitrogen_fixing && <Pill tone="brand" className="text-xs font-bold">Fixes nitrogen</Pill>}
            </div>
            <p className="text-sm text-stone-600 mt-1 max-w-[65ch] text-pretty">{crop.plain_description}</p>
            {why.length > 0 && (
              <p className="text-sm text-brand-800 mt-1.5 max-w-[65ch] text-pretty">
                <span className="font-semibold">Why it fits: </span>
                {why.join('; ')}
              </p>
            )}
            {limits.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-label="Limits" />
                {limits.map((lim) => (
                  <Pill key={lim} tone="warn" className="text-xs font-medium">{lim}</Pill>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pl-12 sm:pl-0">
          <div className="flex items-baseline gap-1">
            <AnimatedNumber value={goalScore} className="text-2xl font-extrabold text-stone-900" />
            <span className="text-xs font-semibold text-stone-500">/100</span>
          </div>
          <div className="flex items-center gap-2">
            {trendInfo && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${trendInfo.cls}`}>
                <trendInfo.Icon className="w-3.5 h-3.5" />
                {trendInfo.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 group-hover:text-stone-800 transition-colors">
              <span className="hidden sm:inline">{open ? 'Hide' : 'Details'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </span>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={detailsId} key="details" {...COLLAPSE} className="overflow-hidden">
            <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-stone-100 bg-stone-50/60 sm:pl-[4.25rem]">
              <CropDetails id={item.crop} showHeader={false} />
              <p className="mt-3 text-xs text-stone-500 tabular-nums">
                Base fit {fit}/100 from climate {Math.round(parts.climate * 100)}%, water {Math.round(parts.water * 100)}%, soil {Math.round(parts.soil * 100)}%, risk{' '}
                {Math.round(parts.risk * 100)}% and benefit {Math.round(parts.benefit * 100)}% (team's rule-based score).
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
