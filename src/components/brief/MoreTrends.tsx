import { useMemo } from 'react';
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CloudRain, Droplets, Flame, Sun, Thermometer, Waves, type LucideIcon } from 'lucide-react';
import type { AnnualClimate, MonthlyClimate, ProjectedSeries, RegionOutlook } from '../../types';
import { MONTHS_SHORT, cn } from '../../lib/format';
import { Card } from '../ui/Card';
import { ProjectionBadge } from './OutlookPanel';

const GRID = '#e7e5e4';
const TICK = { fontSize: 12, fill: '#44403c' };
const TIP = { borderRadius: '12px', border: '1px solid #d6d3d1', fontSize: '12px' };
const PROJ = '#6d28d9';

const GLANCE: { key: keyof RegionOutlook['series']; Icon: LucideIcon; color: string; goodUp: boolean }[] = [
  { key: 'precip_mm', Icon: CloudRain, color: '#2563eb', goodUp: true },
  { key: 'tmean_c', Icon: Thermometer, color: '#b91c1c', goodUp: false },
  { key: 'heat_days', Icon: Flame, color: '#ea580c', goodUp: false },
  { key: 'heavy_rain_days', Icon: Waves, color: '#0B3D91', goodUp: false },
  { key: 'max_dry_spell_days', Icon: Sun, color: '#a7654b', goodUp: false },
  { key: 'water_balance_mm', Icon: Droplets, color: '#0f766e', goodUp: true },
];

const SIG = { likely: 'Clear trend', possible: 'Possible trend', none: 'No clear trend' } as const;

