import type { ReactNode } from 'react';
import { CloudRain, Droplets, Sun, ThermometerSun } from 'lucide-react';
import type { ClimateTrends, RegionOutlook } from '../../types';
import { formatInt } from '../../lib/format';
import { Card } from '../ui/Card';
import { trendWords } from './trendWords';
import { ProjectionBadge } from './OutlookPanel';

interface Stat {
  icon: ReactNode;
  tone: string;
  label: string;
  value: string;
  unit: string;
  note: string;
  bg?: string;
  /** Projected value at the horizon year, when there is a clear or possible trend. */
  future?: string | null;
}

/** The four headline numbers (last 10 years), each with its trend in plain words. */
export function StatCards({ trends, outlook }: { trends: ClimateTrends; outlook: RegionOutlook | null }) {
  const future = (key: 'heat_days' | 'heavy_rain_days' | 'max_dry_spell_days' | 'water_balance_mm', unit: string) => {
    const s = outlook?.series[key];
    if (!s || s.significance === 'none') return null;
    const v = s.at_horizon.mid;
    return `${key === 'water_balance_mm' && v > 0 ? '+' : ''}${v.toLocaleString()}${unit} by ${s.at_horizon.year}`;
  };
  const wb = trends.mean_water_balance_mm;
  const shortOfWater = wb !== null && wb < -300;
  const stats: Stat[] = [
    {
      icon: <ThermometerSun className="w-5 h-5" />, tone: 'text-amber-700', label: 'Very hot days',
      value: formatInt(trends.heat_days.last_10y_mean), unit: 'a year at 35 °C+',
      note: `${trendWords(trends.heat_days)}. Was ${formatInt(trends.heat_days.first_10y_mean)} in the first 10 years.`,
      future: future('heat_days', ' days'),
    },
    {
      icon: <CloudRain className="w-5 h-5" />, tone: 'text-blue-700', label: 'Downpours',
      value: formatInt(trends.heavy_rain_days.last_10y_mean), unit: 'days a year with 20 mm+',
      note: `${trendWords(trends.heavy_rain_days)}. Was ${formatInt(trends.heavy_rain_days.first_10y_mean)} in the first 10 years.`,
      future: future('heavy_rain_days', ' days'),
    },
    {
      icon: <Droplets className="w-5 h-5" />, tone: shortOfWater ? 'text-amber-800' : 'text-brand-800', label: 'Water budget',
      value: wb === null ? '–' : `${wb > 0 ? '+' : '−'}${formatInt(Math.abs(wb))}`, unit: 'mm a year',
      note: wb === null ? 'Not measured yet.' : wb < 0 ? 'Rain falls short of what crops need. The gap needs irrigation or tougher crops.' : 'Rain exceeds what crops can use.',
      bg: shortOfWater ? 'bg-amber-50/60' : 'bg-brand-50/60',
      future: future('water_balance_mm', ' mm'),
    },
    {
      icon: <Sun className="w-5 h-5" />, tone: 'text-soil-700', label: 'Longest dry spell',
      value: formatInt(trends.max_dry_spell_days.last_10y_mean), unit: 'days without rain',
      note: `${trendWords(trends.max_dry_spell_days)}. Was ${formatInt(trends.max_dry_spell_days.first_10y_mean)} days in the first 10 years.`,
      future: future('max_dry_spell_days', ' days'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {stats.map((s) => (
        <Card key={s.label} className={`p-4 ${s.bg ?? ''}`}>
          <div className={`flex items-center gap-2 font-semibold text-sm ${s.tone}`}>
            {s.icon}
            <span>{s.label}</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-stone-900">
            {s.value}
            <span className="text-sm font-medium text-stone-500"> {s.unit}</span>
          </div>
          <p className="text-xs text-stone-600 mt-1">{s.note}</p>
          {s.future && (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-violet-900 tabular-nums">
              <ProjectionBadge />
              {s.future}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
