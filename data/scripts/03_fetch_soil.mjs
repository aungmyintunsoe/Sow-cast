// Step 3 — Soil profile from ISRIC SoilGrids 2.0 (global, 250 m, no key).
// Docs: https://rest.isric.org/soilgrids/v2.0/docs  (fair-use limit ≈ 5 requests/min)
// Global alternative to USDA SSURGO (which only covers the USA).
//
//   node data/scripts/03_fetch_soil.mjs [siteId ...] [--refresh]
//
// Outputs: data/processed/<site>/soil_profile.csv (long format, every property × depth)
//          data/processed/<site>/soil_summary.json (0-30 cm topsoil summary + derived labels)
import fs from 'node:fs';
import path from 'node:path';
import { fetchJSON, loadConfig, selectedSites, writeCSV, writeJSON, sleep, RAW_DIR, PROCESSED_DIR, round } from './lib.mjs';

const PROPS = ['bdod', 'cec', 'cfvo', 'clay', 'sand', 'silt', 'nitrogen', 'phh2o', 'soc', 'wv0033', 'wv1500'];
const DEPTHS = ['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm', '100-200cm'];
const VALUES = ['mean', 'Q0.05', 'Q0.95'];
const LABELS = {
  bdod: 'bulk density (kg/dm³)', cec: 'cation exchange capacity (cmol(c)/kg)', cfvo: 'coarse fragments (vol %)',
  clay: 'clay (%)', sand: 'sand (%)', silt: 'silt (%)', nitrogen: 'total nitrogen (g/kg)', phh2o: 'pH in water',
  soc: 'soil organic carbon (g/kg)', wv0033: 'water content at field capacity, 33 kPa (vol %)', wv1500: 'water content at wilting point, 1500 kPa (vol %)',
};

function usdaTexture(sand, silt, clay) {
  if (silt + 1.5 * clay < 15) return 'sand';
  if (silt + 1.5 * clay < 30) return 'loamy sand';
  if ((clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) || (clay < 7 && silt < 50 && silt + 2 * clay >= 30)) return 'sandy loam';
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'loam';
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return 'silt loam';
  if (silt >= 80 && clay < 12) return 'silt';
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return 'sandy clay loam';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'clay loam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'silty clay loam';
  if (clay >= 35 && sand > 45) return 'sandy clay';
  if (clay >= 40 && silt >= 40) return 'silty clay';
  if (clay >= 40 && sand <= 45 && silt < 40) return 'clay';
  return 'loam';
}

