// Step 1c — ERA5 daily temperature via the Open-Meteo historical archive API (no key).
// Used where NASA POWER temperature is broken (the 2008 step change found in 8 regions), and as an
// independent cross-check everywhere. ERA5 is ECMWF's reanalysis (~25 km), not a NASA product, and is
// labelled as such in the app.
// API docs: https://open-meteo.com/en/docs/historical-weather-api
//
//   node data/scripts/01c_fetch_era5.mjs [siteId ...] [--refresh]
//
// Output: data/processed/<site>/era5_daily.csv   date, tmax_c, tmin_c, tmean_c, precip_mm, et0_fao_mm
import fs from 'node:fs';
import path from 'node:path';
import { fetchJSON, loadConfig, selectedSites, writeCSV, sleep, RAW_DIR, PROCESSED_DIR } from './lib.mjs';

const cfg = loadConfig();
const { start_year, end_year } = cfg.period;
const VARS = ['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean', 'precipitation_sum', 'et0_fao_evapotranspiration'];

for (const site of selectedSites(cfg)) {
  console.log(`\n▶ ERA5 ${site.id}`);
  const { lat, lon } = site.location;
  const url = 'https://archive-api.open-meteo.com/v1/archive' +
    `?latitude=${lat}&longitude=${lon}&start_date=${start_year}-01-01&end_date=${end_year}-12-31` +
    `&daily=${VARS.join(',')}&timezone=auto`;
  const cacheFile = path.join(RAW_DIR, 'era5', `${site.id}.json`);
  const cached = fs.existsSync(cacheFile);
  const j = await fetchJSON(url, { cacheFile, retries: 6 });
  const d = j.daily;
  writeCSV(path.join(PROCESSED_DIR, site.id, 'era5_daily.csv'), d.time.map((date, i) => ({
    date,
    tmax_c: d.temperature_2m_max[i], tmin_c: d.temperature_2m_min[i], tmean_c: d.temperature_2m_mean[i],
    precip_mm: d.precipitation_sum[i], et0_fao_mm: d.et0_fao_evapotranspiration[i],
  })));
  // Open-Meteo weights requests by size; 24 years of daily data per site needs ~20 s spacing on the free tier.
  if (!cached) await sleep(20_000);
}
