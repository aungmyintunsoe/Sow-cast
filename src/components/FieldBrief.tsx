import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
import { ThermometerSun, CloudRain, Droplets, Sun, AlertTriangle, Sparkles, Info, ArrowRight } from 'lucide-react';
import type { AnnualClimate, Crop, RegionDetail, TrendStat } from '../types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const C = { grid: '#e7e5e4', tick: '#44403c', rain: '#60a5fa', rainAxis: '#1d4ed8', demand: '#ea580c', plant: '#16a34a' };
const tooltipStyle = { borderRadius: '12px', border: '1px solid #d6d3d1', fontSize: '12px' };
const LEVEL = ['None', 'Low', 'Medium', 'High'];
const SOIL_NAMES: Record<string, string> = { sandy: 'Sandy', sandy_loam: 'Sandy loam', loam: 'Loam', clay_loam: 'Clay loam', silty_clay_loam: 'Silty clay loam', clay: 'Clay' };
const asNum = (v: string | number | null) => (v === null || v === '' ? null : Number(v));
/** Region inputs the crop scores depend on, in display order (see data/scripts/05b_score_measured.py). */
const INPUT_LABELS: Record<string, { label: string; fmt: (v: string | number | null) => string }> = {
  rain_mm_approx: { label: 'Yearly rain', fmt: (v) => `${Math.round(asNum(v) ?? 0).toLocaleString()} mm` },
  mean_temp_c_approx: { label: 'Mean temperature', fmt: (v) => `${asNum(v)?.toFixed(1)} °C` },
  dry_months_approx: { label: 'Dry months', fmt: (v) => `${asNum(v)} a year` },
  soil_texture: { label: 'Topsoil', fmt: (v) => SOIL_NAMES[String(v)] ?? String(v) },
  slope_pct_approx: { label: 'Slope', fmt: (v) => `${asNum(v)}%` },
};

type TrendKey = 'heat_days' | 'precip_mm' | 'heavy_rain_days' | 'max_dry_spell_days';
const TREND_VIEWS: { key: TrendKey; label: string; name: string; stroke: string; fill: string }[] = [
  { key: 'heat_days', label: 'Hot days', name: 'Days at 35 °C or hotter', stroke: '#ea580c', fill: '#fed7aa' },
  { key: 'precip_mm', label: 'Yearly rain', name: 'Rain (mm)', stroke: '#2563eb', fill: '#bfdbfe' },
  { key: 'heavy_rain_days', label: 'Downpours', name: 'Days with 20 mm+ rain', stroke: '#0B3D91', fill: '#dbeafe' },
  { key: 'max_dry_spell_days', label: 'Dry spells', name: 'Longest dry spell (days)', stroke: '#a7654b', fill: '#eed9ce' },
];

/** Plain-language strength of a trend from its Mann-Kendall p-value. */
function trendWords(s: TrendStat) {
  if (s.p === null || s.per_decade === null) return 'Not enough data for a trend';
  if (s.p >= 0.15) return 'No clear change since 2001';
  const dir = s.per_decade > 0 ? 'Rising' : 'Falling';
  return s.p < 0.05 ? `${dir}: a clear change since 2001` : `${dir}: a possible change since 2001`;
}
const n0 = (v: number | null | undefined) => (v === null || v === undefined ? '–' : Math.round(v).toLocaleString());

interface FieldBriefProps {
  data: RegionDetail;
  cropsMap: Record<string, Crop>;
  onContinue: () => void;
}

