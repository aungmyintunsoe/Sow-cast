import { Fragment } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, BookOpenText, Calculator, CloudRain, FlaskConical, Layers, LineChart, Mountain, Satellite, ShieldAlert, Sprout, Thermometer, TrendingUp,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, PageHeader } from '../ui/Card';
import { ProjectionBadge } from '../brief/OutlookPanel';

const PIPELINE = [
  { Icon: Satellite, title: 'Collect', body: 'Daily rain, temperature, greenness, soil and slope for each region, 2001–2024.' },
  { Icon: ShieldAlert, title: 'Check', body: 'Test each weather series for the known 2008 break, and correct temperature for the town’s elevation.' },
  { Icon: LineChart, title: 'Summarise', body: 'Months, years, heat days, downpours, dry spells, water budget.' },
  { Icon: TrendingUp, title: 'Find trends', body: 'Mann-Kendall test and Theil–Sen slope on each yearly series.' },
  { Icon: FlaskConical, title: 'Project', body: 'Extend clear trends to 2035 with an 80% range for a single year.' },
  { Icon: Sprout, title: 'Score crops', body: "Re-run the team's crop rules today, in 2035 and in a bad year." },
];

const SOURCES = [
  { Icon: CloudRain, name: 'CHIRPS 2.0', who: 'UC Santa Barbara / USAID / NASA SERVIR, via ClimateSERV', what: 'Daily rain, ~5 km' },
  { Icon: Thermometer, name: 'NASA POWER', who: 'NASA Langley (MERRA-2)', what: 'Daily temperature, humidity, sunlight, ~50 km' },
  { Icon: Thermometer, name: 'ERA5', who: 'ECMWF / Copernicus, via Open-Meteo', what: 'Daily temperature where POWER is broken, ~25 km' },
  { Icon: Satellite, name: 'NASA GIBS (VIIRS / MODIS NDVI)', who: 'NASA Earthdata', what: 'Monthly plant greenness and satellite images' },
  { Icon: Layers, name: 'SoilGrids 2.0', who: 'ISRIC World Soil Information', what: 'Soil texture, carbon, pH, water holding, 250 m' },
  { Icon: Mountain, name: 'SRTM', who: 'NASA / USGS, via OpenTopoData', what: 'Elevation and slope, 30 m' },
  { Icon: BookOpenText, name: 'Sowcast team tables', who: 'Cornish 2018, Herridge 2019, Vityakon 2007, Toomsan et al., FAO', what: 'Regions, crop traits, planting calendar, rotations' },
];

const METHODS = [
  {
    title: 'Is the change real? (Mann-Kendall test)',
    body: 'Checks whether a yearly series keeps going up or down, without assuming a straight line or normal data. Below p = 0.05 we call it a clear change; 0.05 to 0.15 a possible one. With 24 years, a possible change is worth watching, not proof.',
  },
  {
    title: 'How fast? (Theil–Sen slope)',
    body: 'The middle value of the slopes between every pair of years. One extreme El Niño or La Niña year cannot drag it the way it drags an ordinary straight-line fit.',
  },
  {
    title: 'Where is it heading? (projection to 2035)',
    body: 'Clear or possible trends are extended to 2035. With no clear trend we project the 2001–2024 average instead of extending noise. Counts and rain are never allowed below zero.',
  },
  {
    title: 'How far can one year swing? (80% range)',
    body: 'From how far real years sat from the trend line, widened the further we look ahead. About 1 year in 10 falls below the range and 1 in 10 above it. The low edge is the "bad year" used in the stress test.',
  },
  {
    title: 'What does it mean for crops? (re-scoring)',
    body: "Each crop is scored with the team's own rules (climate, water, soil, risk, benefit), first with today's measured values, then with the 2035 projection, then with a bad year around 2035.",
  },
  {
    title: 'Which rotations? (team recommender)',
    body: 'Every valid 1–3 crop rotation from the 10 best-fitting crops is scored on soil, market, water, weather resilience, cost and crop match, then ranked for each of six goals.',
  },
];

