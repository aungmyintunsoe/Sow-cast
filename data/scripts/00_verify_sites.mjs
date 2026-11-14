// Step 0 — make sure each site's 'field' point really sits on cropland.
// Uses MODIS MCD12Q1 land cover (IGBP LC_Type1) from the ORNL DAAC MODIS web service (no key).
// IGBP classes: 10 grassland, 12 cropland, 13 urban, 14 cropland/natural mosaic.
//
//   node data/scripts/00_verify_sites.mjs          # report only
//   node data/scripts/00_verify_sites.mjs --fix    # move non-cropland field points to the nearest cropland pixel
import path from 'node:path';
import { fetchJSON, loadConfig, saveConfig, selectedSites, writeCSV, hasFlag, RAW_DIR, PROCESSED_DIR, sinusoidalToLatLon, round } from './lib.mjs';

const ORNL = 'https://modis.ornl.gov/rst/api/v1';
const YEARS = [2019, 2020, 2021, 2022, 2023];
const RADIUS_KM = 5;
const IGBP = { 1: 'evergreen needleleaf', 2: 'evergreen broadleaf', 3: 'deciduous needleleaf', 4: 'deciduous broadleaf', 5: 'mixed forest', 6: 'closed shrubland', 7: 'open shrubland', 8: 'woody savanna', 9: 'savanna', 10: 'grassland', 11: 'wetland', 12: 'cropland', 13: 'urban', 14: 'cropland/natural mosaic', 15: 'snow/ice', 16: 'barren', 17: 'water' };

async function landCoverGrid(site, lat, lon, km, tag) {
  const url = `${ORNL}/MCD12Q1/subset?latitude=${lat}&longitude=${lon}&band=LC_Type1&startDate=A${YEARS[0]}001&endDate=A${YEARS.at(-1)}365&kmAboveBelow=${km}&kmLeftRight=${km}`;
  return fetchJSON(url, { cacheFile: path.join(RAW_DIR, 'landcover', `${site.id}_${tag}_${lat}_${lon}_${km}km.json`) });
}

const cfg = loadConfig();
const rows = [];
for (const site of selectedSites(cfg)) {
  console.log(`\n▶ ${site.id}`);
  const pin = await landCoverGrid(site, site.pin.lat, site.pin.lon, 0, 'pin');
  const pinClasses = pin.subset.map((s) => s.data[0]);

  const g = await landCoverGrid(site, site.field.lat, site.field.lon, RADIUS_KM, 'field');
  const { nrows, ncols, cellsize } = g;
  const xll = Number(g.xllcorner), yll = Number(g.yllcorner);
  const center = Math.floor(nrows / 2) * ncols + Math.floor(ncols / 2);
  const fieldClasses = g.subset.map((s) => s.data[center]);
  const isCrop = (c) => c === 12 || c === 14;
  const fieldOk = fieldClasses.filter(isCrop).length >= Math.ceil(YEARS.length / 2);

  let suggestion = null;
  if (!fieldOk) {
    // nearest pixel that is class 12 in every year (fallback: 12/14 in a majority of years)
    const crc = Math.floor(nrows / 2), ccc = Math.floor(ncols / 2);
    let best = null;
    for (const strict of [true, false]) {
      for (let r = 0; r < nrows; r++) for (let c = 0; c < ncols; c++) {
        const i = r * ncols + c;
        const cls = g.subset.map((s) => s.data[i]);
        const ok = strict ? cls.every((v) => v === 12) : cls.filter(isCrop).length >= Math.ceil(YEARS.length / 2);
        if (!ok) continue;
        const d = Math.hypot(r - crc, c - ccc);
        if (!best || d < best.d) best = { r, c, d };
      }
      if (best) break;
    }
    if (best) {
      const x = xll + (best.c + 0.5) * cellsize;
      const y = yll + (nrows - best.r - 0.5) * cellsize;
      const ll = sinusoidalToLatLon(x, y);
      suggestion = { lat: round(ll.lat, 4), lon: round(ll.lon, 4), km: round((best.d * cellsize) / 1000, 2) };
    }
  }

  const cropShare = g.subset.at(-1).data.filter(isCrop).length / g.subset.at(-1).data.length;
  console.log(`  pin   ${site.pin.lat},${site.pin.lon}: ${pinClasses.map((c) => IGBP[c] ?? c).join(' / ')}`);
  console.log(`  field ${site.field.lat},${site.field.lon}: ${fieldClasses.map((c) => IGBP[c] ?? c).join(' / ')} → ${fieldOk ? 'OK' : 'NOT cropland'}`);
  console.log(`  cropland share within ±${RADIUS_KM} km (${YEARS.at(-1)}): ${(cropShare * 100).toFixed(0)}%`);
  if (suggestion) console.log(`  → nearest cropland pixel: ${suggestion.lat},${suggestion.lon} (${suggestion.km} km away)`);

  if (suggestion && hasFlag('--fix')) {
    site.field_original = site.field_original ?? { ...site.field };
    site.field = { lat: suggestion.lat, lon: suggestion.lon };
    site.note += ` [auto-moved ${suggestion.km} km to nearest MODIS cropland pixel by 00_verify_sites.mjs]`;
    console.log('  ✎ config updated');
  }

  rows.push({
    site: site.id,
    pin_lat: site.pin.lat, pin_lon: site.pin.lon,
    pin_landcover: pinClasses.map((c) => IGBP[c] ?? c).join('|'),
    field_lat: site.field.lat, field_lon: site.field.lon,
    field_landcover: fieldClasses.map((c) => IGBP[c] ?? c).join('|'),
    field_is_cropland: fieldOk || (suggestion && hasFlag('--fix')) ? 'yes' : 'no',
    cropland_share_5km: round(cropShare, 3),
    suggested_lat: suggestion?.lat ?? null, suggested_lon: suggestion?.lon ?? null,
  });
}
if (hasFlag('--fix')) saveConfig(cfg);
writeCSV(path.join(PROCESSED_DIR, 'site_check.csv'), rows);