const cfg = loadConfig();
const sites = selectedSites(cfg);
for (const [n, site] of sites.entries()) {
  console.log(`\n▶ SoilGrids ${site.id} (${site.location.lat}, ${site.location.lon})`);
  // Reference points are town centres; SoilGrids has no data over towns or water. If the point is empty,
  // try 8 points 3 km away, then 6 km away, and keep the first with data (recorded as sampled_at).
  const candidates = [[0, 0]];
  for (const km of [3, 6]) for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    candidates.push([(km * Math.cos(a)) / 111.32, (km * Math.sin(a)) / (111.32 * Math.cos((site.location.lat * Math.PI) / 180))]);
  }
  let json = null, sampledAt = null, anyFetched = false;
  for (const [i, [dLat, dLon]] of candidates.entries()) {
    const lat = round(site.location.lat + dLat, 4), lon = round(site.location.lon + dLon, 4);
    const cacheFile = path.join(RAW_DIR, 'soil', `${site.id}_${i}.json`);
    if (!fs.existsSync(cacheFile)) {
      if (anyFetched) await sleep(13_000); // respect ~5 req/min fair use
      anyFetched = true;
    }
    const url = 'https://rest.isric.org/soilgrids/v2.0/properties/query' +
      `?lon=${lon}&lat=${lat}` +
      PROPS.map((p) => `&property=${p}`).join('') + DEPTHS.map((d) => `&depth=${d}`).join('') + VALUES.map((v) => `&value=${v}`).join('');
    const j = await fetchJSON(url, { cacheFile, retries: 6 });
    const clay0 = j.properties.layers.find((l) => l.name === 'clay')?.depths[0]?.values.mean;
    if (clay0 !== null && clay0 !== undefined) {
      json = j;
      sampledAt = { lat, lon, km_from_reference: i === 0 ? 0 : i <= 8 ? 3 : 6 };
      if (i > 0) console.log(`  · no data at the town point; using ${lat}, ${lon} (${sampledAt.km_from_reference} km away)`);
      break;
    }
  }
  if (!json) {
    console.warn(`  ⚠ no SoilGrids data within 6 km of ${site.id} — skipped`);
    continue;
  }
  const cached = !anyFetched;

  const rows = [];
  const get = {}; // get[prop][depth] = mean (converted)
  for (const layer of json.properties.layers) {
    const f = layer.unit_measure.d_factor;
    for (const d of layer.depths) {
      const conv = (v) => (v === null || v === undefined ? null : round(v / f, 3));
      (get[layer.name] ??= {})[d.label] = conv(d.values.mean);
      rows.push({
        property: layer.name, description: LABELS[layer.name], depth: d.label,
        top_cm: d.range.top_depth, bottom_cm: d.range.bottom_depth,
        mean: conv(d.values.mean), q05: conv(d.values['Q0.05']), q95: conv(d.values['Q0.95']),
      });
    }
  }
  writeCSV(path.join(PROCESSED_DIR, site.id, 'soil_profile.csv'), rows);

  // ---- derived topsoil summary (depth-weighted 0-30 cm) ----
  const top = [['0-5cm', 5], ['5-15cm', 10], ['15-30cm', 15]];
  const wavg = (p) => {
    const pts = top.filter(([d]) => get[p]?.[d] !== null && get[p]?.[d] !== undefined);
    const w = pts.reduce((s, [, t]) => s + t, 0);
    return w ? pts.reduce((s, [d, t]) => s + get[p][d] * t, 0) / w : null;
  };
  const clay = wavg('clay'), sand = wavg('sand'), silt = wavg('silt'), soc = wavg('soc'), ph = wavg('phh2o');
  const som = soc === null ? null : (soc / 10) * 1.724; // % organic matter (van Bemmelen factor)

  // plant-available water capacity in the top 100 cm (mm)
  const awcLayers = [['0-5cm', 50], ['5-15cm', 100], ['15-30cm', 150], ['30-60cm', 300], ['60-100cm', 400]];
  let awc = 0, awcOk = true;
  for (const [d, mm] of awcLayers) {
    const fc = get.wv0033?.[d], wp = get.wv1500?.[d], cf = get.cfvo?.[d] ?? 0;
    if (fc === null || wp === null || fc === undefined || wp === undefined) { awcOk = false; break; }
    awc += ((fc - wp) / 100) * mm * (1 - cf / 100);
  }

  const texture = clay !== null && sand !== null && silt !== null ? usdaTexture(sand, silt, clay) : null;
  const summary = {
    site: site.id, lat: site.location.lat, lon: site.location.lon, sampled_at: sampledAt, source: 'ISRIC SoilGrids 2.0 (250 m, modelled)',
    topsoil_0_30cm: {
      clay_pct: round(clay, 1), sand_pct: round(sand, 1), silt_pct: round(silt, 1), usda_texture: texture,
      soc_g_kg: round(soc, 1), organic_matter_pct: round(som, 2), ph: round(ph, 2),
      bulk_density_kg_dm3: round(wavg('bdod'), 2), cec_cmol_kg: round(wavg('cec'), 1), nitrogen_g_kg: round(wavg('nitrogen'), 2),
    },
    available_water_capacity_0_100cm_mm: awcOk ? round(awc, 0) : null,
    // labels matching the app's SoilProfile type (src/types/index.ts)
    app_labels: {
      texture,
      organic_matter: som === null ? null : som < 1 ? 'very low' : som < 2 ? 'low' : som < 3 ? 'moderate' : som < 5 ? 'good' : 'high',
      water_holding: !awcOk ? null : awc < 100 ? 'low' : awc < 150 ? 'moderate' : 'high',
      drainage_heuristic: clay === null ? null : clay >= 40 ? 'poor' : clay >= 27 ? 'moderate' : sand >= 70 ? 'excessive' : 'well',
    },
    caveats: [
      'SoilGrids is a machine-learning prediction at 250 m, not a field measurement. Check q05/q95 in soil_profile.csv for uncertainty.',
      'Drainage label is a texture-based heuristic only; slope and water table also matter.',
      'Available water capacity uses SoilGrids wv0033/wv1500, which tend to UNDER-estimate shrink-swell cracking clays (e.g. Darling Downs Vertosols). Validate against local soil surveys before using it in scoring.',
    ],
  };
  writeJSON(path.join(PROCESSED_DIR, site.id, 'soil_summary.json'), summary);
  if (!cached && n < sites.length - 1) await sleep(13_000); // respect ~5 req/min fair use
}
