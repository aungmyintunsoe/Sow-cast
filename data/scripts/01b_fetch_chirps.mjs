// Step 1b — CHIRPS daily rainfall (satellite + rain gauges, ~5 km) via SERVIR ClimateSERV (no key).
// CHIRPS is the rain source for every region: NASA POWER rain (MERRA-2) is broken around 2008 in 8 regions
// and is a coarse ~50 km grid everywhere. We average CHIRPS over a 0.1° box (~11 km) around the reference town.
// API: https://climateserv.servirglobal.net  (submitDataRequest → getDataRequestProgress → getDataFromRequest)
//
//   node data/scripts/01b_fetch_chirps.mjs [siteId ...] [--refresh]
//
// Output: data/processed/<site>/chirps_daily.csv   date, precip_mm
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, selectedSites, writeCSV, sleep, ensureDir, hasFlag, RAW_DIR, PROCESSED_DIR, round } from './lib.mjs';

const API = 'https://climateserv.servirglobal.net/api';
const BOX = 0.05; // half-width in degrees
const CHUNK = 6; // years per request

async function getJSON(url) {
  for (let a = 1; a <= 6; a++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'sowcast-data-pipeline/1.0' }, signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (a === 6) throw e;
      await sleep(2000 * a);
    }
  }
}

async function chirps(site, y0, y1) {
  const cache = path.join(RAW_DIR, 'chirps', `${site.id}_${y0}_${y1}.json`);
  if (fs.existsSync(cache) && !hasFlag('--refresh')) return JSON.parse(fs.readFileSync(cache, 'utf8'));
  const { lat, lon } = site.location;
  const ring = [[lon - BOX, lat - BOX], [lon + BOX, lat - BOX], [lon + BOX, lat + BOX], [lon - BOX, lat + BOX], [lon - BOX, lat - BOX]];
  const params = new URLSearchParams({
    datatype: '0', // CHIRPS
    begintime: `01/01/${y0}`, endtime: `12/31/${y1}`,
    intervaltype: '0', // daily
    operationtype: '5', // average over the box
    geometry: JSON.stringify({ type: 'Polygon', coordinates: [ring.map(([x, y]) => [round(x, 4), round(y, 4)])] }),
  });
  const [id] = await getJSON(`${API}/submitDataRequest/?${params}`);
  for (let i = 0; ; i++) {
    const [p] = await getJSON(`${API}/getDataRequestProgress/?id=${id}`);
    if (p >= 100) break;
    if (p < 0) throw new Error(`ClimateSERV job ${id} failed`);
    if (i > 200) throw new Error(`ClimateSERV job ${id} timed out`);
    await sleep(3000);
  }
  const json = await getJSON(`${API}/getDataFromRequest/?id=${id}`);
  ensureDir(path.dirname(cache));
  fs.writeFileSync(cache, JSON.stringify(json));
  return json;
}

const cfg = loadConfig();
const { start_year, end_year } = cfg.period;
for (const site of selectedSites(cfg)) {
  console.log(`\n▶ CHIRPS ${site.id}`);
  const rows = [];
  for (let y0 = start_year; y0 <= end_year; y0 += CHUNK) {
    const y1 = Math.min(end_year, y0 + CHUNK - 1);
    const json = await chirps(site, y0, y1);
    for (const d of json.data ?? []) {
      const v = d.value?.avg;
      rows.push({
        date: `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`,
        precip_mm: v === null || v === undefined || v < 0 ? null : round(v, 2),
      });
    }
    console.log(`  · ${y0}-${y1}: ${json.data?.length ?? 0} days`);
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  writeCSV(path.join(PROCESSED_DIR, site.id, 'chirps_daily.csv'), rows);
}
