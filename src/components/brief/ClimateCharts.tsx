import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnnualClimate, ClimateTrends, MonthlyClimate } from '../../types';
import { MONTHS_SHORT } from '../../lib/format';
import { Card } from '../ui/Card';
import { trendWords } from './trendWords';

// Recharts takes colours as SVG props, so they are hex values here rather than Tailwind classes.
// They match the Tailwind palette: stone-200/700, blue-400/700, orange-600, green-600.
const COLOR = { grid: '#e7e5e4', tick: '#44403c', rain: '#60a5fa', rainAxis: '#1d4ed8', demand: '#ea580c', plant: '#16a34a' };
const TOOLTIP_STYLE = { borderRadius: '12px', border: '1px solid #d6d3d1', fontSize: '12px' };
const AXIS_TICK = { fontSize: 12, fill: COLOR.tick };

type TrendKey = 'heat_days' | 'precip_mm' | 'heavy_rain_days' | 'max_dry_spell_days';
const TREND_VIEWS: { key: TrendKey; label: string; name: string; stroke: string; fill: string }[] = [
  { key: 'heat_days', label: 'Hot days', name: 'Days at 35 °C or hotter', stroke: '#ea580c', fill: '#fed7aa' },
  { key: 'precip_mm', label: 'Yearly rain', name: 'Rain (mm)', stroke: '#2563eb', fill: '#bfdbfe' },
  { key: 'heavy_rain_days', label: 'Downpours', name: 'Days with 20 mm+ rain', stroke: '#0B3D91', fill: '#dbeafe' },
  { key: 'max_dry_spell_days', label: 'Dry spells', name: 'Longest dry spell (days)', stroke: '#a7654b', fill: '#eed9ce' },
];

interface ClimateChartsProps {
  monthly: MonthlyClimate[];
  annual: AnnualClimate[];
  trends: ClimateTrends;
}

/** Monthly rain vs crop water need (plus plant cover), and the year-by-year change chart. */
export function ClimateCharts({ monthly, annual, trends }: ClimateChartsProps) {
  const [trendKey, setTrendKey] = useState<TrendKey>('heat_days');
  const view = TREND_VIEWS.find((v) => v.key === trendKey) ?? TREND_VIEWS[0];
  const hasNdvi = monthly.some((m) => m.ndvi !== null);
  const monthlyData = useMemo(
    () =>
      monthly.map((m) => ({
        name: MONTHS_SHORT[m.month - 1],
        rain: m.precip_mm,
        demand: m.et0_mm,
        plantCoverPct: m.ndvi === null ? null : Math.round(m.ndvi * 100),
      })),
    [monthly],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="font-bold text-stone-900 text-lg">Rain vs crop water need, by month</h3>
          <p className="text-xs text-stone-600 mt-0.5">
            Blue bars: average rain (mm). Orange line: water a crop would use (mm).
            {hasNdvi ? ' Green line: plant cover (%).' : ' Plant cover is added once satellite greenness is fetched.'}
          </p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: COLOR.rainAxis }} unit="mm" />
              {hasNdvi && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: COLOR.plant }} domain={[0, 100]} unit="%" />}
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar yAxisId="left" dataKey="rain" name="Rain (mm)" fill={COLOR.rain} radius={[4, 4, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="demand" name="Crop water need (mm)" stroke={COLOR.demand} strokeWidth={2.5} dot={false} />
              {hasNdvi && <Line yAxisId="right" type="monotone" dataKey="plantCoverPct" name="Plant cover (%)" stroke={COLOR.plant} strokeWidth={3} dot={{ r: 3 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">
              How the weather changed, <span className="whitespace-nowrap">{trends.period?.replace('-', '–') ?? '2001–2024'}</span>
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">{trendWords(trends[view.key])}.</p>
          </div>
          <div className="self-start flex flex-wrap gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
            {TREND_VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setTrendKey(v.key)}
                aria-pressed={view.key === v.key}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${view.key === v.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={annual}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
              <XAxis dataKey="year" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey={view.key} name={view.name} stroke={view.stroke} fill={view.fill} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
