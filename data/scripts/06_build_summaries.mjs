// Step 6 — Turn raw time series into analysis-ready tables + an app-shaped JSON per site.
// Works with whatever has been fetched: POWER is required; MODIS / soil / terrain are used if present.
//
//   node data/scripts/06_build_summaries.mjs [siteId ...]
//
// Outputs (data/processed/<site>/):
//   monthly_climatology.csv   12 rows — typical year (2001-2024 average)
//   annual.csv                one row per year — the series to test for trends
//   monthly_series.csv        one row per year-month — for anomaly / seasonal-shift analysis
//   trends.json               OLS slope per decade + Mann-Kendall significance for every annual metric
//   region_climate.json       same shape as RegionDetail in src/types/index.ts (climate/soil parts only)
// And across sites: data/processed/all_sites_annual.csv, all_sites_monthly_climatology.csv
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, selectedSites, readCSV, writeCSV, writeJSON, PROCESSED_DIR, round, mean, sum, slope, mannKendall } from './lib.mjs';

const BARE_NDVI = 0.3; // NDVI below this ≈ bare / sparse cover
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const opt = (file) => (fs.existsSync(file) ? (file.endsWith('.json') ? JSON.parse(fs.readFileSync(file, 'utf8')) : readCSV(file)) : null);
const longestRun = (flags) => { let best = 0, cur = 0; for (const f of flags) { cur = f ? cur + 1 : 0; best = Math.max(best, cur); } return best; };
const groupBy = (rows, key) => rows.reduce((m, r) => ((m[key(r)] ??= []).push(r), m), {});

const cfg = loadConfig();
const allAnnual = [], allMonthly = [];

