// OPTIONAL — needs a free NASA Earthdata login (https://urs.earthdata.nasa.gov/users/new).
// Submits ONE AppEEARS point-sample task for all field points and downloads the CSV results.
// AppEEARS extracts pixel values at our coordinates so we never download full satellite scenes.
// Docs: https://appeears.earthdatacloud.nasa.gov/api/
//
// Product/layer names below were validated against the public /api/product listing on 2026-11-14.
// STATUS: written but NOT yet run (no Earthdata credentials were available while building this).
//
//   PowerShell:  $env:EARTHDATA_USERNAME="you"; $env:EARTHDATA_PASSWORD="..."; node data/scripts/earthdata/appeears_point_request.mjs
//   bash:        EARTHDATA_USERNAME=you EARTHDATA_PASSWORD=... node data/scripts/earthdata/appeears_point_request.mjs
//   resume:      node data/scripts/earthdata/appeears_point_request.mjs --task=<task_id>
//
// Output: data/raw/appeears/<task_id>/*.csv   (tasks usually take 10–60 min server-side)
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, ensureDir, sleep, RAW_DIR } from '../lib.mjs';

const API = 'https://appeears.earthdatacloud.nasa.gov/api';

const LAYERS = [
  // SMAP soil moisture (README row "Topsoil moisture")
  { product: 'SPL4SMGP.008', layer: 'Geophysical_Data_sm_surface' },
  { product: 'SPL4SMGP.008', layer: 'Geophysical_Data_sm_rootzone' },
  { product: 'SPL3SMP_E.006', layer: 'Soil_Moisture_Retrieval_Data_AM_soil_moisture' },
  { product: 'SPL3SMP_E.006', layer: 'Soil_Moisture_Retrieval_Data_AM_retrieval_qual_flag' },
  // ECOSTRESS (README row "Heat stress hotspots")
  { product: 'ECO_L2T_LSTE.002', layer: 'LST' },
  { product: 'ECO_L2T_LSTE.002', layer: 'QC' },
  { product: 'ECO_L2T_LSTE.002', layer: 'cloud' },
  // Harmonized Landsat/Sentinel-2 30 m NDVI (README row "Green vs bare fields" at field scale)
  { product: 'HLSL30_VI.020', layer: 'NDVI' },
  { product: 'HLSS30_VI.020', layer: 'NDVI' },
];
// SPL4SMGP is 3-hourly → large. Start 2015-04-01 (SMAP launch), end 2024-12-31 to match the POWER period.
const DATES = [{ startDate: '04-01-2015', endDate: '12-31-2024' }];

const user = process.env.EARTHDATA_USERNAME;
const pass = process.env.EARTHDATA_PASSWORD;
if (!user || !pass) {
  console.error('Set EARTHDATA_USERNAME and EARTHDATA_PASSWORD (free account: https://urs.earthdata.nasa.gov/users/new).');
  process.exit(1);
}

async function api(method, route, { token, body, raw } = {}) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64') }),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${method} ${route} → HTTP ${res.status}: ${await res.text()}`);
  return raw ? res : res.json();
}

const { token } = await api('POST', '/login');
console.log('✓ logged in to AppEEARS');

let taskId = process.argv.find((a) => a.startsWith('--task='))?.slice(7);
if (!taskId) {
  const cfg = loadConfig();
  const task = {
    task_type: 'point',
    task_name: `sowcast-fields-${new Date().toISOString().slice(0, 10)}`,
    params: {
      dates: DATES,
      layers: LAYERS,
      coordinates: cfg.sites.map((s) => ({ id: s.id, category: 'sowcast', latitude: s.field.lat, longitude: s.field.lon })),
    },
  };
  ({ task_id: taskId } = await api('POST', '/task', { token, body: task }));
  console.log(`✓ submitted task ${taskId} — if this script is interrupted, resume with --task=${taskId}`);
}

for (;;) {
  const t = await api('GET', `/task/${taskId}`, { token });
  console.log(`  status: ${t.status}`);
  if (t.status === 'done') break;
  if (t.status === 'error') throw new Error(JSON.stringify(t, null, 2));
  await sleep(60_000);
}

const bundle = await api('GET', `/bundle/${taskId}`, { token });
const outDir = ensureDir(path.join(RAW_DIR, 'appeears', taskId));
for (const f of bundle.files) {
  if (!/\.(csv|json|txt|xml)$/i.test(f.file_name)) continue;
  const res = await api('GET', `/bundle/${taskId}/${f.file_id}`, { token, raw: true });
  const dest = path.join(outDir, path.basename(f.file_name));
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`  ✓ ${path.relative(process.cwd(), dest)}`);
}
console.log('\nDone. Next: tidy these CSVs into data/processed/<site>/smap_*.csv, ecostress_lst.csv, hls_ndvi.csv (see data/NEXT_STEPS.md).');
