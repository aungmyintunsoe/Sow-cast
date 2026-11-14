// Step 2 — MODIS time series at each field point via the ORNL DAAC MODIS Web Service (no key).
// Docs: https://modis.ornl.gov/data/modis_webservice.html
// The service returns max 10 composites per request, so we page through the date list.
//
//   node data/scripts/02_fetch_modis.mjs [siteId ...] [--only=ndvi,landcover,et,lst] [--refresh]
//   NOTE: ORNL can be slow (30-50 s/request on busy days). Runs are resumable — just run again.
//
// Outputs (data/processed/<site>/):
//   modis_ndvi.csv       MOD13Q1 250 m 16-day NDVI + pixel reliability
//   modis_lst.csv        MOD11A2 1 km 8-day daytime land-surface temperature
//   modis_et.csv         MOD16A2GF 500 m 8-day actual & potential evapotranspiration (gap-filled)
//   landcover_annual.csv MCD12Q1 500 m yearly IGBP land-cover class
import path from 'node:path';
import { fetchJSON, loadConfig, selectedSites, writeCSV, pool, RAW_DIR, PROCESSED_DIR, round } from './lib.mjs';

const ORNL = 'https://modis.ornl.gov/rst/api/v1';
// ORNL starts returning HTTP 502 above ~3 parallel requests. Bands are fetched one after another,
// so this is the total number of in-flight requests. Every page is cached in data/raw/modis,
// so an interrupted run resumes where it stopped.
const CONCURRENCY = 3;

const cfg = loadConfig();
const { start_year, end_year } = cfg.period;

async function series(site, product, band) {
  const { lat, lon } = site.location;
  const dates = (await fetchJSON(`${ORNL}/${product}/dates?latitude=${lat}&longitude=${lon}`, {
    cacheFile: path.join(RAW_DIR, 'modis', site.id, `${product}_dates.json`),
  })).dates.filter((d) => {
    const y = Number(d.calendar_date.slice(0, 4));
    return y >= start_year && y <= end_year;
  });
  const chunks = [];
  for (let i = 0; i < dates.length; i += 10) chunks.push(dates.slice(i, i + 10));
  const out = await pool(chunks, CONCURRENCY, async (c, i) => {
    const s = c[0].modis_date, e = c.at(-1).modis_date;
    const url = `${ORNL}/${product}/subset?latitude=${lat}&longitude=${lon}&band=${band}&startDate=${s}&endDate=${e}&kmAboveBelow=0&kmLeftRight=0`;
    const j = await fetchJSON(url, { cacheFile: path.join(RAW_DIR, 'modis', site.id, product, band, `${s}_${e}.json`) });
    if ((i + 1) % 20 === 0 || i === chunks.length - 1) console.log(`    ${product}/${band}: ${i + 1}/${chunks.length} pages`);
    return j.subset.map((r) => ({ date: r.calendar_date, value: r.data[0] }));
  });
  return new Map(out.flat().map((r) => [r.date, r.value]));
}

const RELIABILITY = { '-1': 'fill', 0: 'good', 1: 'marginal', 2: 'snow/ice', 3: 'cloudy' };

const PHASES = {
  // --- Vegetation: MOD13Q1 (EVI band 250m_16_days_EVI also exists — add it if NDVI saturates over dense canopy) ---
  async ndvi(site) {
    const ndvi = await series(site, 'MOD13Q1', '250m_16_days_NDVI');
    const rel = await series(site, 'MOD13Q1', '250m_16_days_pixel_reliability');
    const valid = (v) => v !== undefined && v > -3000; // -3000 = fill
    writeCSV(path.join(PROCESSED_DIR, site.id, 'modis_ndvi.csv'), [...ndvi.keys()].sort().map((date) => {
      const n = ndvi.get(date), r = rel.get(date);
      return {
        date, year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)),
        ndvi: valid(n) ? round(n * 0.0001, 4) : null,
        reliability: RELIABILITY[r] ?? r,
        ndvi_clean: valid(n) && (r === 0 || r === 1) ? round(n * 0.0001, 4) : null, // good/marginal pixels only
      };
    }));
  },
  // --- Land cover: MCD12Q1 yearly IGBP class ---
  async landcover(site) {
    const lc = await series(site, 'MCD12Q1', 'LC_Type1');
    writeCSV(path.join(PROCESSED_DIR, site.id, 'landcover_annual.csv'), [...lc.keys()].sort().map((date) => ({
      year: Number(date.slice(0, 4)), igbp_class: lc.get(date),
    })));
  },
  // --- Evapotranspiration: MOD16A2GF (scale 0.1 kg/m² per 8 days; ≥32761 = fill/non-vegetated) ---
  async et(site) {
    const et = await series(site, 'MOD16A2GF', 'ET_500m');
    const pet = await series(site, 'MOD16A2GF', 'PET_500m');
    const etv = (v) => (v !== undefined && v < 32700 ? round(v * 0.1, 2) : null);
    writeCSV(path.join(PROCESSED_DIR, site.id, 'modis_et.csv'), [...et.keys()].sort().map((date) => {
      const a = etv(et.get(date)), p = etv(pet.get(date));
      return {
        date, year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)),
        et_mm_8day: a, pet_mm_8day: p,
        et_ratio: a !== null && p ? round(a / p, 3) : null, // <0.5 ≈ water-limited
      };
    }));
  },
  // --- Land surface temperature: MOD11A2 (scale 0.02 K, 0 = no data). LST_Night_1km also exists (frost). ---
  async lst(site) {
    const lstD = await series(site, 'MOD11A2', 'LST_Day_1km');
    const k2c = (v) => (v && v > 0 ? round(v * 0.02 - 273.15, 2) : null);
    writeCSV(path.join(PROCESSED_DIR, site.id, 'modis_lst.csv'), [...lstD.keys()].sort().map((date) => ({
      date, year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)),
      lst_day_c: k2c(lstD.get(date)),
    })));
  },
};

// Phase-major order: every site gets NDVI before anyone gets LST, so the most useful data lands first
// when the ORNL service is slow. Pick phases with --only=ndvi,landcover (default: all, in this order).
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const phases = onlyArg ? onlyArg.slice(7).split(',') : Object.keys(PHASES);
for (const phase of phases) {
  if (!PHASES[phase]) throw new Error(`unknown phase '${phase}' — use ${Object.keys(PHASES).join(', ')}`);
  for (const site of selectedSites(cfg)) {
    console.log(`\n▶ MODIS ${phase} — ${site.id} (${site.location.lat}, ${site.location.lon})`);
    try {
      await PHASES[phase](site);
    } catch (err) {
      // keep going: cached pages are kept, a re-run resumes from here
      console.error(`  ✗ ${phase}/${site.id} incomplete: ${err.message.split('\n')[0]} — re-run later to resume`);
    }
  }
}
