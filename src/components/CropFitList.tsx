import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Droplets,
  ShieldCheck,
  Sprout,
  Coins,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import type { Crop, CropFitResult } from '../types';

type GoalId = 'overall' | 'soil' | 'water' | 'nitrogen' | 'income';

const GOALS: { id: GoalId; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'overall',
    label: 'Best Overall Fit',
    icon: <Sprout className="w-4 h-4" />,
    desc: 'Balanced match for your 20-year weather & soil',
  },
  {
    id: 'soil',
    label: 'Protect Soil',
    icon: <ShieldCheck className="w-4 h-4" />,
    desc: 'Prioritize ground cover, deep roots & organic matter',
  },
  {
    id: 'water',
    label: 'Save Water',
    icon: <Droplets className="w-4 h-4" />,
    desc: 'Low water need & strong drought survival',
  },
  {
    id: 'nitrogen',
    label: 'Add Nitrogen',
    icon: <Sprout className="w-4 h-4" />,
    desc: 'Legumes that feed nitrogen to the next crop',
  },
  {
    id: 'income',
    label: 'Cash Market',
    icon: <Coins className="w-4 h-4" />,
    desc: 'Higher market demand and grain value',
  },
];

interface CropFitListProps {
  regionName: string;
  cropFit: CropFitResult[];
  cropsMap: Record<string, Crop>;
}

export const CropFitList: React.FC<CropFitListProps> = ({
  regionName,
  cropFit,
  cropsMap,
}) => {
  const [goal, setGoal] = useState<GoalId>('overall');
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);

  const rankedCrops = useMemo(() => {
    const list = cropFit
      .map((cf) => {
        const crop = cropsMap[cf.crop];
        if (!crop) return null;

        let goalScore = cf.fit;
        if (goal === 'soil') {
          goalScore = Math.round(cf.fit * 0.45 + (crop.erosion_cover * 10 + crop.organic_matter * 10) * 0.55);
        } else if (goal === 'water') {
          const lowWaterPts = (6 - crop.water_need) * 18;
          const droughtBonus =
            crop.drought_tolerance === 'very high' ? 15 : crop.drought_tolerance === 'high' ? 8 : 0;
          goalScore = Math.min(99, Math.round(cf.fit * 0.4 + (lowWaterPts + droughtBonus) * 0.6));
        } else if (goal === 'nitrogen') {
          goalScore = Math.min(
            99,
            Math.round(cf.fit * 0.45 + (crop.nitrogen_fixing ? 52 : 10) + crop.organic_matter * 3)
          );
        } else if (goal === 'income') {
          goalScore = Math.min(99, Math.round(cf.fit * 0.45 + crop.market * 11));
        }

        return {
          ...cf,
          cropObj: crop,
          goalScore,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return list.sort((a, b) => b.goalScore - a.goalScore);
  }, [cropFit, cropsMap, goal]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card-surface bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
          4. Best individual crops for {regionName}
        </h2>
        <p className="text-stone-600 text-sm sm:text-base mt-1">
          Pick what matters most for your next season. The list re-ranks crops using your local climate fit and crop traits.
        </p>

        {/* Goal Filter Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {GOALS.map((g) => {
            const active = goal === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  active
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-brand-400'
                }`}
              >
                {g.icon}
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-stone-500 mt-2 font-medium">
          Goal focus: {GOALS.find((g) => g.id === goal)?.desc}
        </p>
      </div>

      {/* Ranked List */}
      <div className="space-y-3">
        {rankedCrops.map((item, idx) => {
          const { cropObj, goalScore, fit, trend, limits } = item;
          const isOpen = expandedCrop === cropObj.id;

          return (
            <div
              key={cropObj.id}
              className="card-surface bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden transition"
            >
              <button
                onClick={() => setExpandedCrop(isOpen ? null : cropObj.id)}
                className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/70 transition"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 ${
                      idx === 0
                        ? 'bg-brand-600 text-white'
                        : idx <= 2
                        ? 'bg-brand-100 text-brand-900'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-stone-900">
                        {cropObj.name}
                      </h3>
                      <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                        {cropObj.season}
                      </span>
                      {cropObj.nitrogen_fixing && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-100 text-brand-800">
                          Fixes Nitrogen
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-600 mt-1">{cropObj.plain_description}</p>

                    {limits.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        {limits.map((lim, i) => (
                          <span
                            key={i}
                            className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md"
                          >
                            {lim}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side score & trend */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pl-12 sm:pl-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-stone-900">{goalScore}</span>
                    <span className="text-xs font-semibold text-stone-500">/100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        trend === 'increasing'
                          ? 'bg-brand-50 text-brand-700'
                          : trend === 'declining'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {trend === 'increasing' ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : trend === 'declining' ? (
                        <TrendingDown className="w-3.5 h-3.5" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                      {trend === 'increasing'
                        ? 'Improving fit'
                        : trend === 'declining'
                        ? 'Facing stress'
                        : 'Steady fit'}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expandable Details */}
              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-stone-100 bg-stone-50/50 text-xs sm:text-sm space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                      <div className="text-stone-500 text-xs">Water Need</div>
                      <div className="font-bold text-stone-900">{cropObj.water_need} / 5</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                      <div className="text-stone-500 text-xs">Root Depth</div>
                      <div className="font-bold text-stone-900 capitalize">{cropObj.root_depth}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                      <div className="text-stone-500 text-xs">Drought / Frost</div>
                      <div className="font-bold text-stone-900 capitalize">
                        {cropObj.drought_tolerance} / {cropObj.frost_tolerance}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                      <div className="text-stone-500 text-xs">Days to Harvest</div>
                      <div className="font-bold text-stone-900">~{cropObj.season_days} days</div>
                    </div>
                  </div>
                  <div className="text-xs text-stone-700 bg-white p-3 rounded-xl border border-stone-200">
                    <strong className="text-stone-900">Pest & Field Notes: </strong>
                    {cropObj.pest_notes}
                    <span className="block mt-1 text-stone-500">
                      Base climate fit: {fit}/100 · Plant family: {cropObj.family}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
