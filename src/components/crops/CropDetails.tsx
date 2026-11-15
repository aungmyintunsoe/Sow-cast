import { Lightbulb } from 'lucide-react';
import { CropIcon } from '../../lib/cropIcons';
import { capitalize, cn } from '../../lib/format';
import { Meter } from '../ui/Meter';
import { Pill } from '../ui/Pill';
import { cropLabel, useCrops } from './CropContext';

const fitTone = (fit: number) => (fit >= 75 ? 'bg-brand-100 text-brand-900' : fit >= 55 ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900');

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-stone-500">{label}</dt>
      <dd className="text-sm font-semibold text-stone-900 text-pretty">{value}</dd>
    </div>
  );
}

/**
 * Everything a farmer needs to know about one crop: where it fits here, when to plant and harvest,
 * typical yield, what it costs in inputs and work, what to plant it after, and a practical tip.
 * Used in the hover card and the crop ranking's details.
 */
export function CropDetails({ id, compact = false, showHeader = true }: { id: string; compact?: boolean; showHeader?: boolean }) {
  const { cropsMap, fitByCrop, place } = useCrops();
  const crop = cropsMap[id];
  const fit = fitByCrop[id];
  if (!crop) return <p className="text-sm text-stone-600">{cropLabel(id, cropsMap)}: no details in the crop table.</p>;
  const yieldText = crop.yield_low !== null && crop.yield_high !== null ? `${crop.yield_low}–${crop.yield_high} ${crop.yield_unit ?? ''}`.trim() : null;
  const names = (ids: string[]) => ids.map((x) => cropLabel(x, cropsMap)).join(', ');

  return (
    <div className="space-y-3.5">
      {showHeader && (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold leading-tight text-stone-900">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-800">
                <CropIcon id={id} className="h-[18px] w-[18px]" />
              </span>
              {crop.name}
            </h3>
            {fit && (
              <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold tabular-nums', fitTone(fit.fit))}>
                {fit.label ?? 'Fit'} here: {fit.fit}/100
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill>{capitalize(crop.season)}</Pill>
            <Pill>{capitalize(crop.role)}</Pill>
            {crop.nitrogen_fixing && <Pill tone="brand">Fixes nitrogen</Pill>}
          </div>
          <p className="mt-2 text-sm text-stone-700 text-pretty">{crop.plain_description}</p>
        </div>
      )}

      <dl className={cn('grid gap-x-4 gap-y-2.5', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
        <Fact label={place ? `Plant around ${place}` : 'Plant'} value={fit?.planting_window ?? null} />
        <Fact label="Harvest" value={fit?.harvest?.replace(' (rough)', '') ?? `about ${crop.season_days} days after sowing`} />
        <Fact label="Typical yield" value={yieldText} />
        <Fact label="Days to harvest" value={`About ${crop.season_days}`} />
      </dl>

      {fit?.yield_outlook && (
        <p className="text-sm text-stone-700">
          <span className="font-semibold text-stone-900">Expected here: </span>
          {fit.yield_outlook}.
        </p>
      )}

      <div className={cn('grid gap-x-6 gap-y-1.5', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
        <Meter label="Water need" value={crop.water_need} tone="brand" />
        <Meter label="Fertiliser need" value={crop.needs.fertiliser} />
        <Meter label="Labour" value={crop.needs.labour} />
        <Meter label="Seed cost" value={crop.needs.seed_cost} />
        <Meter label="Pest trouble" value={crop.needs.pest_difficulty} tone="amber" />
        <Meter label="Income (rough)" value={crop.relative_income} tone="brand" />
      </div>

      {crop.n_fixed && (
        <p className="text-sm text-brand-900">
          <span className="font-semibold">Adds nitrogen: </span>
          {crop.n_fixed.replace(' (rough)', '')}, which the next crop can use.
        </p>
      )}

      {crop.farmer_tip && (
        <div className="flex gap-2.5 rounded-xl bg-brand-50 p-3 text-sm text-brand-950">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
          <p className="text-pretty">{crop.farmer_tip}</p>
        </div>
      )}

      {(crop.good_after.length > 0 || crop.avoid_after.length > 0) && (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {crop.good_after.length > 0 && (
            <div>
              <dt className="text-xs font-semibold text-stone-500">Grows well after</dt>
              <dd className="text-stone-900">{names(crop.good_after)}</dd>
            </div>
          )}
          {crop.avoid_after.length > 0 && (
            <div>
              <dt className="text-xs font-semibold text-stone-500">Don't plant right after</dt>
              <dd className="text-stone-900">{names(crop.avoid_after)}</dd>
            </div>
          )}
        </dl>
      )}

      {!compact && fit?.rotation_tip && <p className="text-sm text-stone-700 text-pretty">{fit.rotation_tip}</p>}
      <p className="text-sm text-stone-600 text-pretty">
        <span className="font-semibold text-stone-800">Watch for: </span>
        {crop.pest_notes}
      </p>
    </div>
  );
}
