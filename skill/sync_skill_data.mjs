// Copies the app's current data and the team's scoring rules into the skill, so the skill is self-contained.
// Run after `npm run data:build`:   node skill/sync_skill_data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const skill = path.join(here, 'sowcast-advisor');
const dataOut = path.join(skill, 'data');

fs.rmSync(dataOut, { recursive: true, force: true });
fs.mkdirSync(path.join(dataOut, 'regions'), { recursive: true });
fs.copyFileSync(path.join(root, 'public', 'data', 'crops.json'), path.join(dataOut, 'crops.json'));
const regionFiles = fs.readdirSync(path.join(root, 'public', 'data', 'regions')).filter((f) => f.endsWith('.json'));
for (const f of regionFiles) fs.copyFileSync(path.join(root, 'public', 'data', 'regions', f), path.join(dataOut, 'regions', f));
fs.copyFileSync(path.join(root, 'data', 'inputs', 'make_data.py'), path.join(skill, 'scripts', 'make_data.py'));

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
