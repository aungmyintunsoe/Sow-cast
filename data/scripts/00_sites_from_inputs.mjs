// Step 0 — Build config/sites.json from the team's region list (data/inputs/sowcast_regions.csv).
// The CSV is the source of truth for which locations exist; edit it (or make_data.py), then re-run this.
//
//   node data/scripts/00_sites_from_inputs.mjs
import path from 'node:path';
import fs from 'node:fs';
import { DATA_DIR, CONFIG_PATH, readCSV } from './lib.mjs';

const regions = readCSV(path.join(DATA_DIR, 'inputs', 'sowcast_regions.csv'));
const old = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : {};

const cfg = {
  _comment:
    'GENERATED from data/inputs/sowcast_regions.csv by 00_sites_from_inputs.mjs — edit the CSV, not this file. ' +
    "'location' is the region's reference town (lat/lon from the CSV). Town centres are fine for POWER (≈50 km grid) " +
    'but not for field-scale satellite data — see NEXT_STEPS.md (moving points onto cropland).',
  period: old.period ?? { start_year: 2001, end_year: 2024 },
  sites: regions.map((r) => ({
    id: r.id,
    name: r.region,
    place: r.place,
    country: r.country,
    location: { lat: r.lat, lon: r.lon },
    hemisphere: r.lat >= 0 ? 'N' : 'S',
  })),
};
fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
console.log(`✓ wrote config/sites.json with ${cfg.sites.length} sites: ${[...new Set(cfg.sites.map((s) => s.country))].join(', ')}`);
