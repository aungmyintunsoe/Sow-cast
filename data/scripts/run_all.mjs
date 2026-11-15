// Runs the whole keyless pipeline in order. Every step caches raw responses in data/raw/,
// so re-running is cheap and an interrupted run resumes where it stopped.
//
//   node data/scripts/run_all.mjs                # all sites
//   node data/scripts/run_all.mjs mm-dry-zone    # one site (passed through to every step)
//   node data/scripts/run_all.mjs --refresh      # ignore cache, re-download everything
//   node data/scripts/run_all.mjs --with-modis   # also try the ORNL MODIS series (hours; often down)
//
// Python steps run with data/.venv (create it with: python -m venv data/.venv && pip install -r data/requirements.txt).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const venv = path.resolve(here, '..', '.venv');
const python = [path.join(venv, 'Scripts', 'python.exe'), path.join(venv, 'bin', 'python')].find((p) => fs.existsSync(p));
const args = process.argv.slice(2);
const passArgs = args.filter((a) => a !== '--with-modis');
const withModis = args.includes('--with-modis');

const steps = [
  ['00_sites_from_inputs.mjs', 'site list from data/inputs/sowcast_regions.csv'],
  ['01_fetch_power.mjs', 'NASA POWER daily weather'],
  ['01b_fetch_chirps.mjs', 'CHIRPS daily rain (ClimateSERV; ~3 min per region)'],
  ['01c_fetch_era5.mjs', 'ERA5 daily temperature (Open-Meteo; hourly rate limit — re-run if it stops)'],
  ['02b_fetch_ndvi_gibs.py', 'monthly cropland greenness from NASA GIBS tiles'],
  ...(withModis ? [['02_fetch_modis.mjs', 'MODIS NDVI, land cover, ET, LST (ORNL — slow, often down)']] : []),
  ['03b_fetch_soil_wcs.py', 'ISRIC SoilGrids via WCS map service (fallback when the REST API is down)'],
  ['03_fetch_soil.mjs', 'ISRIC SoilGrids soil profile (≈5 requests/min limit)'],
  ['04_fetch_terrain.mjs', 'NASA SRTM elevation + slope'],
  ['05_build_summaries.mjs', 'merge sources → monthly / annual / trend tables + quality check'],
  ['05b_score_measured.py', 'crop and rotation scores from measured data (team rules)'],
  ['05d_recommend_rotations.py', 'rotation plans for 6 goals (team recommender on measured data)'],
  ['06_build_app_data.mjs', 'public/data for the app'],
];

const failed = [];
for (const [file, what] of steps) {
  console.log(`\n════ ${file} — ${what}`);
  const isPy = file.endsWith('.py');
  if (isPy && !python) {
    console.error('✗ data/.venv not found — skipping Python step (see the header of this file)');
    failed.push(file);
    continue;
  }
  const cmd = isPy ? python : process.execPath;
  const cmdArgs = isPy ? ['-I', path.join(here, file), ...passArgs.filter((a) => !a.startsWith('--'))] : [path.join(here, file), ...passArgs];
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit' });
  if (r.status !== 0) {
    failed.push(file);
    console.error(`✗ ${file} exited with ${r.status} — continuing; re-run later to resume from cache`);
  }
}
console.log(failed.length ? `\nFinished with failures: ${failed.join(', ')}` : '\n✓ All steps finished. The app reads public/data.');
process.exit(failed.length ? 1 : 0);