export const FieldBrief: React.FC<FieldBriefProps> = ({ data, cropsMap, onContinue }) => {
  const weatherOk = data.data_quality.weather === 'ok' && data.monthly.length > 0;
  const [trendKey, setTrendKey] = useState<TrendKey>('heat_days');
  const view = TREND_VIEWS.find((v) => v.key === trendKey)!;
  const hasNdvi = data.monthly.some((m) => m.ndvi !== null);
  const wb = data.trends.mean_water_balance_mm;
  const inputRows = (data.scoring_inputs ?? []).filter((u) => u.input in INPUT_LABELS);

  const monthlyChartData = data.monthly.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    rain: m.precip_mm,
    demand: m.et0_mm,
    plantCoverPct: m.ndvi === null ? null : Math.round(m.ndvi * 100),
  }));

  const stats: { icon: React.ReactNode; tone: string; label: string; value: string; unit: string; note: string; bg?: string }[] = [
    {
      icon: <ThermometerSun className="w-5 h-5" />, tone: 'text-amber-700', label: 'Very hot days',
      value: n0(data.trends.heat_days.last_10y_mean), unit: 'a year at 35 °C+',
      note: `${trendWords(data.trends.heat_days)}. Was ${n0(data.trends.heat_days.first_10y_mean)} in the first 10 years.`,
    },
    {
      icon: <CloudRain className="w-5 h-5" />, tone: 'text-blue-700', label: 'Downpours',
      value: n0(data.trends.heavy_rain_days.last_10y_mean), unit: 'days a year with 20 mm+',
      note: `${trendWords(data.trends.heavy_rain_days)}. Was ${n0(data.trends.heavy_rain_days.first_10y_mean)} in the first 10 years.`,
    },
    {
      icon: <Droplets className="w-5 h-5" />, tone: wb !== null && wb < -300 ? 'text-amber-800' : 'text-brand-800', label: 'Water budget',
      value: wb === null ? '–' : `${wb > 0 ? '+' : '−'}${n0(Math.abs(wb))}`, unit: 'mm a year',
      note: wb === null ? 'Not measured yet.' : wb < 0 ? 'Rain falls short of what crops need. The gap needs irrigation or tougher crops.' : 'Rain exceeds what crops can use.',
      bg: wb !== null && wb < -300 ? 'bg-amber-50/60' : 'bg-brand-50/60',
    },
    {
      icon: <Sun className="w-5 h-5" />, tone: 'text-soil-700', label: 'Longest dry spell',
      value: n0(data.trends.max_dry_spell_days.last_10y_mean), unit: 'days without rain',
      note: `${trendWords(data.trends.max_dry_spell_days)}. Was ${n0(data.trends.max_dry_spell_days.first_10y_mean)} days in the first 10 years.`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card-surface bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">What the weather and soil say about {data.region.name}</h2>
          <p className="text-stone-600 text-sm sm:text-base mt-1">
            Sources: {data.sources.join(", ")}. Weather is for the area around {data.region.place}.
          </p>
        </div>
        <button
          onClick={onContinue}
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition shrink-0 text-base"
        >
          <span>Compare rotations</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {data.monthly.length === 0 && (
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

      {/* Key numbers (last 10 years) */}
      {weatherOk && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {stats.map((s) => (
          <div key={s.label} className={`card-surface ${s.bg ?? 'bg-white'} rounded-2xl border border-stone-200 p-4 shadow-sm`}>
            <div className={`flex items-center gap-2 font-semibold text-sm ${s.tone}`}>
              {s.icon}
              <span>{s.label}</span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-stone-900">
              {s.value}
              <span className="text-sm font-medium text-stone-500"> {s.unit}</span>
            </div>
            <p className="text-xs text-stone-600 mt-1">{s.note}</p>
          </div>
        ))}
      </div>
      )}

      {/* Plain-language insights */}
      {data.insights.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 ${data.insights.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {data.insights.map((insight, idx) => {
            const isWarn = insight.badgeType === 'warning';
            const isOpp = insight.badgeType === 'opportunity';
            return (
              <div
                key={idx}
                className={`card-surface rounded-2xl border p-4 shadow-sm flex flex-col justify-between ${
                  isWarn ? 'bg-amber-50/60 border-amber-200' : isOpp ? 'bg-brand-50/60 border-brand-200' : 'bg-white border-stone-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        isWarn ? 'bg-amber-200/80 text-amber-900' : isOpp ? 'bg-brand-200/80 text-brand-900' : 'bg-stone-200 text-stone-800'
                      }`}
                    >
                      {isWarn ? <AlertTriangle className="w-3.5 h-3.5" /> : isOpp ? <Sparkles className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                      {isWarn ? 'Watch out' : isOpp ? 'Opportunity' : 'Pattern'}
                    </span>
                    <span className="text-[11px] font-medium text-stone-500">Confidence: {insight.confidence}</span>
                  </div>
                  <h3 className="font-bold text-stone-900 text-base leading-snug">{insight.title}</h3>
                  <p className="text-sm text-stone-700 mt-2 leading-relaxed">{insight.body}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-200/70 text-[11px] font-semibold text-stone-500">Source: {insight.source}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts */}
      {weatherOk && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-surface bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-stone-900 text-lg">Rain vs crop water need, by month</h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Blue bars: average rain (mm). Orange line: water a crop would use (mm).
              {hasNdvi ? ' Green line: plant cover (%).' : ' Plant cover is added once satellite greenness is fetched.'}
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: C.tick }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: C.rainAxis }} unit="mm" />
                {hasNdvi && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: C.plant }} domain={[0, 100]} unit="%" />}
                <Tooltip contentStyle={tooltipStyle} />
                <Bar yAxisId="left" dataKey="rain" name="Rain (mm)" fill={C.rain} radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="demand" name="Crop water need (mm)" stroke={C.demand} strokeWidth={2.5} dot={false} />
                {hasNdvi && <Line yAxisId="right" type="monotone" dataKey="plantCoverPct" name="Plant cover (%)" stroke={C.plant} strokeWidth={3} dot={{ r: 3 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-lg">
                How the weather changed, <span className="whitespace-nowrap">{data.trends.period?.replace('-', '–') ?? '2001–2024'}</span>
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">{trendWords(data.trends[view.key])}.</p>
            </div>
            <div className="self-start flex flex-wrap gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
              {TREND_VIEWS.map((v) => (
                <button
                  key={v.key}
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
              <AreaChart data={data.annual as AnnualClimate[]}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: C.tick }} />
                <YAxis tick={{ fontSize: 12, fill: C.tick }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey={view.key} name={view.name} stroke={view.stroke} fill={view.fill} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}

      {/* Soil (measured) and local context (team draft) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-surface bg-soil-50/70 rounded-2xl border border-soil-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-bold text-stone-900 text-lg">Your soil</h3>
            {data.soil && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-soil-200 text-soil-900">
                Slope {data.soil.slope_pct ?? '–'}%, erosion risk {data.soil.erosion_risk ?? 'unknown'}
              </span>
            )}
          </div>
          {data.soil ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Soil type', data.soil.texture],
                  ['Organic matter', data.soil.organic_matter],
                  ['Drainage', data.soil.drainage],
                  ['Water holding', data.soil.water_holding],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white rounded-xl p-3 border border-soil-200/70">
                    <div className="text-xs text-stone-500 font-medium">{label}</div>
                    <div className="font-bold text-stone-900 capitalize mt-0.5">{value ?? 'Unknown'}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-stone-600 mt-3">
                Source: {data.soil.source}
                {data.soil.sampled_km_from_town ? `, sampled ${data.soil.sampled_km_from_town} km from ${data.region.place} (no soil data inside the town)` : ''}.
              </p>
            </>
          ) : (
            <p className="text-sm text-stone-700">Soil data for this region has not been fetched yet.</p>
          )}
        </div>

        <div className="card-surface bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="font-bold text-stone-900 text-lg">What farms here deal with</h3>
          <p className="text-xs text-stone-500 mt-0.5 mb-3">
            Team estimates; no satellite measurement yet (confidence: {data.priors.confidence}).
          </p>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            {[
              ['Flood risk', LEVEL[data.priors.flood_risk]],
              ['Salt-water risk', LEVEL[data.priors.salinity_risk]],
              ['Irrigation access', LEVEL[data.priors.irrigation_access]],
            ].map(([label, value]) => (
              <div key={label} className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                <dt className="text-xs text-stone-500 font-medium">{label}</dt>
                <dd className="font-bold text-stone-900 mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>

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
                  {inputRows.map((u) => (
                    <tr key={u.input} title={u.source}>
                      <th scope="row" className="text-left font-medium text-stone-700 py-1.5 pr-2">{INPUT_LABELS[u.input].label}</th>
                      <td className={`py-1.5 pr-2 ${u.used === 'draft' ? 'font-bold text-stone-900' : 'text-stone-500'}`}>{INPUT_LABELS[u.input].fmt(u.draft)}</td>
                      <td className={`py-1.5 ${u.used === 'measured' ? 'font-bold text-stone-900' : 'text-stone-500'}`}>
                        {u.measured === null || u.measured === '' ? 'Not measured yet' : INPUT_LABELS[u.input].fmt(u.measured)}
                        {u.measured !== null && u.measured !== '' && <span className="block text-[11px] font-normal text-stone-500">{u.source}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-sm text-stone-700 mt-3">
            {data.priors.common_crops.length
              ? `Commonly grown: ${data.priors.common_crops.map((id) => cropsMap[id]?.name ?? id).join(', ')}.`
              : data.priors.tree_crop_dominated
                ? 'Mostly tree crops such as rubber and oil palm.'
                : ''}
          </p>
        </div>
      </div>
    </div>
  );
};
