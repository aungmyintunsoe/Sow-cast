// Shows how complete each download is, per source and per region. Reads files only; fetches nothing.
//
//   node data/scripts/status.mjs      (or: npm run data:status)
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, PROCESSED_DIR, DATA_DIR } from './lib.mjs';

const SOURCES = [
  ['POWER weather', 'power_daily.csv', '01_fetch_power.mjs'],
  ['CHIRPS rain', 'chirps_daily.csv', '01b_fetch_chirps.mjs'],
  ['ERA5 temp', 'era5_daily.csv', '01c_fetch_era5.mjs'],
  ['Greenness', 'ndvi_monthly.csv', '02b_fetch_ndvi_gibs.py'],
  ['Soil', 'soil_summary.json', '03_fetch_soil.mjs'],
  ['Slope', 'terrain.json', '04_fetch_terrain.mjs'],
  ['Summaries', 'trends.json', '05_build_summaries.mjs'],
];

const sites = loadConfig().sites;
const has = (site, file) => fs.existsSync(path.join(PROCESSED_DIR, site.id, file));
const age = (file) => {
  if (!fs.existsSync(file)) return 'never';
  const min = Math.round((Date.now() - fs.statSync(file).mtimeMs) / 60000);
  return min < 60 ? `${min} min ago` : min < 2880 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} days ago`;
};

console.log(`\nDownloads for ${sites.length} regions\n`);
for (const [label, file, script] of SOURCES) {
  const done = sites.filter((s) => has(s, file));
  const missing = sites.filter((s) => !has(s, file)).map((s) => s.id);
  const bar = '█'.repeat(Math.round((done.length / sites.length) * 20)).padEnd(20, '░');
  console.log(`${label.padEnd(14)} ${bar} ${String(done.length).padStart(2)}/${sites.length}${missing.length ? `   missing: ${missing.join(', ')}` : ''}`);
  if (missing.length) console.log(`${''.padEnd(14)} → resume with: node data/scripts/${script}`);
}

const scored = path.join(PROCESSED_DIR, 'scored', 'sowcast_region_crop_fit.csv');
const appIndex = path.resolve(DATA_DIR, '..', 'public', 'data', 'regions', 'index.json');
console.log(`\nCrop scores from measured data: built ${age(scored)}`);
console.log(`App data (public/data):         built ${age(appIndex)}`);
console.log('\nAfter new downloads, rebuild with:');
console.log('  node data/scripts/05_build_summaries.mjs');
console.log('  data/.venv/Scripts/python.exe data/scripts/05b_score_measured.py');
console.log('  npm run data:build\n');
