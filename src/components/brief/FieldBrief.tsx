import { AlertTriangle, ArrowRight, BookOpenText } from 'lucide-react';
import type { Crop, RegionDetail } from '../../types';
import { Button, PrimaryButton } from '../ui/Button';
import { PageHeader } from '../ui/Card';
import { ClimateCharts } from './ClimateCharts';
import { InsightCards } from './InsightCards';
import { LocalContextCard } from './LocalContextCard';
import { MoreTrends } from './MoreTrends';
import { OutlookPanel } from './OutlookPanel';
import { SatelliteView } from './SatelliteView';
import { SoilCard } from './SoilCard';
import { StatCards } from './StatCards';

interface FieldBriefProps {
  data: RegionDetail;
  cropsMap: Record<string, Crop>;
  onContinue: () => void;
  onOpenMethods: () => void;
}

/** Step 2: what the measured weather, greenness and soil say about the chosen region. */
export function FieldBrief({ data, cropsMap, onContinue, onOpenMethods }: FieldBriefProps) {
  const hasWeather = data.monthly.length > 0;
  // Weather numbers are hidden when the series failed the pipeline's quality check (see data_quality.note).
  const weatherOk = hasWeather && data.data_quality.weather === 'ok';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`What the weather and soil say about ${data.region.name}`}
        description={`Measured 2001–2024 for the farmland around ${data.region.place}.`}
        note={`Sources: ${data.sources.join(', ')}.`}
        action={
          <div className="flex flex-col gap-2 sm:items-end">
            <PrimaryButton onClick={onContinue}>
              <span>Compare rotations</span>
              <ArrowRight className="w-4 h-4" />
            </PrimaryButton>
            <Button variant="ghost" size="sm" onClick={onOpenMethods}>
              <BookOpenText className="w-4 h-4" />
              How we analysed this
            </Button>
          </div>
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

      {weatherOk && data.outlook && <OutlookPanel outlook={data.outlook} />}
      <SatelliteView lat={data.region.lat} lon={data.region.lon} place={data.region.place} monthly={data.monthly} wetEnd={data.calendar.wet_end} />
      {weatherOk && <StatCards trends={data.trends} outlook={data.outlook} />}
      <InsightCards insights={data.insights} />
      {weatherOk && <ClimateCharts monthly={data.monthly} annual={data.annual} trends={data.trends} outlook={data.outlook} />}
      {weatherOk && <MoreTrends annual={data.annual} monthly={data.monthly} outlook={data.outlook} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SoilCard soil={data.soil} place={data.region.place} />
        <LocalContextCard priors={data.priors} scoringInputs={data.scoring_inputs} cropsMap={cropsMap} />
      </div>
    </div>
  );
}