function Spark({ s, color }: { s: ProjectedSeries; color: string }) {
  const data = useMemo(() => {
    const rows = s.history.map((h) => ({ year: h.year, v: h.value as number | undefined, p: undefined as number | undefined }));
    const last = rows.at(-1);
    for (const p of s.projection) {
      if (last && p.year === last.year) last.p = p.mid;
      else rows.push({ year: p.year, v: undefined, p: p.mid });
    }
    return rows;
  }, [s]);
  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <YAxis hide domain={['auto', 'auto']} />
          <XAxis dataKey="year" hide type="number" domain={['dataMin', 'dataMax']} />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="p" stroke={PROJ} strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Every measured series in small multiples: 2001–2024 line, dashed projection, average now vs 2035. */
function TrendsAtAGlance({ outlook }: { outlook: RegionOutlook }) {
  const items = GLANCE.filter((g) => outlook.series[g.key]);
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-stone-900">All trends at a glance</h3>
          <p className="mt-1 text-sm text-stone-600">Measured {outlook.base_period.replace('-', '–')}, then projected to {outlook.horizon} (dashed).</p>
        </div>
        <ProjectionBadge />
      </div>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ key, Icon, color, goodUp }) => {
          const s = outlook.series[key]!;
          const delta = s.at_horizon.mid - s.baseline;
          const up = delta > 0;
          const bad = s.significance !== 'none' && delta !== 0 && up !== goodUp;
          const fmt = (v: number) => `${v.toLocaleString()}${s.unit === '°C' ? ' °C' : ''}`;
          return (
            <div key={key} className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                <Icon className="h-4 w-4" style={{ color }} aria-hidden="true" />
                <span className="truncate">{s.label}</span>
              </div>
              <Spark s={s} color={color} />
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm tabular-nums">
                <span>
                  <span className="text-stone-500">{fmt(s.baseline)}</span>
                  <span className="mx-1 text-stone-400">to</span>
                  <span className={cn('font-bold', bad ? 'text-red-700' : 'text-stone-900')}>{fmt(s.at_horizon.mid)}</span>
                  {s.unit !== '°C' && <span className="ml-1 text-xs text-stone-500">{s.unit}</span>}
                </span>
                <span className={cn('text-xs font-semibold', s.significance === 'none' ? 'text-stone-500' : 'text-violet-800')}>{SIG[s.significance]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Each year's rain against the 2001–2024 average: wet years up (blue), dry years down (brown). */
function WetDryYears({ annual }: { annual: AnnualClimate[] }) {
  const avg = annual.reduce((a, b) => a + b.precip_mm, 0) / Math.max(1, annual.length);
  const data = annual.map((a) => ({ year: a.year, pct: Math.round(((a.precip_mm - avg) / avg) * 100), mm: a.precip_mm }));
  const driest = data.reduce((a, b) => (b.pct < a.pct ? b : a), data[0]);
  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold text-stone-900">Wet and dry years</h3>
      <p className="mt-1 text-sm text-stone-600">
        Rain each year compared with the average of {Math.round(avg).toLocaleString()} mm.{driest ? ` The driest was ${driest.year} (${driest.pct}%).` : ''}
      </p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="year" tick={TICK} tickCount={6} interval="preserveStartEnd" />
            <YAxis tick={TICK} unit="%" />
            <Tooltip contentStyle={TIP} formatter={(v: number, _n, p) => [`${v > 0 ? '+' : ''}${v}% (${Math.round(p.payload.mm).toLocaleString()} mm)`, 'Rain vs average']} />
            <ReferenceLine y={0} stroke="#57534e" />
            <Bar dataKey="pct" radius={[3, 3, 3, 3]}>
              {data.map((d) => (
                <Cell key={d.year} fill={d.pct >= 0 ? '#3b82f6' : '#a7654b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** Which months the risky days fall in: heat days and downpour days per month (2001–2024 average). */
function RiskyMonths({ monthly }: { monthly: MonthlyClimate[] }) {
  const data = monthly.map((m) => ({ name: MONTHS_SHORT[m.month - 1], heat: m.heat_days, rain: m.heavy_rain_days }));
  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold text-stone-900">When the risky days fall</h3>
      <p className="mt-1 text-sm text-stone-600">Average days per month. Keep flowering away from heat and seedlings away from downpours.</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="name" tick={TICK} />
            <YAxis tick={TICK} allowDecimals={false} />
            <Tooltip contentStyle={TIP} />
            <Bar dataKey="heat" name="Days at 35 °C+" fill="#ea580c" radius={[3, 3, 0, 0]} />
            <Bar dataKey="rain" name="Days with 20 mm+ rain" fill="#0B3D91" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#ea580c]" />Heat days (35 °C+)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#0B3D91]" />Downpour days (20 mm+)</span>
      </div>
    </Card>
  );
}

/** Daytime highs and night-time lows through the year. */
function TemperatureYear({ monthly }: { monthly: MonthlyClimate[] }) {
  const data = monthly.map((m) => ({ name: MONTHS_SHORT[m.month - 1], range: [m.tmin_c, m.tmax_c] as [number, number], tmax: m.tmax_c, tmin: m.tmin_c }));
  const hottest = monthly.reduce((a, b) => (b.tmax_c > a.tmax_c ? b : a), monthly[0]);
  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold text-stone-900">Temperature through the year</h3>
      <p className="mt-1 text-sm text-stone-600">
        Average daytime high and night-time low. Hottest: {MONTHS_SHORT[hottest.month - 1]}, {Math.round(hottest.tmax_c)} °C.
      </p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="name" tick={TICK} />
            <YAxis tick={TICK} unit="°" domain={[(min: number) => Math.floor(min / 5) * 5, (max: number) => Math.ceil(max / 5) * 5]} allowDecimals={false} />
            <Tooltip contentStyle={TIP} formatter={(v: number | [number, number], n: string) => (Array.isArray(v) ? [`${v[0]}–${v[1]} °C`, n] : [`${v} °C`, n])} />
            <ReferenceLine y={35} stroke="#ea580c" strokeDasharray="4 3" label={{ value: '35 °C', position: 'insideTopLeft', fill: '#c2410c', fontSize: 11 }} />
            <Area type="monotone" dataKey="range" name="Low to high" stroke="none" fill="#fecaca" fillOpacity={0.8} />
            <Line type="monotone" dataKey="tmax" name="Daytime high" stroke="#b91c1c" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="tmin" name="Night-time low" stroke="#1d4ed8" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** Rain minus crop water demand per year: below zero the crops needed more water than fell. */
function WaterBudgetYears({ annual }: { annual: AnnualClimate[] }) {
  const short = annual.filter((a) => a.water_balance_mm < 0).length;
  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold text-stone-900">Water budget each year</h3>
      <p className="mt-1 text-sm text-stone-600">
        Rain minus what crops would use, in mm. Short of water in {short} of {annual.length} years.
      </p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={annual}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="year" tick={TICK} tickCount={6} interval="preserveStartEnd" />
            <YAxis tick={TICK} width={56} domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]} tickFormatter={(v: number) => v.toLocaleString()} />
            <Tooltip contentStyle={TIP} formatter={(v: number) => [`${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()} mm`, 'Rain minus crop need']} />
            <ReferenceLine y={0} stroke="#57534e" />
            <Bar dataKey="water_balance_mm" radius={[3, 3, 3, 3]}>
              {annual.map((a) => (
                <Cell key={a.year} fill={a.water_balance_mm >= 0 ? '#0f766e' : '#d97706'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** Extra measured charts for the satellite brief. */
export function MoreTrends({ annual, monthly, outlook }: { annual: AnnualClimate[]; monthly: MonthlyClimate[]; outlook: RegionOutlook | null }) {
  return (
    <section aria-labelledby="more-trends" className="space-y-5">
      <h3 id="more-trends" className="text-xl font-bold text-stone-900">More from the data</h3>
      {outlook && <TrendsAtAGlance outlook={outlook} />}
      <div className="grid gap-5 lg:grid-cols-2">
        {annual.length > 0 && <WetDryYears annual={annual} />}
        {monthly.length === 12 && <RiskyMonths monthly={monthly} />}
        {monthly.length === 12 && <TemperatureYear monthly={monthly} />}
        {annual.length > 0 && <WaterBudgetYears annual={annual} />}
      </div>
    </section>
  );
}
