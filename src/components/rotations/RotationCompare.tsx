import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ArrowRight, Coins, Droplets, HandCoins, Hammer, Scale, ShieldCheck, Sprout } from 'lucide-react';
import type { PlanGoal, RegionDetail } from '../../types';
import { SPRING } from '../../lib/motion';
import { Button, PrimaryButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/Card';
import { RotationCard } from './RotationCard';

export const PLAN_GOALS: { id: PlanGoal; label: string; Icon: typeof Sprout }[] = [
  { id: 'balanced', label: 'Balanced', Icon: Scale },
  { id: 'soil_health', label: 'Soil health', Icon: Sprout },
  { id: 'market_income', label: 'Market value', Icon: Coins },
  { id: 'water_saving', label: 'Save water', Icon: Droplets },
  { id: 'low_risk', label: 'Low risk', Icon: ShieldCheck },
  { id: 'low_cost_labour', label: 'Low cost & labour', Icon: HandCoins },
];

interface RotationCompareProps {
  regionName: string;
  detail: RegionDetail;
  goal: PlanGoal;
  onGoalChange: (g: PlanGoal) => void;
  /** Opens the plan as a PDF (print dialog). Nothing is stored. */
  onDownload: (planId: string) => void;
  onBuildOwn: () => void;
  onContinue: () => void;
}

/** Step 3: what farmers do now, next to the team recommender's top 3 rotations for the chosen goal. */
export function RotationCompare({ regionName, detail, goal, onGoalChange, onDownload, onBuildOwn, onContinue }: RotationCompareProps) {
  const { current, by_goal } = detail.plans;
  const plans = by_goal[goal] ?? [];
  const goalLabel = PLAN_GOALS.find((g) => g.id === goal)?.label;
  const { wet_start, wet_end } = detail.calendar;
  const card = (p: NonNullable<typeof current>) => (
    <RotationCard
      key={p.id}
      plan={p}
      baseline={current}
      goalLabel={p.kind === 'recommended' ? goalLabel : undefined}
      wetStart={wet_start}
      wetEnd={wet_end}
      onDownload={() => onDownload(p.id)}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`3. Crop rotations for ${regionName}`}
        description="Pick what matters most. The three best rotations for that goal appear next to what farmers here do now. Hover or tap a crop name for how to grow it."
        action={
          <PrimaryButton onClick={onContinue}>
            <span>See best crops</span>
            <ArrowRight className="h-4 w-4" />
          </PrimaryButton>
        }
      >
        <div role="radiogroup" aria-label="Goal for the rotation" className="mt-5 flex flex-wrap gap-2">
          {PLAN_GOALS.map(({ id, label, Icon }) => {
            const active = id === goal;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onGoalChange(id)}
                className={`relative isolate inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
                  active ? 'border-brand-700 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500 hover:bg-stone-50'
                }`}
              >
                {active && <motion.span layoutId="plan-goal-pill" transition={SPRING} className="absolute inset-0 -z-10 rounded-[11px] bg-brand-600" />}
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
        {detail.rotation_relevance.startsWith('low') && (
          <p className="mt-3 text-sm text-stone-600">Tree crops dominate here, so these plans are about what to grow between young trees.</p>
        )}
      </PageHeader>

      <LayoutGroup>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {current && card(current)}
          <AnimatePresence mode="popLayout" initial={false}>
            {plans.map((p) => card(p))}
          </AnimatePresence>
        </div>
      </LayoutGroup>
      <Card className="flex flex-col items-start gap-4 bg-brand-50/50 p-5 sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Hammer className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-stone-900">Have your own rotation in mind?</h3>
          <p className="mt-0.5 text-sm text-stone-700">Lay out your crops month by month and check it against this area's climate.</p>
        </div>
        <Button variant="secondary" onClick={onBuildOwn}>
          Build your own rotation
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Card>
      <p className="text-sm text-stone-500">
        Rotations ranked by the Sowcast team's recommender ({plans[0]?.basis.replace(/^Team recommender \(rec\.py\) on /, '') ?? 'draft values'}). Rule-based; not
        validated against field trials.
      </p>
    </div>
  );
}
