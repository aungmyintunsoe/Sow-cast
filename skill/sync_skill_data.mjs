// Copies the app's current data and the team's scoring rules into the skill, so the skill is self-contained.
// Run after `npm run data:build`:   node skill/sync_skill_data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const skill = path.join(here, 'skills', 'sowcast-advisor');
const dataOut = path.join(skill, 'data');

fs.rmSync(dataOut, { recursive: true, force: true });
fs.mkdirSync(path.join(dataOut, 'regions'), { recursive: true });
fs.copyFileSync(path.join(root, 'public', 'data', 'crops.json'), path.join(dataOut, 'crops.json'));
const regionFiles = fs.readdirSync(path.join(root, 'public', 'data', 'regions')).filter((f) => f.endsWith('.json'));
for (const f of regionFiles) fs.copyFileSync(path.join(root, 'public', 'data', 'regions', f), path.join(dataOut, 'regions', f));
fs.copyFileSync(path.join(root, 'data', 'inputs', 'make_data.py'), path.join(skill, 'scripts', 'make_data.py'));

// Crop trait table for the skill (references/crop-table.md), generated so it always matches the data.
{
  const crops = JSON.parse(fs.readFileSync(path.join(dataOut, 'crops.json'), 'utf8'));
  const name = (id) => crops.find((c) => c.id === id)?.name.replace(/ \(.*\)$/, '') ?? id;
  const rows = crops.map((c) => [
    `${c.name} (\`${c.id}\`)`, c.family, c.season, c.season_days, `${c.temp_min_c}–${c.temp_max_c}`, c.seasonal_rain_need_mm,
    `${c.drought_tolerance}/${c.flood_tolerance}/${c.salinity_tolerance}`, c.nitrogen_fixing ? (c.n_fixed ?? 'yes') : '–',
    c.yield_low !== null ? `${c.yield_low}–${c.yield_high} ${c.yield_unit}` : '–',
    `${c.needs.fertiliser ?? '?'}/${c.needs.labour ?? '?'}/${c.needs.pest_difficulty ?? '?'}`, c.relative_income ?? '?',
    c.good_after.map(name).join(', ') || '–', c.avoid_after.map(name).join(', ') || '–', `${c.farmer_tip} Pests: ${c.pest_notes}`,
  ].map((v) => String(v).replace(/\|/g, '/')).join(' | '));
  const md = [
    '# Crop table (generated from data/crops.json; do not edit by hand)',
    '',
    'Columns: season days; mean temperature range °C; seasonal water need mm; drought/flood/salt tolerance 1-5;',
    'nitrogen fixed; rough yield; fertiliser/labour/pest difficulty 1-5; relative income 1-5; good after; avoid after; tip and pests.',
    'The id in backticks is what scripts accept (e.g. `green_gram`).',
    '',
    '| Crop | Family | Season | Days | Temp °C | Water mm | Dr/Fl/Salt | N fixed | Yield | Fert/Lab/Pest | Income | Good after | Avoid after | Tip and pests |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r} |`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(skill, 'references', 'crop-table.md'), md);
}

// What the snapshot contains, so the skill can tell which fields are still missing.
const index = JSON.parse(fs.readFileSync(path.join(dataOut, 'regions', 'index.json'), 'utf8'));
const coverage = index.map((r) => {
  const d = JSON.parse(fs.readFileSync(path.join(dataOut, 'regions', `${r.id}.json`), 'utf8'));
  return {
    id: r.id,
    weather: d.monthly.length ? d.data_quality.weather : 'missing',
    greenness: d.monthly.some((m) => m.ndvi !== null),
    soil: d.soil !== null,
    measured_scoring_inputs: (d.scoring_inputs ?? []).filter((u) => u.used === 'measured').length,
  };
});
fs.writeFileSync(
  path.join(dataOut, 'MANIFEST.json'),
  JSON.stringify({ synced: new Date().toISOString(), regions: coverage.length, coverage }, null, 2) + '\n',
);
const n = (k) => coverage.filter((c) => c[k] === true || c[k] === 'ok').length;
console.log(`✓ skill data synced: ${coverage.length} regions (weather ok ${n('weather')}, greenness ${n('greenness')}, soil ${n('soil')})`);
