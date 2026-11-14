// Step 4 — Elevation & slope from NASA SRTM 30 m via the public OpenTopoData API (no key).
// Docs: https://www.opentopodata.org/datasets/srtm/  (limits: 100 points/request, 1 request/s, 1000/day)
//
//   node data/scripts/04_fetch_terrain.mjs [siteId ...] [--refresh]
//
// Output: data/processed/<site>/terrain.json
//   - field-scale slope from a 3×3 grid at 100 m spacing (Horn's method). 30 m spacing was tried and
//     rejected: SRTM vertical noise (±5 m) made flat Punjab read as 3% slope.
//   - landscape context from a 7×7 grid at 500 m spacing (relief, mean slope within ~1.5 km)
import fs from 'node:fs';
import path from 'node:path';
import { fetchJSON, loadConfig, selectedSites, writeJSON, sleep, RAW_DIR, PROCESSED_DIR, round, mean } from './lib.mjs';

function grid(lat, lon, n, spacingM) {
  const dLat = spacingM / 111_320;
  const dLon = spacingM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const h = (n - 1) / 2;
  const pts = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) pts.push([round(lat + (h - r) * dLat, 6), round(lon + (c - h) * dLon, 6)]);
  return pts; // row-major, north → south, west → east
}

async function elevations(site, pts, tag) {
  const url = `https://api.opentopodata.org/v1/srtm30m?locations=${pts.map(([a, b]) => `${a},${b}`).join('|')}`;
  const cacheFile = path.join(RAW_DIR, 'terrain', `${site.id}_${tag}.json`);
  const cached = fs.existsSync(cacheFile);
  const j = await fetchJSON(url, { cacheFile });
  if (!cached) await sleep(1100);
  return j.results.map((r) => r.elevation);
}

/** Horn slope (%) for the centre of a 3×3 window z[0..8] with cell size s metres */
function hornSlope(z, s) {
  const [a, b, c, d, , f, g, h, i] = z;
  const dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * s);
  const dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * s);
  return Math.hypot(dzdx, dzdy) * 100;
}

const cfg = loadConfig();
for (const site of selectedSites(cfg)) {
  console.log(`\n▶ SRTM ${site.id}`);
  const { lat, lon } = site.location;
  const local = await elevations(site, grid(lat, lon, 3, 100), 'local100m');
  const ctx = await elevations(site, grid(lat, lon, 7, 500), 'context500m');

  const ctxSlopes = [];
  for (let r = 1; r < 6; r++) for (let c = 1; c < 6; c++) {
    const w = [-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc) => ctx[(r + dr) * 7 + (c + dc)]));
    if (w.every((v) => v !== null)) ctxSlopes.push(hornSlope(w, 500));
  }
  const slopePct = local.every((v) => v !== null) ? hornSlope(local, 100) : null;
  const valid = ctx.filter((v) => v !== null);
  writeJSON(path.join(PROCESSED_DIR, site.id, 'terrain.json'), {
    site: site.id, lat, lon, source: 'NASA SRTM GL1 30 m via OpenTopoData',
    elevation_m: local[4],
    slope_pct_field: round(slopePct, 2),
    slope_pct_landscape_mean: round(mean(ctxSlopes), 2),
    relief_m_within_1500m: valid.length ? Math.max(...valid) - Math.min(...valid) : null,
    erosion_risk_from_slope: slopePct === null ? null : slopePct < 2 ? 'low' : slopePct < 5 ? 'medium' : slopePct < 10 ? 'high' : 'severe',
    caveat: 'SRTM is a surface model (includes trees/buildings) with ~±5 m vertical error; slopes under ~1% are within noise.',
  });
}
