import type { SoilProfile } from '../../types';
import { Card } from '../ui/Card';
import { LabelValue } from '../ui/LabelValue';

const Capitalized = ({ children }: { children: string | null }) => <span className="capitalize">{children ?? 'Unknown'}</span>;

/** Measured soil (ISRIC SoilGrids) and slope (NASA SRTM) for the area. */
export function SoilCard({ soil, place }: { soil: SoilProfile | null; place: string }) {
  return (
    <Card className="p-5 bg-soil-50/70">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-stone-900 text-lg">Your soil</h3>
        {soil && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-soil-200 text-soil-900">
            Slope {soil.slope_pct ?? '–'}%, erosion risk {soil.erosion_risk ?? 'unknown'}
          </span>
        )}
      </div>
      {soil ? (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <LabelValue className="border-soil-200/70" label="Soil type" value={<Capitalized>{soil.texture}</Capitalized>} />
            <LabelValue className="border-soil-200/70" label="Organic matter" value={<Capitalized>{soil.organic_matter}</Capitalized>} />
            <LabelValue className="border-soil-200/70" label="Drainage" value={<Capitalized>{soil.drainage}</Capitalized>} />
            <LabelValue className="border-soil-200/70" label="Water holding" value={<Capitalized>{soil.water_holding}</Capitalized>} />
          </div>
          <p className="text-xs text-stone-600 mt-3">
            Source: {soil.source}
            {soil.sampled_km_from_town ? `, sampled ${soil.sampled_km_from_town} km from ${place} (no soil data inside the town)` : ''}.
          </p>
        </>
      ) : (
        <p className="text-sm text-stone-700">Soil data for this region has not been fetched yet.</p>
      )}
    </Card>
  );
}
