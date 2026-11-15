import type { TrendStat } from '../../types';

/** Plain-language strength of a trend, from its Mann-Kendall p-value. */
export function trendWords(s: TrendStat) {
  if (s.p === null || s.per_decade === null) return 'Not enough data for a trend';
  if (s.p >= 0.15) return 'No clear change since 2001';
  const dir = s.per_decade > 0 ? 'Rising' : 'Falling';
  return s.p < 0.05 ? `${dir}: a clear change since 2001` : `${dir}: a possible change since 2001`;
}
