import type { Crop, RegionDetail } from '../../types';
import { CropPeek } from '../crops/CropPeek';
import { Card } from '../ui/Card';
import { LabelValue } from '../ui/LabelValue';

type InputValue = string | number | null;
const RISK_LEVEL = ['None', 'Low', 'Medium', 'High'];
const SOIL_NAMES: Record<string, string> = {
  sandy: 'Sandy', sandy_loam: 'Sandy loam', loam: 'Loam', clay_loam: 'Clay loam', silty_clay_loam: 'Silty clay loam', clay: 'Clay',
};
const asNum = (v: InputValue) => (v === null || v === '' ? null : Number(v));
const isBlank = (v: InputValue) => v === null || v === '';

/** Region inputs the crop scores depend on, in display order (see data/scripts/05b_score_measured.py). */
const INPUT_LABELS: Record<string, { label: string; fmt: (v: InputValue) => string }> = {
  rain_mm_approx: { label: 'Yearly rain', fmt: (v) => `${Math.round(asNum(v) ?? 0).toLocaleString()} mm` },
  mean_temp_c_approx: { label: 'Mean temperature', fmt: (v) => `${asNum(v)?.toFixed(1)} °C` },
  dry_months_approx: { label: 'Dry months', fmt: (v) => `${asNum(v)} a year` },
  soil_texture: { label: 'Topsoil', fmt: (v) => SOIL_NAMES[String(v)] ?? String(v) },
  slope_pct_approx: { label: 'Slope', fmt: (v) => `${asNum(v)}%` },
};

interface LocalContextCardProps {
  priors: RegionDetail['priors'];
  scoringInputs: RegionDetail['scoring_inputs'];
  cropsMap: Record<string, Crop>;
}

/** The team's local estimates (flood, salt, irrigation) and how the draft inputs compare with measured data. */
export function LocalContextCard({ priors, scoringInputs, cropsMap }: LocalContextCardProps) {
  const inputRows = (scoringInputs ?? []).filter((u) => u.input in INPUT_LABELS);
  const cellTone = (used: boolean) => (used ? 'font-bold text-stone-900' : 'text-stone-500');

  return (
    <Card className="p-5">
      <h3 className="font-bold text-stone-900 text-lg">What farms here deal with</h3>
      <p className="text-xs text-stone-500 mt-0.5 mb-3">
        Team estimates; no satellite measurement yet (confidence: {priors.confidence}).
      </p>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <LabelValue className="bg-stone-50" label="Flood risk" value={RISK_LEVEL[priors.flood_risk]} />
        <LabelValue className="bg-stone-50" label="Salt-water risk" value={RISK_LEVEL[priors.salinity_risk]} />
        <LabelValue className="bg-stone-50" label="Irrigation access" value={RISK_LEVEL[priors.irrigation_access]} />
      </div>

      {inputRows.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-stone-900">Team estimate vs measured</h4>
          <p className="text-xs text-stone-500 mb-2">The crop scores on the next pages use the value in bold.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500">
                <th className="font-medium py-1 pr-2" scope="col"></th>
                <th className="font-medium py-1 pr-2" scope="col">Team estimate</th>
                <th className="font-medium py-1" scope="col">Measured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {inputRows.map((u) => {
                const { label, fmt } = INPUT_LABELS[u.input];
                return (
                  <tr key={u.input} title={u.source}>
                    <th scope="row" className="text-left font-medium text-stone-700 py-1.5 pr-2">{label}</th>
                    <td className={`py-1.5 pr-2 ${cellTone(u.used === 'draft')}`}>{fmt(u.draft)}</td>
                    <td className={`py-1.5 ${cellTone(u.used === 'measured')}`}>
                      {isBlank(u.measured) ? 'Not measured yet' : fmt(u.measured)}
                      {!isBlank(u.measured) && <span className="block text-xs font-normal text-stone-500">{u.source}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-stone-700 mt-3">
        {priors.common_crops.length ? (
          <>
            Commonly grown:{' '}
            {priors.common_crops.map((id, i) => (
              <span key={id}>
                <CropPeek id={id}>{cropsMap[id]?.name ?? id}</CropPeek>
                {i < priors.common_crops.length - 1 ? ', ' : '.'}
              </span>
            ))}
          </>
        ) : priors.tree_crop_dominated
            ? 'Mostly tree crops such as rubber and oil palm.'
            : ''}
      </p>
    </Card>
  );
}