/** How the numbers in Sowcast were made: data sources, the analysis steps and their limits. Mirrors data/ANALYSIS.md. */
export function MethodsPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="How the data was analysed"
        description="Every number in Sowcast comes from open data and a method you can check. Here is where the data comes from, what we do with it, and where it falls short."
        action={
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <section aria-labelledby="pipeline-title">
        <h3 id="pipeline-title" className="mb-3 text-xl font-bold text-stone-900">From satellites to advice</h3>
        <ol className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {PIPELINE.map(({ Icon, title, body }, i) => (
            <Fragment key={title}>
              <li className="relative">
                <Card className="h-full p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-display text-sm font-bold text-stone-500 tabular-nums">{i + 1}</span>
                  </div>
                  <h4 className="mt-3 font-bold text-stone-900">{title}</h4>
                  <p className="mt-1 text-sm text-stone-600 text-pretty">{body}</p>
                </Card>
                {i < PIPELINE.length - 1 && (
                  <>
                    <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-stone-400 lg:block" aria-hidden="true" />
                    <ArrowDown className="mx-auto mt-1 h-4 w-4 text-stone-400 md:hidden" aria-hidden="true" />
                  </>
                )}
              </li>
            </Fragment>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sources-title">
        <h3 id="sources-title" className="mb-3 text-xl font-bold text-stone-900">Data sources (all open, no login)</h3>
        <Card className="divide-y divide-stone-200">
          {SOURCES.map(({ Icon, name, who, what }) => (
            <div key={name} className="flex items-start gap-3 p-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="grid flex-1 gap-0.5 sm:grid-cols-[14rem_1fr]">
                <div>
                  <p className="font-bold text-stone-900">{name}</p>
                  <p className="text-xs text-stone-500">{who}</p>
                </div>
                <p className="text-sm text-stone-700">{what}</p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section aria-labelledby="methods-title">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 id="methods-title" className="text-xl font-bold text-stone-900">The methods, in plain words</h3>
          <Calculator className="h-5 w-5 text-stone-500" aria-hidden="true" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {METHODS.map((m) => (
            <Card key={m.title} className="p-5">
              <h4 className="font-bold text-stone-900">{m.title}</h4>
              <p className="mt-1.5 text-sm text-stone-700 text-pretty">{m.body}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-4 bg-violet-50/60 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <ProjectionBadge />
            <h4 className="font-bold text-stone-900">What a projection is, and is not</h4>
          </div>
          <p className="mt-1.5 max-w-[75ch] text-sm text-stone-700 text-pretty">
            Anything marked Projection (purple, dashed) extends what was measured in 2001–2024. It is not a climate-model forecast: it does not know about future emissions,
            El Niño cycles beyond the record, new irrigation or land-use change. Read 2035 values as "if nothing changes".
          </p>
        </Card>
      </section>

      <section aria-labelledby="limits-title">
        <h3 id="limits-title" className="mb-3 text-xl font-bold text-stone-900">Known limits</h3>
        <ul className="grid gap-2 text-sm text-stone-700 md:grid-cols-2">
          {[
            'Each region is a town and the farmland around it, not a single field.',
            'Flood, salt, drainage and irrigation risks are the team’s estimates; only rain, temperature, dry months, soil texture and slope are measured.',
            'The 8 Malaysian regions use general-knowledge estimates from the team (low confidence).',
            'Crop and rotation scores are rule-based and not yet checked against field trials or yield records.',
            '24 years is short for climate trends; one extreme year can move a trend, which is why the range is always shown.',
            'Where a weather series fails the quality check, its numbers and projections are hidden rather than shown wrong.',
          ].map((t) => (
            <li key={t} className="flex gap-2 rounded-xl border border-stone-200 bg-white p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-stone-500">The full write-up, with formulas and the scripts that run each step, is in data/ANALYSIS.md in the project.</p>
      </section>
    </div>
  );
}
