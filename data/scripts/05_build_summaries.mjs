// Step 5 — Merge the weather sources, turn the series into analysis-ready tables, and check quality.
// Sources, best first:
//   rain         CHIRPS (01b) → else POWER (unless POWER is broken here) → else ERA5
//   temperature  POWER (01) when its series passes the 2008 step check → else ERA5 (01c)
//   greenness    GIBS VIIRS NDVI on cropland pixels (02b) → else MODIS point NDVI (02)
// Crop water demand, heat/downpour days etc. are recomputed from the merged values (lib.mjs deriveDaily).
//
//   node data/scripts/05_build_summaries.mjs [siteId ...]
//
// Outputs (data/processed/<site>/):
//   monthly_climatology.csv   12 rows — typical year (2001-2024 average)
//   annual.csv                one row per year — the series to test for trends
//   monthly_series.csv        one row per year-month — for anomaly / seasonal-shift analysis
//   weather_daily.csv         the merged daily series (what everything below is computed from)
//   trends.json               OLS slope per decade + Mann-Kendall significance for every annual metric,
//                             plus 'quality' (which sources were used, and the step checks)
// And across sites: data/processed/all_sites_annual.csv, all_sites_monthly_climatology.csv
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, selectedSites, readCSV, writeCSV, writeJSON, PROCESSED_DIR, RAW_DIR, round, mean, sum, slope, mannKendall, deriveDaily, stepCheck } from './lib.mjs';

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
  const chirps = opt(path.join(dir, 'chirps_daily.csv'));
  const era5 = opt(path.join(dir, 'era5_daily.csv'));
  const gibsNdvi = opt(path.join(dir, 'ndvi_monthly.csv'));
  const ndvi = gibsNdvi
    ? gibsNdvi.map((r) => ({ year: r.year, month: r.month, ndvi_clean: r.ndvi }))
    : opt(path.join(dir, 'modis_ndvi.csv'));

  // ---------- 1) check POWER on its own ----------
  // POWER (MERRA-2) has a step change around 2008 in data-sparse areas (all of Myanmar, Vietnam's Central
  // Highlands, Cambodia's plateau): rain jumps 2-10x and temperature drops 0.4-1.9 °C at the same moment.
  const powerYears = Object.values(groupBy(power, (r) => r.year)).map((rows) => ({
    year: rows[0].year, precip_mm: sum(rows.map((r) => r.precip_mm)), tmean_c: mean(rows.map((r) => r.tmean_c)),
  }));
  const powerCheck = stepCheck(powerYears);

  // ---------- 2) merge sources ----------
  const tempSource = powerCheck.broken && era5 ? 'ERA5 (Open-Meteo)' : 'NASA POWER';
  const rainSource = chirps ? 'CHIRPS (ClimateSERV)' : powerCheck.broken && era5 ? 'ERA5 (Open-Meteo)' : 'NASA POWER';
  // Elevation correction for POWER temperature. POWER's ~50 km cell has one average elevation, so a hill town
  // (Cameron Highlands, 1,437 m in a 593 m cell) or a valley town reads too warm or too cold. Shift by the
  // standard lapse rate, 6.5 °C per 1,000 m, from the cell elevation to the town's SRTM elevation.
  // ERA5 via Open-Meteo is already corrected to the point's elevation, so it is left as is.
  const LAPSE = -0.0065;
  const terrainInfo = opt(path.join(dir, 'terrain.json'));
  const powerRaw = fs.existsSync(path.join(RAW_DIR, 'power'))
    ? fs.readdirSync(path.join(RAW_DIR, 'power')).find((f) => f.startsWith(`${site.id}_`) && f.endsWith('.json'))
    : null;
  const powerElev = powerRaw ? JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'power', powerRaw), 'utf8')).geometry?.coordinates?.[2] ?? null : null;
  const siteElev = terrainInfo?.elevation_m ?? null;
  const tAdjust = tempSource === 'NASA POWER' && powerElev !== null && siteElev !== null && Math.abs(siteElev - powerElev) >= 100
    ? round(LAPSE * (siteElev - powerElev), 2) : 0;
  if (tAdjust) console.log(`  · ${site.id}: POWER temperature shifted ${tAdjust > 0 ? '+' : ''}${tAdjust} °C (town ${siteElev} m vs POWER cell ${Math.round(powerElev)} m)`);
  const era5By = new Map((era5 ?? []).map((r) => [r.date, r]));
  const chirpsBy = new Map((chirps ?? []).map((r) => [r.date, r.precip_mm]));
  const daily = power.map((r) => {
    const e = era5By.get(r.date);
    const useEra5T = tempSource.startsWith('ERA5');
    const adj = (v) => (v === null || v === undefined ? null : round(v + tAdjust, 2));
    const tmax = useEra5T ? e?.tmax_c ?? null : adj(r.tmax_c);
    const tmin = useEra5T ? e?.tmin_c ?? null : adj(r.tmin_c);
    const tmean = useEra5T ? e?.tmean_c ?? null : adj(r.tmean_c);
    const precip = rainSource.startsWith('CHIRPS') ? chirpsBy.get(r.date) ?? null : rainSource.startsWith('ERA5') ? e?.precip_mm ?? null : r.precip_mm;
    return { ...r, tmax_c: tmax, tmin_c: tmin, tmean_c: tmean, precip_mm: precip, ...deriveDaily({ date: r.date, tmax, tmin, precip }, site.location.lat) };
  });
  writeCSV(path.join(dir, 'weather_daily.csv'), daily.map((r) => ({
    date: r.date, year: r.year, month: r.month, tmax_c: r.tmax_c, tmin_c: r.tmin_c, tmean_c: r.tmean_c, precip_mm: r.precip_mm,
    et0_hargreaves_mm: r.et0_hargreaves_mm, water_balance_mm: r.water_balance_mm, soil_wet_top: r.soil_wet_top,
    gdd_base10: r.gdd_base10, heat_day: r.heat_day, heavy_rain_day: r.heavy_rain_day,
  })));
  const et = opt(path.join(dir, 'modis_et.csv'));
  const lst = opt(path.join(dir, 'modis_lst.csv'));

  // 8-day ET composites → daily rate, attributed to the composite's start month
  const etRate = et?.map((r) => ({ ...r, et_day: r.et_mm_8day === null ? null : r.et_mm_8day / 8, pet_day: r.pet_mm_8day === null ? null : r.pet_mm_8day / 8 }));

  // ---------- monthly series (year × month) ----------
  const ym = groupBy(daily, (r) => `${r.year}-${r.month}`);
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
  const byYear = groupBy(daily, (r) => r.year);
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
      groundwater_anomaly_cm: null, // GRACE-FO is login-only and out of scope for the demo
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
  // ---------- 3) quality of the merged series ----------
  const finalCheck = stepCheck(annual);
  const quality = {
    weather: finalCheck.broken ? 'suspect' : 'ok',
    rain_source: rainSource,
    temp_source: tempSource,
    temp_elevation_adjust_c: tAdjust || null,
    ndvi_source: gibsNdvi ? 'NASA GIBS VIIRS NDVI (cropland pixels)' : ndvi ? 'MODIS MOD13Q1 (ORNL)' : null,
    power_check: { ...powerCheck, verdict: powerCheck.broken ? 'POWER has a 2008 step change here; replaced where possible' : 'POWER passes' },
    final_check: finalCheck,
    note: finalCheck.broken
      ? 'The merged weather still shows a step change around 2008; treat trends as unreliable.'
      : powerCheck.broken
        ? `POWER weather is broken here (2008 step change), so rain comes from ${rainSource} and temperature from ${tempSource}.`
        : 'No step change detected around 2008.',
  };
  if (powerCheck.broken) console.warn(`  ⚠ POWER broken here → rain: ${rainSource}, temperature: ${tempSource}${finalCheck.broken ? ' — STILL suspect' : ' — fixed'}`);
  writeJSON(path.join(dir, 'trends.json'), { site: site.id, period: `${years[0]}-${years.at(-1)}`, note: 'Mann-Kendall p<0.05 = significant monotonic trend. With 24 years, treat p 0.05-0.15 as "possible", not proven.', quality, trends });

}

if (allAnnual.length) writeCSV(path.join(PROCESSED_DIR, 'all_sites_annual.csv'), allAnnual);
if (allMonthly.length) writeCSV(path.join(PROCESSED_DIR, 'all_sites_monthly_climatology.csv'), allMonthly);
