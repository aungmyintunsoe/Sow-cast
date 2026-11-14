import React, { useState } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  AlertOctagon,
  Satellite,
  ArrowRight,
  BookmarkCheck,
  Sprout,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Crop, RotationOption } from '../types';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const SCORE_LABELS: { key: keyof RotationOption['scores']; label: string }[] = [
  { key: 'soil', label: 'Soil Health' },
  { key: 'water', label: 'Water Smart' },
  { key: 'erosion', label: 'Erosion Shield' },
  { key: 'income', label: 'Farm Income' },
  { key: 'pest_break', label: 'Pest Break' },
];

interface RotationCompareProps {
  regionName: string;
  rotations: RotationOption[];
  cropsMap: Record<string, Crop>;
  onContinue: () => void;
}

export const RotationCompare: React.FC<RotationCompareProps> = ({
  regionName,
  rotations,
  cropsMap,
  onContinue,
}) => {
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleSavePlan = (id: string) => {
    setSavedId(id);
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore if confetti fails in headless browser
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-surface bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            3. Compare crop rotations for {regionName}
          </h2>
          <p className="text-stone-600 text-sm sm:text-base mt-1">
            See how your current crop sequence stacks up against 2 satellite-backed alternatives—including what could go wrong and what to verify locally.
          </p>
        </div>
        <button
          onClick={onContinue}
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition shrink-0 text-base"
        >
          <span>Explore Best Crops</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {rotations.map((rot) => {
          const isCurrent = rot.id === 'current';
          const isSaved = savedId === rot.id;

          return (
            <div
              key={rot.id}
              className={`card-surface rounded-2xl border-2 p-5 shadow-sm flex flex-col justify-between transition-all ${
                isSaved
                  ? 'border-brand-600 bg-brand-50/30 ring-2 ring-brand-500/20'
                  : isCurrent
                  ? 'border-stone-300 bg-stone-50/70'
                  : 'border-brand-200 bg-white'
              }`}
            >
              <div className="space-y-4">
                {/* Badge + Title */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        isCurrent
                          ? 'bg-stone-200 text-stone-800'
                          : 'bg-brand-100 text-brand-800'
                      }`}
                    >
                      {rot.label}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      {rot.cover_by_month.filter((v) => v === 1).length}/12 mos covered
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-stone-900 leading-snug">
                    {rot.name}
                  </h3>
                  {rot.tagline && (
                    <p className="text-xs font-medium text-stone-600 mt-0.5">{rot.tagline}</p>
                  )}
                </div>

                {/* Crop Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {rot.sequence.map((cropId, idx) => (
                    <React.Fragment key={`${cropId}-${idx}`}>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-stone-100 border border-stone-200 text-stone-800 px-2.5 py-1 rounded-lg">
                        <Sprout className="w-3.5 h-3.5 text-brand-600" />
                        {cropsMap[cropId]?.name || cropId}
                      </span>
                      {idx < rot.sequence.length - 1 && (
                        <span className="text-stone-400 font-bold text-xs">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* 12-Month Living Cover Strip */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                    <span>12-Month Ground Cover</span>
                    <span className="text-stone-500">Green = Living Roots · Brown = Bare</span>
                  </div>
                  <div className="grid grid-cols-12 gap-1">
                    {rot.cover_by_month.map((covered, mIdx) => (
                      <div key={mIdx} className="flex flex-col items-center gap-0.5">
                        <div
                          className={`w-full h-3.5 rounded ${
                            covered === 1 ? 'bg-brand-500' : 'bg-soil-300'
                          }`}
                          title={`${MONTHS[mIdx]}: ${covered === 1 ? 'Living plant cover' : 'Bare soil'}`}
                        />
                        <span className="text-[10px] font-bold text-stone-500">
                          {MONTHS[mIdx]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5 Scores */}
                <div className="space-y-2 bg-stone-50 rounded-xl p-3 border border-stone-200/70">
                  {SCORE_LABELS.map(({ key, label }) => {
                    const val = rot.scores[key];
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-stone-700 w-24 shrink-0">{label}</span>
                        <div className="flex-1 flex gap-1">
                          {[1, 2, 3, 4, 5].map((dot) => (
                            <div
                              key={dot}
                              className={`h-2 flex-1 rounded-full ${
                                dot <= val
                                  ? val >= 4
                                    ? 'bg-brand-500'
                                    : val === 3
                                    ? 'bg-amber-500'
                                    : 'bg-red-400'
                                  : 'bg-stone-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-bold text-stone-800 w-6 text-right">{val}/5</span>
                      </div>
                    );
                  })}
                </div>

                {/* Why */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">
                    Why this works / Tradeoff
                  </div>
                  <p className="text-sm text-stone-800 leading-relaxed">{rot.why}</p>
                </div>

                {/* Evidence */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-nasa-blue shrink-0" />
                  {rot.evidence.map((ev) => (
                    <span
                      key={ev}
                      className="text-[11px] font-semibold bg-blue-50 text-nasa-blue border border-blue-200 px-2 py-0.5 rounded-md"
                    >
                      {ev}
                    </span>
                  ))}
                </div>

                {/* Benefits */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-800">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Benefits</span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-stone-700">
                    {rot.benefits.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>

                {/* Unknowns (Gaps) */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <HelpCircle className="w-4 h-4 text-stone-500" />
                    <span>Unknowns (Satellites cannot see)</span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-stone-600">
                    {rot.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>

                {/* Risks to check locally */}
                <div className="space-y-1 bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertOctagon className="w-4 h-4 text-amber-600" />
                    <span>Risks to check locally</span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-amber-950">
                    {rot.risks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-stone-200">
                <button
                  onClick={() => handleSavePlan(rot.id)}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                    isSaved
                      ? 'bg-brand-600 text-white'
                      : isCurrent
                      ? 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                      : 'bg-nasa-blue hover:bg-blue-900 text-white'
                  }`}
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>{isSaved ? 'Selected for Your Field' : 'Choose This Plan'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
