import { useMemo, useState, type ReactNode } from 'react';
import { Coins, Droplets, ShieldCheck, Sprout } from 'lucide-react';
import type { Crop, CropFitResult } from '../../types';
import { rankCrops, type GoalId } from '../../lib/cropScoring';
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

/** Step 4: every crop ranked for the region, re-ranked by the farmer's goal. */
export function CropFitList({ regionName, cropFit, cropsMap }: CropFitListProps) {
  const [goal, setGoal] = useState<GoalId>('overall');
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);
  const ranked = useMemo(() => rankCrops(cropFit, cropsMap, goal), [cropFit, cropsMap, goal]);
  const goalInfo = GOALS.find((g) => g.id === goal);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`4. Best individual crops for ${regionName}`}
        description="Pick what matters most for your next season. The list re-ranks crops using your local climate fit and crop traits."
      >
        <div className="flex flex-wrap gap-2 mt-4">
          {GOALS.map((g) => {
            const active = goal === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoal(g.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  active ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-brand-400'
                }`}
              >
                {g.icon}
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-stone-500 mt-2 font-medium">Goal focus: {goalInfo?.desc}</p>
      </PageHeader>

      {/* One container so the ranking reads as a single list */}
      <Card className="overflow-hidden">
        <ol className="divide-y divide-stone-200">
          {ranked.map((item, idx) => (
            <CropRow
              key={item.crop}
              item={item}
              rank={idx + 1}
              open={expandedCrop === item.crop}
              onToggle={() => setExpandedCrop((cur) => (cur === item.crop ? null : item.crop))}
            />
          ))}
        </ol>
      </Card>
    </div>
  );
}
