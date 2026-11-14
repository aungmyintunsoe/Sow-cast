// Step 5 — Inventory of the NASA datasets that need an Earthdata login (SMAP, GPM IMERG, GRACE-FO,
// ECOSTRESS, Landsat/Sentinel HLS). Uses the public NASA CMR search API (no login needed) to count how many
// files (granules) cover each field point and over which dates — so we know what we CAN get before
// anyone requests it through AppEEARS / Giovanni.
// Docs: https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html
//
//   node data/scripts/05_check_availability.mjs [siteId ...]
//
// Output: data/processed/data_availability.csv
import path from 'node:path';
import { loadConfig, selectedSites, writeCSV, sleep, PROCESSED_DIR } from './lib.mjs';

const COLLECTIONS = [
  { short_name: 'GPM_3IMERGDF', version: '07', what: 'GPM IMERG Final daily precipitation (0.1°)', app_use: 'rain history, heavy-rain days' },
  { short_name: 'SPL3SMP_E', version: '006', what: 'SMAP L3 enhanced radiometer soil moisture (9 km, daily)', app_use: 'topsoil moisture' },
  { short_name: 'SPL4SMGP', version: '008', what: 'SMAP L4 surface + root-zone soil moisture (9 km, 3-hourly)', app_use: 'root-zone moisture' },
  { short_name: 'TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4', version: null, what: 'GRACE/GRACE-FO JPL mascon water-equivalent thickness (monthly, global single file)', app_use: 'groundwater decline' },
  { short_name: 'ECO_L2T_LSTE', version: '002', what: 'ECOSTRESS land-surface temperature (70 m, irregular overpasses)', app_use: 'heat-stress hotspots' },
  { short_name: 'HLSL30', version: '2.0', what: 'Harmonized Landsat 8/9 surface reflectance (30 m)', app_use: 'field-scale green vs bare' },
  { short_name: 'HLSS30', version: '2.0', what: 'Harmonized Sentinel-2 surface reflectance (30 m)', app_use: 'field-scale green vs bare' },
  { short_name: 'MOD13Q1', version: '061', what: 'MODIS 16-day NDVI (250 m) — already fetched keylessly via ORNL', app_use: 'green vs bare (fetched)' },
];

async function cmr(params) {
  const url = `https://cmr.earthdata.nasa.gov/search/granules.json?${new URLSearchParams(params)}`;
  for (let a = 1; a <= 4; a++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'sowcast-data-pipeline/1.0' }, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { hits: Number(res.headers.get('cmr-hits')), entries: (await res.json()).feed.entry };
    } catch (e) {
      if (a === 4) throw e;
      await sleep(2000 * a);
    }
  }
}

const cfg = loadConfig();
const rows = [];
for (const site of selectedSites(cfg)) {
  console.log(`\n▶ CMR inventory ${site.id}`);
  for (const c of COLLECTIONS) {
    const base = { short_name: c.short_name, point: `${site.field.lon},${site.field.lat}`, page_size: '1' };
    if (c.version) base.version = c.version;
    const first = await cmr({ ...base, sort_key: 'start_date' });
    const last = await cmr({ ...base, sort_key: '-start_date' });
    const row = {
      site: site.id, short_name: c.short_name, version: c.version ?? 'any', dataset: c.what, used_for: c.app_use,
      granules_at_point: first.hits,
      first_date: first.entries[0]?.time_start?.slice(0, 10) ?? null,
      last_date: (last.entries[0]?.time_end ?? last.entries[0]?.time_start)?.slice(0, 10) ?? null,
      needs_earthdata_login: c.short_name === 'MOD13Q1' ? 'no (via ORNL)' : 'yes',
    };
    console.log(`  ${c.short_name.padEnd(44)} ${String(row.granules_at_point).padStart(6)} files  ${row.first_date} → ${row.last_date}`);
    rows.push(row);
  }
}
writeCSV(path.join(PROCESSED_DIR, 'data_availability.csv'), rows);
