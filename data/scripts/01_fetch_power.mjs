// Step 1 — NASA POWER daily point data (MERRA-2 + GEOS / CERES based), no API key.
// Docs: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
//
//   node data/scripts/01_fetch_power.mjs [siteId ...] [--refresh]
//
// Output: data/processed/<site>/power_daily.csv
import path from 'node:path';
import { fetchJSON, loadConfig, selectedSites, writeCSV, RAW_DIR, PROCESSED_DIR, round, doy } from './lib.mjs';

const PARAMS = [
  'T2M', 'T2M_MAX', 'T2M_MIN', 'T2MDEW', 'RH2M', // temperature & humidity
  'PRECTOTCORR', // bias-corrected precipitation (mm/day)
  'WS2M', 'ALLSKY_SFC_SW_DWN', // wind 2 m, solar radiation
  'GWETTOP', 'GWETROOT', 'GWETPROF', // soil wetness 0-1 (surface 0-5 cm, root zone 0-100 cm, whole profile)
  'EVPTRNS', // evapotranspiration energy flux (MJ/m²/day) → converted to mm
  'TS', // earth skin temperature
];
const FILL = -999;
const HEAT_C = 35; // crop heat-stress threshold (maize/wheat pollination damage starts ~32-35 °C)
const HEAVY_MM = 20; // ETCCDI "R20mm" very-heavy-precipitation day

/** Extraterrestrial radiation Ra (MJ m-2 day-1), FAO-56 eq. 21 */
function extraterrestrialRad(latDeg, j) {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * j) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * j) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  return ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
}

const cfg = loadConfig();
const { start_year, end_year } = cfg.period;
// POWER handles multi-decade daily requests, but chunking keeps responses small and retry-friendly.
const CHUNK = 6;

for (const site of selectedSites(cfg)) {
  console.log(`\n▶ POWER ${site.id} (${site.location.lat}, ${site.location.lon})`);
  const merged = {};
  for (let y0 = start_year; y0 <= end_year; y0 += CHUNK) {
    const y1 = Math.min(end_year, y0 + CHUNK - 1);
    const url =
      'https://power.larc.nasa.gov/api/temporal/daily/point' +
      `?parameters=${PARAMS.join(',')}&community=AG&latitude=${site.location.lat}&longitude=${site.location.lon}` +
      `&start=${y0}0101&end=${y1}1231&format=JSON&time-standard=LST`;
    console.log(`  · ${y0}-${y1}`);
    const json = await fetchJSON(url, { cacheFile: path.join(RAW_DIR, 'power', `${site.id}_${y0}_${y1}.json`) });
    for (const [p, series] of Object.entries(json.properties.parameter)) {
      for (const [d, v] of Object.entries(series)) {
        (merged[d] ??= {})[p] = v === FILL ? null : v;
      }
    }
  }

  const rows = Object.keys(merged).sort().map((d) => {
    const v = merged[d];
    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    const tmax = v.T2M_MAX, tmin = v.T2M_MIN, tmean = v.T2M;
    const ra = extraterrestrialRad(site.location.lat, doy(date));
    const et0 = tmax !== null && tmin !== null && tmax >= tmin
      ? 0.0023 * 0.408 * ra * ((tmax + tmin) / 2 + 17.8) * Math.sqrt(tmax - tmin) : null; // Hargreaves (mm/day)
    const gdd = tmax !== null && tmin !== null
      ? Math.max(0, (Math.min(tmax, 30) + Math.max(tmin, 10)) / 2 - 10) : null; // base 10, cap 30 (maize GDD)
    return {
      date,
      year: Number(d.slice(0, 4)),
      month: Number(d.slice(4, 6)),
      tmean_c: tmean, tmax_c: tmax, tmin_c: tmin, dewpoint_c: v.T2MDEW, rh_pct: v.RH2M,
      precip_mm: v.PRECTOTCORR,
      wind_ms: v.WS2M, solar_mj_m2: v.ALLSKY_SFC_SW_DWN,
      soil_wet_top: v.GWETTOP, soil_wet_root: v.GWETROOT, soil_wet_profile: v.GWETPROF,
      // MERRA-2 land-model ET. CAUTION: model has no irrigation and runs low — prefer MODIS ET (02_fetch_modis.mjs).
      et_model_mm: v.EVPTRNS === null ? null : round(v.EVPTRNS / 2.45, 3), // λ = 2.45 MJ/kg
      et0_hargreaves_mm: round(et0, 3),
      water_balance_mm: v.PRECTOTCORR !== null && et0 !== null ? round(v.PRECTOTCORR - et0, 3) : null,
      skin_temp_c: v.TS,
      gdd_base10: round(gdd, 2),
      frost_day: tmin === null ? null : tmin < 0 ? 1 : 0,
      heat_day: tmax === null ? null : tmax >= HEAT_C ? 1 : 0,
      heavy_rain_day: v.PRECTOTCORR === null ? null : v.PRECTOTCORR >= HEAVY_MM ? 1 : 0,
    };
  });
  writeCSV(path.join(PROCESSED_DIR, site.id, 'power_daily.csv'), rows);
}
