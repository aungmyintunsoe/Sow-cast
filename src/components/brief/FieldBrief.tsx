import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { Crop, RegionDetail } from '../../types';
import { PrimaryButton } from '../ui/Button';
import { PageHeader } from '../ui/Card';
import { ClimateCharts } from './ClimateCharts';
import { InsightCards } from './InsightCards';
import { LocalContextCard } from './LocalContextCard';
import { SoilCard } from './SoilCard';
import { StatCards } from './StatCards';

interface FieldBriefProps {
  data: RegionDetail;
  cropsMap: Record<string, Crop>;
  onContinue: () => void;
}

/** Step 2: what the measured weather, greenness and soil say about the chosen region. */
export function FieldBrief({ data, cropsMap, onContinue }: FieldBriefProps) {
  const hasWeather = data.monthly.length > 0;
  // Weather numbers are hidden when the series failed the pipeline's quality check (see data_quality.note).
  const weatherOk = hasWeather && data.data_quality.weather === 'ok';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`What the weather and soil say about ${data.region.name}`}
        description={`Sources: ${data.sources.join(', ')}. Weather is for the area around ${data.region.place}.`}
        action={
          <PrimaryButton onClick={onContinue}>
            <span>Compare rotations</span>
            <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
        }
      />

      {!hasWeather && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-sm">
          Weather data for this region has not been fetched yet. Run <code>node data/scripts/run_all.mjs</code>.
        </div>
      )}

      {data.data_quality.weather === 'suspect' && data.data_quality.note && (
        <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-4 text-sm flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Weather data is not reliable here yet. </span>
            {data.data_quality.note}
          </p>
        </div>
      )}

      {weatherOk && <StatCards trends={data.trends} />}
      <InsightCards insights={data.insights} />
      {weatherOk && <ClimateCharts monthly={data.monthly} annual={data.annual} trends={data.trends} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SoilCard soil={data.soil} place={data.region.place} />
        <LocalContextCard priors={data.priors} scoringInputs={data.scoring_inputs} cropsMap={cropsMap} />
      </div>
    </div>
  );
}
