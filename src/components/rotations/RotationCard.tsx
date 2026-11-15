import { Fragment, type ReactNode } from 'react';
import { AlertOctagon, BookmarkCheck, CheckCircle2, HelpCircle, Satellite, Sprout } from 'lucide-react';
import type { Crop, RotationOption } from '../../types';
import { MONTHS_INITIAL } from '../../lib/format';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';

const SCORE_LABELS: { key: keyof RotationOption['scores']; label: string }[] = [
  { key: 'soil', label: 'Soil health' },
  { key: 'water', label: 'Water use' },
  { key: 'erosion', label: 'Erosion control' },
  { key: 'income', label: 'Farm income' },
  { key: 'pest_break', label: 'Pest break' },
];

/** Display name for one sequence step. Steps can combine crops ("perennial_tree+cover_legume"). */
const stepName = (step: string, cropsMap: Record<string, Crop>) =>
  step
    .split('+')
    .map((id) => (id === 'fallow' ? 'Fallow (bare)' : id === 'perennial_tree' ? 'Tree crops' : cropsMap[id]?.name ?? id))
    .join(' + ');

const scoreColor = (score: number) => (score >= 4 ? 'bg-brand-500' : score === 3 ? 'bg-amber-500' : 'bg-red-400');

function BulletList({ icon, title, items, tone }: { icon: ReactNode; title: string; items: string[]; tone: string }) {
  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-1.5 text-xs font-bold ${tone}`}>
        {icon}
        <span>{title}</span>
      </div>
      <ul className="space-y-1 pl-5 list-disc text-xs">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function GroundCoverStrip({ cover }: { cover: number[] | null }) {
  return (
    <div>
      <div className="flex flex-wrap justify-between gap-x-3 text-[11px] font-semibold text-stone-600 mb-1">
        <span>Ground cover by month</span>
        <span className="inline-flex items-center gap-2.5 text-stone-500">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-brand-500" />Living roots</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-soil-300" />Bare soil</span>
        </span>
      </div>
      {cover ? (
        <div className="grid grid-cols-12 gap-1">
          {cover.map((covered, month) => (
            <div key={month} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-full h-3.5 rounded ${covered === 1 ? 'bg-brand-500' : 'bg-soil-300'}`}
                title={`${MONTHS_INITIAL[month]}: ${covered === 1 ? 'Living plant cover' : 'Bare soil'}`}
              />
              <span className="text-[10px] font-bold text-stone-500">{MONTHS_INITIAL[month]}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-stone-500 bg-stone-50 border border-dashed border-stone-300 rounded-lg px-3 py-2">
          Shown once sowing and harvest months are collected for this region.
        </p>
      )}
    </div>
  );
}

function ScoreBars({ scores }: { scores: RotationOption['scores'] }) {
  return (
    <div className="space-y-2 bg-stone-50 rounded-xl p-3 border border-stone-200/70">
      {SCORE_LABELS.map(({ key, label }) => {
        const score = scores[key];
        return (
          <div key={key} className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-stone-700 w-24 shrink-0">{label}</span>
            <div className="flex-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((dot) => (
                <div key={dot} className={`h-2 flex-1 rounded-full ${dot <= score ? scoreColor(score) : 'bg-stone-200'}`} />
              ))}
            </div>
            <span className="font-bold text-stone-800 w-6 text-right">{score}/5</span>
          </div>
        );
      })}
    </div>
  );
}

interface RotationCardProps {
  rotation: RotationOption;
  cropsMap: Record<string, Crop>;
  chosen: boolean;
  onChoose: () => void;
}

/** One rotation option: its crops, 1–5 scores, evidence, benefits, unknowns and local risks. */
export function RotationCard({ rotation: rot, cropsMap, chosen, onChoose }: RotationCardProps) {
  const isCurrent = rot.id === 'current';
  return (
    <Card
      className={`p-5 flex flex-col justify-between transition-all ${
        chosen ? 'border-2 border-brand-600 bg-brand-50/30 ring-2 ring-brand-500/20' : isCurrent ? 'bg-stone-50/70' : ''
      }`}
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <Pill tone={isCurrent ? 'neutral' : 'brand'} className={`rounded-full px-2.5 py-1 text-xs font-bold ${isCurrent ? 'bg-stone-200 text-stone-800' : ''}`}>
              {rot.label}
            </Pill>
            <span className="text-xs font-semibold text-stone-500">Evidence: {rot.confidence}</span>
          </div>
          <h3 className="text-lg font-extrabold text-stone-900 leading-snug">{rot.name}</h3>
          {rot.tagline && <p className="text-xs font-medium text-stone-600 mt-0.5">{rot.tagline}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {rot.sequence.map((step, idx) => {
            const fallow = step === 'fallow';
            return (
              <Fragment key={`${step}-${idx}`}>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold border px-2.5 py-1 rounded-lg ${
                    fallow ? 'bg-soil-50 border-soil-200 text-soil-800' : 'bg-stone-100 border-stone-200 text-stone-800'
                  }`}
                >
                  <Sprout className={`w-3.5 h-3.5 ${fallow ? 'text-soil-500' : 'text-brand-600'}`} />
                  {stepName(step, cropsMap)}
                </span>
                {idx < rot.sequence.length - 1 && <span className="text-stone-400 font-bold text-xs">→</span>}
              </Fragment>
            );
          })}
        </div>

        <GroundCoverStrip cover={rot.cover_by_month} />
        <ScoreBars scores={rot.scores} />

        <div>
          <div className="text-xs font-bold text-stone-700 mb-1">Why it works</div>
          <p className="text-sm text-stone-800 leading-relaxed">{rot.why}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Satellite className="w-3.5 h-3.5 text-nasa-blue shrink-0" />
          {rot.evidence.map((ev) => (
            <Pill key={ev} tone="info" className="border border-blue-200">{ev}</Pill>
          ))}
        </div>

        <div className="text-stone-700">
          <BulletList icon={<CheckCircle2 className="w-4 h-4 text-brand-600" />} title="Benefits" items={rot.benefits} tone="text-brand-800" />
        </div>
        <div className="text-stone-600">
          <BulletList icon={<HelpCircle className="w-4 h-4 text-stone-500" />} title="What satellites can't see" items={rot.gaps} tone="text-stone-700" />
        </div>
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-amber-950">
          <BulletList icon={<AlertOctagon className="w-4 h-4 text-amber-600" />} title="Risks to check locally" items={rot.risks} tone="text-amber-900" />
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-stone-200">
        <button
          type="button"
          onClick={onChoose}
          aria-pressed={chosen}
          className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
            !chosen && isCurrent ? 'bg-stone-200 hover:bg-stone-300 text-stone-800' : 'bg-brand-600 hover:bg-brand-700 text-white'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>{chosen ? 'Chosen for your field' : 'Choose this plan'}</span>
        </button>
      </div>
    </Card>
  );
}
