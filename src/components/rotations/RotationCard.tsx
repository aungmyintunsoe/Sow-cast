import { Fragment, forwardRef } from 'react';
import { CropIcon } from '../../lib/cropIcons';
import { motion } from 'framer-motion';
import { AlertOctagon, ArrowRight, CheckCircle2, Download } from 'lucide-react';
import type { RotationPlan } from '../../types';
import { cn } from '../../lib/format';
import { FADE, SPRING } from '../../lib/motion';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CropPeek } from '../crops/CropPeek';
import { CropCalendar } from './CropCalendar';

export const SCORE_ROWS: { key: keyof NonNullable<RotationPlan['scores']>; label: string }[] = [
  { key: 'soil', label: 'Soil health' },
  { key: 'water', label: 'Water fit' },
  { key: 'resilience', label: 'Weather resilience' },
  { key: 'market', label: 'Market value' },
  { key: 'low_cost', label: 'Low cost & labour' },
  { key: 'suitability', label: 'Crop match' },
];

/** One step of a sequence ("perennial_tree+cover_legume" → "Tree crops + Legume cover"), each crop hoverable. */
export function StepLabel({ step }: { step: string }) {
  const parts = step.split('+');
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-sm font-semibold text-stone-900">
      {parts.map((id, i) => (
        <Fragment key={id}>
          {i > 0 && <span className="text-stone-400">+</span>}
          <CropIcon id={id} className="h-4 w-4 text-brand-700" />
          <CropPeek id={id} />
        </Fragment>
      ))}
    </span>
  );
}

export function Sequence({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((step, idx) => (
        <Fragment key={`${step}-${idx}`}>
          <StepLabel step={step} />
          {idx < steps.length - 1 && <ArrowRight className="h-4 w-4 text-stone-400" aria-label="then" />}
        </Fragment>
      ))}
    </div>
  );
}

/** 0-100 bars; the thin dark tick marks what farmers do today, so the gain or loss is visible at a glance. */
function ScoreBars({ scores, baseline }: { scores: NonNullable<RotationPlan['scores']>; baseline: RotationPlan['scores'] | null }) {
  return (
    <div className="space-y-2">
      {SCORE_ROWS.map(({ key, label }) => {
        const v = scores[key];
        const b = baseline?.[key];
        const delta = b === undefined || b === null ? null : v - b;
        return (
          <div key={key} className="grid grid-cols-[7.5rem_1fr_3.25rem] items-center gap-2 text-sm">
            <span className="text-stone-700">{label}</span>
            <span className="relative h-2.5 rounded-full bg-stone-200">
              <motion.span
                className={cn('absolute inset-y-0 left-0 rounded-full', v >= 70 ? 'bg-brand-600' : v >= 45 ? 'bg-amber-500' : 'bg-red-400')}
                initial={false}
                animate={{ width: `${v}%` }}
                transition={SPRING}
              />
              {b !== undefined && b !== null && (
                <span className="absolute -inset-y-1 w-0.5 rounded bg-stone-900" style={{ left: `calc(${b}% - 1px)` }} title={`Today: ${b}`} />
              )}
            </span>
            <span className="text-right tabular-nums">
              <span className="font-bold text-stone-900">{v}</span>
              {delta !== null && delta !== 0 && (
                <span className={cn('ml-1 text-xs font-semibold', delta > 0 ? 'text-brand-700' : 'text-red-700')}>
                  {delta > 0 ? '+' : '−'}
                  {Math.abs(delta)}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface RotationCardProps {
  plan: RotationPlan;
  baseline: RotationPlan | null;
  goalLabel?: string;
  wetStart: number | null;
  wetEnd: number | null;
  /** Opens the plan document and the browser's Save as PDF dialog. */
  onDownload: () => void;
}

/** One rotation: crops in order, month calendar, scores against today's practice, reasons and cautions. */
export const RotationCard = forwardRef<HTMLDivElement, RotationCardProps>(function RotationCard(
  { plan, baseline, goalLabel, wetStart, wetEnd, onDownload },
  ref,
) {
  const isCurrent = plan.kind === 'current';
  return (
    <motion.div ref={ref} layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ layout: SPRING, ...FADE }}>
      <Card className={cn('flex h-full flex-col p-5', isCurrent && 'bg-stone-50')}>
        <div className="flex-1 space-y-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', isCurrent ? 'bg-stone-200 text-stone-800' : 'bg-brand-100 text-brand-900')}>
                {isCurrent ? 'What farmers do now' : `${plan.rank === 1 ? 'Top pick' : `Option ${plan.rank}`}${goalLabel ? `: ${goalLabel.toLowerCase()}` : ''}`}
              </span>
              {plan.goal_match !== null && (
                <span className="text-xs font-semibold text-stone-600">
                  Goal match <span className="text-base font-extrabold tabular-nums text-stone-900">{plan.goal_match}</span>/100
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold leading-snug text-stone-900">{plan.name}</h3>
            <p className="mt-0.5 text-sm text-stone-600">{plan.tagline ?? plan.plan_type}</p>
          </div>

          <Sequence steps={plan.sequence} />

          {plan.calendar && <CropCalendar rows={plan.calendar.rows} wetStart={wetStart} wetEnd={wetEnd} />}

          {plan.scores ? (
            <div>
              <ScoreBars scores={plan.scores} baseline={isCurrent ? null : baseline?.scores ?? null} />
              {!isCurrent && baseline?.scores && <p className="mt-2 text-xs text-stone-500">Dark tick: what farmers do now. Scores out of 100.</p>}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600">Not scored: tree crops are outside the rotation model.</p>
          )}

          {plan.why.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-brand-800">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {isCurrent ? 'Where this comes from' : 'Why it works'}
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-stone-800">
                {plan.why.slice(0, 3).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.cautions.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-amber-900">
                <AlertOctagon className="h-4 w-4 text-amber-600" aria-hidden="true" />
                Check before you start
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {plan.cautions.slice(0, 3).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-stone-200 pt-4">
          <Button variant={isCurrent ? 'secondary' : 'primary'} size="sm" onClick={onDownload} className="w-full">
            <Download className="h-4 w-4" />
            <span>Download PDF plan</span>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
});
