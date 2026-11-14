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
import {
  ThermometerSun,
  CloudRain,
  Droplets,
  Layers,
  AlertTriangle,
  Sparkles,
  Info,
  ArrowRight,
  Satellite,
} from 'lucide-react';
import type { RegionDetail } from '../types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface FieldBriefProps {
  data: RegionDetail;
  onContinue: () => void;
}

export const FieldBrief: React.FC<FieldBriefProps> = ({ data, onContinue }) => {
  const [trendMetric, setTrendMetric] = useState<'heat_days' | 'precip_mm' | 'groundwater_anomaly_cm'>('heat_days');

  const bareMonthsCount = data.monthly.filter((m) => m.typically_bare).length;

  const monthlyChartData = data.monthly.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    rain: m.precip_mm,
    plantCoverPct: Math.round(m.ndvi * 100),
    soilWetPct: Math.round(m.soil_moisture * 100),
    tmax: m.tmax_c,
    bare: m.typically_bare,
  }));

  const gwColor =
    data.trends.groundwater === 'rapidly declining'
      ? 'text-red-700 bg-red-50 border-red-200'
      : data.trends.groundwater === 'declining'
      ? 'text-amber-800 bg-amber-50 border-amber-200'
      : 'text-brand-800 bg-brand-50 border-brand-200';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-surface bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-nasa-blue bg-blue-50 px-2.5 py-1 rounded-full mb-2">
            <Satellite className="w-3.5 h-3.5" />
            <span>20+ Year Satellite & Soil Check · {data.region.name}, {data.region.place}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            What the sky & soil say about your land
          </h2>
          <p className="text-stone-600 text-sm sm:text-base mt-1">
            Plain-language summary from {data.sources.slice(0, 4).join(', ')} and local soil surveys.
          </p>
        </div>
        <button
          onClick={onContinue}
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition shrink-0 text-base"
        >
          <span>Compare Rotations</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Key Numbers in Plain Words */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="card-surface bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <ThermometerSun className="w-5 h-5" />
            <span>Hot Days Trend</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-stone-900">
            +{data.trends.heat_days_per_decade} days
            <span className="text-sm font-medium text-stone-500"> / decade</span>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            More extreme heat days during summer grain-fill than 20 years ago.
          </p>
        </div>

        <div className="card-surface bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
            <CloudRain className="w-5 h-5" />
            <span>Heavy Storms</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-stone-900">
            {data.trends.heavy_rain_change_pct > 0 ? '+' : ''}
            {data.trends.heavy_rain_change_pct}%
            <span className="text-sm font-medium text-stone-500"> intense rain</span>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Total rain changed {data.trends.precip_change_pct > 0 ? '+' : ''}{data.trends.precip_change_pct}%, but hard downpours are sharper.
          </p>
        </div>

        <div className={`card-surface rounded-2xl border p-4 shadow-sm ${gwColor}`}>
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Droplets className="w-5 h-5" />
            <span>Underground Water</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold capitalize">
            {data.trends.groundwater}
          </div>
          <p className="text-xs mt-1 opacity-90">
            Measured by NASA GRACE gravity satellites tracking deep aquifer levels.
          </p>
        </div>

        <div className="card-surface bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-soil-700 font-semibold text-sm">
            <Layers className="w-5 h-5" />
            <span>Bare Ground</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-stone-900">
            {bareMonthsCount} months
            <span className="text-sm font-medium text-stone-500"> / year</span>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Months where satellites typically see exposed dirt instead of living roots.
          </p>
        </div>
      </div>

      {/* Plain-English Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.insights.map((insight, idx) => {
          const isWarn = insight.badgeType === 'warning';
          const isOpp = insight.badgeType === 'opportunity';
          return (
            <div
              key={idx}
              className={`card-surface rounded-2xl border p-4 shadow-sm flex flex-col justify-between ${
                isWarn
                  ? 'bg-amber-50/60 border-amber-200'
                  : isOpp
                  ? 'bg-brand-50/60 border-brand-200'
                  : 'bg-white border-stone-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      isWarn
                        ? 'bg-amber-200/80 text-amber-900'
                        : isOpp
                        ? 'bg-brand-200/80 text-brand-900'
                        : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {isWarn ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : isOpp ? (
                      <Sparkles className="w-3.5 h-3.5" />
                    ) : (
                      <Info className="w-3.5 h-3.5" />
                    )}
                    {isWarn ? 'Watch Out' : isOpp ? 'Opportunity' : 'Pattern'}
                  </span>
                  <span className="text-[11px] font-medium text-stone-500">
                    Confidence: {insight.confidence}
                  </span>
                </div>
                <h3 className="font-bold text-stone-900 text-base leading-snug">
                  {insight.title}
                </h3>
                <p className="text-sm text-stone-700 mt-2 leading-relaxed">{insight.body}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-stone-200/70 text-[11px] font-semibold text-stone-500">
                Source: {insight.source}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Rain vs Living Plant Cover */}
        <div className="card-surface bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-stone-900 text-lg">
              When rain falls vs. when plants cover the soil
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Blue bars = monthly rainfall (mm). Green line = how thick living plants cover the ground (0–100%).
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#44403c' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#1d4ed8' }} unit="mm" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#15803d' }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #d6d3d1', fontSize: '12px' }}
                />
                <Bar yAxisId="left" dataKey="rain" name="Rainfall (mm)" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="plantCoverPct"
                  name="Plant Cover (%)"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 24-Year Annual Trend */}
        <div className="card-surface bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-lg">24-Year Weather Shift (2001–2024)</h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Pick a measurement to see how your region has changed over time.
              </p>
            </div>
            <div className="flex gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setTrendMetric('heat_days')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  trendMetric === 'heat_days' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                Hot Days
              </button>
              <button
                onClick={() => setTrendMetric('precip_mm')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  trendMetric === 'precip_mm' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                Yearly Rain
              </button>
              <button
                onClick={() => setTrendMetric('groundwater_anomaly_cm')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  trendMetric === 'groundwater_anomaly_cm' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                Groundwater
              </button>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.annual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#44403c' }} />
                <YAxis tick={{ fontSize: 12, fill: '#44403c' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #d6d3d1', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey={trendMetric}
                  name={
                    trendMetric === 'heat_days'
                      ? 'Extreme Heat Days'
                      : trendMetric === 'precip_mm'
                      ? 'Annual Rain (mm)'
                      : 'Groundwater Change (cm)'
                  }
                  stroke={
                    trendMetric === 'heat_days'
                      ? '#ea580c'
                      : trendMetric === 'precip_mm'
                      ? '#2563eb'
                      : '#0B3D91'
                  }
                  fill={
                    trendMetric === 'heat_days'
                      ? '#fed7aa'
                      : trendMetric === 'precip_mm'
                      ? '#bfdbfe'
                      : '#dbeafe'
                  }
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Soil Card */}
      <div className="card-surface bg-soil-50/70 rounded-2xl border border-soil-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-bold text-stone-900 text-lg">Your Soil Profile ({data.soil.source})</h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-soil-200 text-soil-900">
            Slope: {data.soil.slope_pct}% · Erosion risk: {data.soil.erosion_risk}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-white rounded-xl p-3 border border-soil-200/70">
            <div className="text-xs text-stone-500 font-medium">Soil Type</div>
            <div className="font-bold text-stone-900 mt-0.5">{data.soil.texture}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-soil-200/70">
            <div className="text-xs text-stone-500 font-medium">Organic Matter</div>
            <div className="font-bold text-stone-900 capitalize mt-0.5">{data.soil.organic_matter}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-soil-200/70">
            <div className="text-xs text-stone-500 font-medium">Drainage</div>
            <div className="font-bold text-stone-900 capitalize mt-0.5">{data.soil.drainage}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-soil-200/70">
            <div className="text-xs text-stone-500 font-medium">Water Holding</div>
            <div className="font-bold text-stone-900 capitalize mt-0.5">{data.soil.water_holding}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