for (const site of selectedSites(cfg)) {
  const dir = path.join(PROCESSED_DIR, site.id);
  const power = opt(path.join(dir, 'power_daily.csv'));
  if (!power) { console.warn(`\n⚠ ${site.id}: no power_daily.csv — run 01_fetch_power.mjs first`); continue; }
  console.log(`\n▶ summaries ${site.id}`);
  const ndvi = opt(path.join(dir, 'modis_ndvi.csv'));
  const et = opt(path.join(dir, 'modis_et.csv'));
  const lst = opt(path.join(dir, 'modis_lst.csv'));
  const soil = opt(path.join(dir, 'soil_summary.json'));
  const terrain = opt(path.join(dir, 'terrain.json'));
  const available = { power: true, ndvi: !!ndvi, modis_et: !!et, modis_lst: !!lst, soil: !!soil, terrain: !!terrain };

  // 8-day ET composites → daily rate, attributed to the composite's start month
  const etRate = et?.map((r) => ({ ...r, et_day: r.et_mm_8day === null ? null : r.et_mm_8day / 8, pet_day: r.pet_mm_8day === null ? null : r.pet_mm_8day / 8 }));

  // ---------- monthly series (year × month) ----------
  const ym = groupBy(power, (r) => `${r.year}-${r.month}`);
  const monthlySeries = Object.values(ym).map((rows) => {
    const { year, month } = rows[0];
    const n = (arr, f) => arr?.filter((r) => r.year === year && r.month === month).map(f) ?? [];
    return {
      year, month,
      tmax_c: round(mean(rows.map((r) => r.tmax_c))), tmin_c: round(mean(rows.map((r) => r.tmin_c))),
      precip_mm: round(sum(rows.map((r) => r.precip_mm)), 1),
      et0_mm: round(sum(rows.map((r) => r.et0_hargreaves_mm)), 1),
      water_balance_mm: round(sum(rows.map((r) => r.water_balance_mm)), 1),
      soil_wet_top: round(mean(rows.map((r) => r.soil_wet_top)), 3),
      soil_wet_root: round(mean(rows.map((r) => r.soil_wet_root)), 3),
      frost_days: sum(rows.map((r) => r.frost_day)), heat_days: sum(rows.map((r) => r.heat_day)),
      heavy_rain_days: sum(rows.map((r) => r.heavy_rain_day)),
      gdd: round(sum(rows.map((r) => r.gdd_base10)), 0),
      ndvi: round(mean(n(ndvi, (r) => r.ndvi_clean)), 3),
      et_modis_mm: et ? round((mean(n(etRate, (r) => r.et_day)) ?? NaN) * DAYS[month - 1], 1) : null,
      pet_modis_mm: et ? round((mean(n(etRate, (r) => r.pet_day)) ?? NaN) * DAYS[month - 1], 1) : null,
      lst_day_c: round(mean(n(lst, (r) => r.lst_day_c)), 1),
    };
  }).sort((a, b) => a.year - b.year || a.month - b.month);
  writeCSV(path.join(dir, 'monthly_series.csv'), monthlySeries);

  // ---------- monthly climatology (typical year) ----------
  const byMonth = groupBy(monthlySeries, (r) => r.month);
  const pct = (arr, p) => { const v = arr.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.floor(p * (v.length - 1))] : null; };
  const climatology = Array.from({ length: 12 }, (_, i) => {
    const rows = byMonth[i + 1];
    const m = (k, d = 2) => round(mean(rows.map((r) => r[k])), d);
    const ndviVals = ndvi?.filter((r) => r.month === i + 1).map((r) => r.ndvi_clean) ?? [];
    const ndviMean = round(mean(ndviVals), 3);
    return {
      site: site.id, month: i + 1,
      tmax_c: m('tmax_c', 1), tmin_c: m('tmin_c', 1), precip_mm: m('precip_mm', 1), et0_mm: m('et0_mm', 1),
      water_balance_mm: m('water_balance_mm', 1),
      soil_moisture: m('soil_wet_top', 3), soil_wet_root: m('soil_wet_root', 3),
      et_mm: et ? m('et_modis_mm', 1) : null, pet_mm: et ? m('pet_modis_mm', 1) : null,
      ndvi: ndviMean, ndvi_p10: round(pct(ndviVals, 0.1), 3), ndvi_p90: round(pct(ndviVals, 0.9), 3),
      lst_day_c: lst ? m('lst_day_c', 1) : null,
      frost_days: m('frost_days', 1), heat_days: m('heat_days', 1), heavy_rain_days: m('heavy_rain_days', 1), gdd: m('gdd', 0),
      typically_bare: ndviMean === null ? null : ndviMean < BARE_NDVI,
    };
  });
  writeCSV(path.join(dir, 'monthly_climatology.csv'), climatology);
  allMonthly.push(...climatology);

  // ---------- annual ----------
  const byYear = groupBy(power, (r) => r.year);
  const annual = Object.entries(byYear).map(([y, rows]) => {
    const year = Number(y);
    const nd = ndvi?.filter((r) => r.year === year && r.ndvi_clean !== null) ?? [];
    const etY = etRate?.filter((r) => r.year === year) ?? [];
    const lsY = lst?.filter((r) => r.year === year && r.lst_day_c !== null) ?? [];
    return {
      site: site.id, year,
      tmean_c: round(mean(rows.map((r) => r.tmean_c))),
      heat_days: sum(rows.map((r) => r.heat_day)),
      frost_days: sum(rows.map((r) => r.frost_day)),
      frost_free_run_days: longestRun(rows.map((r) => r.tmin_c !== null && r.tmin_c > 0)),
      precip_mm: round(sum(rows.map((r) => r.precip_mm)), 0),
      heavy_rain_days: sum(rows.map((r) => r.heavy_rain_day)),
      max_dry_spell_days: longestRun(rows.map((r) => r.precip_mm !== null && r.precip_mm < 1)),
      precip_p95_day_mm: round(pct(rows.map((r) => r.precip_mm).filter((p) => p >= 1), 0.95), 1),
      gdd: round(sum(rows.map((r) => r.gdd_base10)), 0),
      et0_mm: round(sum(rows.map((r) => r.et0_hargreaves_mm)), 0),
      water_balance_mm: round(sum(rows.map((r) => r.water_balance_mm)), 0),
      soil_wet_top_mean: round(mean(rows.map((r) => r.soil_wet_top)), 3),
      ndvi_mean: nd.length ? round(mean(nd.map((r) => r.ndvi_clean)), 3) : null,
      ndvi_peak: nd.length ? round(Math.max(...nd.map((r) => r.ndvi_clean)), 3) : null,
      bare_composite_share: nd.length ? round(nd.filter((r) => r.ndvi_clean < BARE_NDVI).length / nd.length, 2) : null,
      et_modis_mm: etY.length ? round(mean(etY.map((r) => r.et_day)) * 365, 0) : null,
      lst_day_max_c: lsY.length ? round(Math.max(...lsY.map((r) => r.lst_day_c)), 1) : null,
      groundwater_anomaly_cm: null, // needs GRACE-FO — see NEXT_STEPS.md
      growing_season_days: longestRun(rows.map((r) => r.tmin_c !== null && r.tmin_c > 0)), // thermal proxy (frost-free run)
    };
  }).sort((a, b) => a.year - b.year);
  writeCSV(path.join(dir, 'annual.csv'), annual);
  allAnnual.push(...annual);

  // ---------- trends ----------
  const years = annual.map((r) => r.year);
  const metrics = Object.keys(annual[0]).filter((k) => !['site', 'year', 'groundwater_anomaly_cm'].includes(k));
  const trends = {};
  for (const k of metrics) {
    const ys = annual.map((r) => r[k]);
    if (ys.filter(Number.isFinite).length < 8) continue;
    const b = slope(years, ys);
    const first = mean(annual.filter((r) => r.year <= years[0] + 9).map((r) => r[k]));
    const last = mean(annual.filter((r) => r.year >= years.at(-1) - 9).map((r) => r[k]));
    trends[k] = {
      per_decade: round(b * 10, 3),
      first_10y_mean: round(first, 2), last_10y_mean: round(last, 2),
      change_pct_over_period: first ? round((b * (years.at(-1) - years[0])) / mean(ys) * 100, 1) : null,
      mann_kendall: mannKendall(ys),
    };
  }
  writeJSON(path.join(dir, 'trends.json'), { site: site.id, period: `${years[0]}-${years.at(-1)}`, note: 'Mann-Kendall p<0.05 = significant monotonic trend. With 24 years, treat p 0.05-0.15 as "possible", not proven.', trends });

  // ---------- app-shaped JSON (matches RegionDetail in src/types/index.ts) ----------
  const ts = (k) => trends[k];
  const regionClimate = {
    _provenance: {
      generated: new Date().toISOString(), field_point: site.field, pin: site.pin, available,
      notes: [
        'Real data replacing make_fake_data.ts for: monthly, annual, trends (except groundwater), soil.',
        'insights / rotations / crop_fit are NOT generated here — they are the analysis step (see data/NEXT_STEPS.md).',
        'soil_moisture is the POWER/MERRA-2 GWETTOP wetness index (0-1), not SMAP volumetric moisture.',
      ],
    },
    region: { id: site.id, name: site.name, place: site.place, lat: site.pin.lat, lon: site.pin.lon },
    monthly: climatology.map((c) => ({
      month: c.month, tmax_c: c.tmax_c, tmin_c: c.tmin_c, precip_mm: c.precip_mm, soil_moisture: c.soil_moisture,
      et_mm: c.et_mm ?? c.et0_mm, ndvi: c.ndvi, frost_days: c.frost_days, heat_days: c.heat_days,
      heavy_rain_days: c.heavy_rain_days, typically_bare: c.typically_bare,
    })),
    annual: annual.map((a) => ({
      year: a.year, heat_days: a.heat_days, precip_mm: a.precip_mm, heavy_rain_days: a.heavy_rain_days,
      groundwater_anomaly_cm: null, growing_season_days: a.growing_season_days,
    })),
    trends: {
      heat_days_per_decade: ts('heat_days')?.per_decade ?? null,
      precip_change_pct: ts('precip_mm')?.change_pct_over_period ?? null,
      heavy_rain_change_pct: ts('heavy_rain_days')?.change_pct_over_period ?? null,
      groundwater: null, // 'rapidly declining' | 'declining' | 'stable' | 'recharging' — needs GRACE-FO
    },
    soil: soil ? {
      texture: soil.app_labels.texture, organic_matter: soil.app_labels.organic_matter,
      drainage: soil.app_labels.drainage_heuristic, slope_pct: terrain?.slope_pct_field ?? null,
      erosion_risk: terrain?.erosion_risk_from_slope ?? null, water_holding: soil.app_labels.water_holding,
      source: `ISRIC SoilGrids 2.0${terrain ? ' + NASA SRTM' : ''}`,
    } : null,
    sources: [
      'NASA POWER (MERRA-2) daily 2001-2024',
      ...(ndvi ? ['MODIS MOD13Q1 NDVI 250 m (ORNL DAAC)'] : []),
      ...(et ? ['MODIS MOD16A2GF ET 500 m (ORNL DAAC)'] : []),
      ...(lst ? ['MODIS MOD11A2 LST 1 km (ORNL DAAC)'] : []),
      ...(soil ? ['ISRIC SoilGrids 2.0'] : []),
      ...(terrain ? ['NASA SRTM 30 m (OpenTopoData)'] : []),
    ],
  };
  writeJSON(path.join(dir, 'region_climate.json'), regionClimate);
}

if (allAnnual.length) writeCSV(path.join(PROCESSED_DIR, 'all_sites_annual.csv'), allAnnual);
if (allMonthly.length) writeCSV(path.join(PROCESSED_DIR, 'all_sites_monthly_climatology.csv'), allMonthly);
