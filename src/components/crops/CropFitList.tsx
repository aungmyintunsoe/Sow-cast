import { useMemo, useState, type ReactNode } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { Coins, Droplets, ShieldCheck, Sprout } from 'lucide-react';
import type { Crop, CropFitResult } from '../../types';
import { rankCrops, type GoalId } from '../../lib/cropScoring';
import { SPRING } from '../../lib/motion';
import { Card, PageHeader } from '../ui/Card';
import { CropRow } from './CropRow';

const GOALS: { id: GoalId; label: string; icon: ReactNode; desc: string }[] = [
  { id: 'overall', label: 'Best overall fit', icon: <Sprout className="w-4 h-4" />, desc: 'Balanced match for the climate, water and soil here' },
  { id: 'soil', label: 'Protect soil', icon: <ShieldCheck className="w-4 h-4" />, desc: 'Prioritize ground cover, deep roots & organic matter' },
  { id: 'water', label: 'Save water', icon: <Droplets className="w-4 h-4" />, desc: 'Low water need & strong drought survival' },
  { id: 'nitrogen', label: 'Add nitrogen', icon: <Sprout className="w-4 h-4" />, desc: 'Legumes that feed nitrogen to the next crop' },
  { id: 'income', label: 'Cash market', icon: <Coins className="w-4 h-4" />, desc: 'Higher market demand and grain value' },
];

interface CropFitListProps {
  regionName: string;
  cropFit: CropFitResult[];
  cropsMap: Record<string, Crop>;
}

/** Step 4: every crop ranked for the region; choosing a goal re-ranks the list with a live reorder. */
export function CropFitList({ regionName, cropFit, cropsMap }: CropFitListProps) {
  const [goal, setGoal] = useState<GoalId>('overall');
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);
  const ranked = useMemo(() => rankCrops(cropFit, cropsMap, goal), [cropFit, cropsMap, goal]);
  const goalInfo = GOALS.find((g) => g.id === goal) ?? GOALS[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`4. Best individual crops for ${regionName}`}
        description="Pick what matters most for your next season. The list re-ranks crops using your local climate fit and crop traits."
      >
        <div className="flex flex-wrap gap-2 mt-4" role="radiogroup" aria-label="What matters most">
          {GOALS.map((g) => {
            const active = goal === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setGoal(g.id)}
                className={`relative isolate inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
                  active ? 'border-brand-600 text-white' : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-brand-400 hover:bg-white'
                }`}
              >
                {/* The green fill is one shared element that slides to the chosen goal. */}
                {active && <motion.span layoutId="goal-pill" transition={SPRING} className="absolute inset-0 -z-10 rounded-[11px] bg-brand-600" />}
                {g.icon}
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-stone-600 mt-3" aria-live="polite">
          Ranked for: <span className="font-semibold text-stone-800">{goalInfo.desc}</span>
        </p>
      </PageHeader>

      {/* One container so the ranking reads as a single list. Rows keep their keys across goals, so each
          one slides to its new place instead of the list being replaced. */}
      <Card className="overflow-hidden">
        <LayoutGroup>
          <ol className="divide-y divide-stone-200">
            {ranked.map((item, idx) => (
              <CropRow
                key={item.crop}
                item={item}
                rank={idx + 1}
                enterDelay={Math.min(idx, 10) * 0.025}
                open={expandedCrop === item.crop}
                onToggle={() => setExpandedCrop((cur) => (cur === item.crop ? null : item.crop))}
              />
            ))}
          </ol>
        </LayoutGroup>
      </Card>
    </div>
  );
}
