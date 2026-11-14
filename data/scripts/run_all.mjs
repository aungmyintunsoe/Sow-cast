// Runs the whole keyless pipeline in order. Every step caches raw responses in data/raw/,
// so re-running is cheap and an interrupted run resumes where it stopped.
//
//   node data/scripts/run_all.mjs            # all sites
//   node data/scripts/run_all.mjs iowa       # one site (passed through to every step)
//   node data/scripts/run_all.mjs --refresh  # ignore cache, re-download everything
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const steps = [
  ['00_verify_sites.mjs', 'check field points are on cropland (MODIS land cover)'],
  ['01_fetch_power.mjs', 'NASA POWER daily weather + soil wetness'],
  ['03_fetch_soil.mjs', 'ISRIC SoilGrids soil profile'],
  ['04_fetch_terrain.mjs', 'NASA SRTM elevation + slope'],
  ['05_check_availability.mjs', 'NASA CMR inventory of login-only datasets'],
  ['02_fetch_modis.mjs', 'MODIS NDVI, land cover, ET, LST (slowest — ORNL service)'],
  ['06_build_summaries.mjs', 'monthly / annual / trend tables + app-shaped JSON'],
];

const failed = [];
for (const [file, what] of steps) {
  console.log(`\n════ ${file} — ${what}`);
  const r = spawnSync(process.execPath, [path.join(here, file), ...args], { stdio: 'inherit' });
  if (r.status !== 0) {
    failed.push(file);
    console.error(`✗ ${file} exited with ${r.status} — continuing; re-run later to resume from cache`);
  }
}
console.log(failed.length ? `\nFinished with failures: ${failed.join(', ')}` : '\n✓ All steps finished. Start with data/processed/all_sites_annual.csv');
process.exit(failed.length ? 1 : 0);
