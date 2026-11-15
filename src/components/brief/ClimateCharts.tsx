import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnnualClimate, ClimateTrends, MonthlyClimate, RegionOutlook } from '../../types';
import { ProjectionBadge } from './OutlookPanel';
import { MONTHS_SHORT } from '../../lib/format';
import { Card } from '../ui/Card';
import { trendWords } from './trendWords';
import { FADE, SPRING } from '../../lib/motion';

// Recharts takes colours as SVG props, so they are hex values here rather than Tailwind classes.
// They match the Tailwind palette: stone-200/700, blue-400/700, orange-600, green-600.
const COLOR = { grid: '#e7e5e4', tick: '#44403c', rain: '#60a5fa', rainAxis: '#1d4ed8', demand: '#ea580c', plant: '#16a34a' };
const TOOLTIP_STYLE = { borderRadius: '12px', border: '1px solid #d6d3d1', fontSize: '12px' };
const AXIS_TICK = { fontSize: 12, fill: COLOR.tick };

type TrendKey = 'heat_days' | 'precip_mm' | 'heavy_rain_days' | 'max_dry_spell_days' | 'tmean_c';
const TREND_VIEWS: { key: TrendKey; label: string; name: string; stroke: string; fill: string }[] = [
  { key: 'heat_days', label: 'Hot days', name: 'Days at 35 °C or hotter', stroke: '#ea580c', fill: '#fed7aa' },
  { key: 'precip_mm', label: 'Yearly rain', name: 'Rain (mm)', stroke: '#2563eb', fill: '#bfdbfe' },
  { key: 'heavy_rain_days', label: 'Downpours', name: 'Days with 20 mm+ rain', stroke: '#0B3D91', fill: '#dbeafe' },
  { key: 'max_dry_spell_days', label: 'Dry spells', name: 'Longest dry spell (days)', stroke: '#a7654b', fill: '#eed9ce' },
  { key: 'tmean_c', label: 'Temperature', name: 'Average temperature (°C)', stroke: '#b91c1c', fill: '#fecaca' },
];
// Projections always use this one colour plus a dashed line, so they are never mistaken for measurements.
const PROJ = { line: '#6d28d9', band: '#ede9fe', zone: '#faf5ff' };

interface ClimateChartsProps {
  monthly: MonthlyClimate[];
  annual: AnnualClimate[];
  trends: ClimateTrends;
  outlook: RegionOutlook | null;
}

/** Monthly rain vs crop water need (plus plant cover), and the year-by-year change chart. */
export function ClimateCharts({ monthly, annual, trends, outlook }: ClimateChartsProps) {
  const [trendKey, setTrendKey] = useState<TrendKey>('heat_days');
  const views = TREND_VIEWS.filter((v) => v.key !== 'tmean_c' || outlook?.series.tmean_c);
  const view = views.find((v) => v.key === trendKey) ?? views[0];
  const series = outlook?.series[view.key];
  // Measured history and the projection (dashed, with its 80% range) on one time axis
  const yearData = useMemo(() => {
    const rows = new Map<number, { year: number; value?: number; mid?: number; range?: [number, number] }>();
    if (series) for (const h of series.history) rows.set(h.year, { year: h.year, value: h.value });
    else for (const a of annual) rows.set(a.year, { year: a.year, value: (a as unknown as Record<string, number>)[view.key] });
    for (const p of series?.projection ?? []) rows.set(p.year, { ...(rows.get(p.year) ?? { year: p.year }), mid: p.mid, range: [p.lo, p.hi] });
    return [...rows.values()].sort((a, b) => a.year - b.year);
  }, [annual, series, view.key]);
  const lastYear = series?.history.at(-1)?.year ?? annual.at(-1)?.year;
  const h = series?.at_horizon;
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
    // The page's one scroll-triggered moment: the charts fade up once as they come into view.
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-2 gap-5"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...FADE, duration: 0.35 }}
    >
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="font-bold text-stone-900 text-lg">Rain vs crop water need, by month</h3>
          <p className="text-sm text-stone-600 mt-1 max-w-[65ch] text-pretty">
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
            <h3 className="font-bold text-stone-900 text-lg">How the weather changed, and where it is heading</h3>
            <p className="text-sm text-stone-600 mt-1">
              {view.key === 'tmean_c' ? 'Average temperature.' : `${trendWords(trends[view.key])}.`}
              {h && series && (
                <>
                  {' '}
                  By {h.year}: about <strong className="font-semibold text-stone-900 tabular-nums">{h.mid.toLocaleString()} {series.unit}</strong>{' '}
                  <span className="tabular-nums">(a single year could be {h.lo.toLocaleString()}–{h.hi.toLocaleString()})</span>.
                </>
              )}
            </p>
          </div>
          <div className="self-start flex flex-wrap gap-1 bg-stone-100 p-1 rounded-xl text-sm font-semibold" role="radiogroup" aria-label="Measurement">
            {views.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setTrendKey(v.key)}
                role="radio"
                aria-checked={view.key === v.key}
                className={`relative isolate min-h-10 px-3 rounded-lg whitespace-nowrap transition-colors ${view.key === v.key ? 'text-stone-900' : 'text-stone-600 hover:text-stone-900'}`}
              >
                {view.key === v.key && <motion.span layoutId="trend-pill" transition={SPRING} className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm" />}
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={yearData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
              {series && lastYear && h && <ReferenceArea x1={lastYear} x2={h.year} fill={PROJ.zone} fillOpacity={1} />}
              <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} tick={AXIS_TICK} tickCount={8} allowDecimals={false} />
              <YAxis tick={AXIS_TICK} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number | [number, number], name: string) => (Array.isArray(v) ? [`${v[0]}–${v[1]}`, name] : [v, name])}
              />
              {series && <Area type="linear" dataKey="range" name="Projection range (80%)" stroke="none" fill={PROJ.band} fillOpacity={1} isAnimationActive={false} />}
              <Area type="monotone" dataKey="value" name={`${view.name}, measured`} stroke={view.stroke} fill={view.fill} fillOpacity={0.5} strokeWidth={2.5} />
              {series && <Line type="linear" dataKey="mid" name={`${view.name}, projection`} stroke={PROJ.line} strokeWidth={2.5} strokeDasharray="6 4" dot={false} />}
              {series && lastYear && (
                <ReferenceLine x={lastYear} stroke={PROJ.line} strokeDasharray="2 3" label={{ value: 'Projection →', position: 'insideTopRight', fill: PROJ.line, fontSize: 12, fontWeight: 700 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {series && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600">
            <ProjectionBadge />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5" style={{ background: view.stroke }} />
              Measured {series.history[0]?.year}–{lastYear}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: PROJ.line }} />
              {series.model === 'theil_sen' ? 'Trend extended' : 'No clear trend, so the average is extended'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-sm" style={{ background: PROJ.band }} />
              Range for a single year
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
