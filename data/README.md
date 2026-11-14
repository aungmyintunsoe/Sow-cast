# Sowcast `data/` — start here

Real NASA and partner data for the four Sowcast regions, fetched by small Node scripts with no API keys and no installs.

```bash
node data/scripts/run_all.mjs        # everything (resumable — safe to re-run)
node data/scripts/run_all.mjs iowa   # one site
```

Requires Node 18+ (the repo uses Node 24). Results land in `data/processed/`.

## Read in this order

| File | Answers |
|---|---|
| [context.md](context.md) | Where this stage fits, the key findings so far, and the design decisions |
| [API_CALLS.md](API_CALLS.md) | **Which APIs we called**: exact endpoints, parameters, request counts, gotchas |
| [DATA_DICTIONARY.md](DATA_DICTIONARY.md) | **What data you can now fetch**: every file and column, with units |
| [NEXT_STEPS.md](NEXT_STEPS.md) | **What to do next in the analysis**: from data to insight cards, crop fit and rotations |
| [resources.txt](resources.txt) | **Resources still needed**: accounts, ground-truth datasets, people |
| [VISUALIZATIONS.md](VISUALIZATIONS.md) | **Charts you can build**: 17 ideas mapped to files and app screens |
| [ANALYSIS_TIPS.md](ANALYSIS_TIPS.md) | **How to analyse it well**: data caveats, statistics, turning results into farmer insights |

## Folder layout

```
data/
├── config/sites.json          # the 4 sites: app pin + verified cropland field point, period 2001–2024
├── scripts/
│   ├── lib.mjs                # fetch+retry+cache, CSV, stats (OLS, Mann-Kendall)
│   ├── 00_verify_sites.mjs    # MODIS land cover → is the point really cropland? (--fix moves it)
│   ├── 01_fetch_power.mjs     # NASA POWER daily weather + soil wetness
│   ├── 02_fetch_modis.mjs     # MODIS NDVI, land cover, ET, LST (slow; --only=ndvi,...)
│   ├── 03_fetch_soil.mjs      # ISRIC SoilGrids profile + derived soil labels
│   ├── 04_fetch_terrain.mjs   # NASA SRTM elevation + slope
│   ├── 05_check_availability.mjs  # NASA CMR inventory of login-only datasets
│   ├── 06_build_summaries.mjs # monthly / annual / trends / app-shaped JSON
│   ├── run_all.mjs
│   └── earthdata/appeears_point_request.mjs   # SMAP, ECOSTRESS, HLS — needs Earthdata login
├── processed/                 # ✅ committed — analyse from here
│   ├── all_sites_annual.csv, all_sites_monthly_climatology.csv, site_check.csv, data_availability.csv
│   └── <site>/ power_daily.csv, modis_*.csv, soil_*.{csv,json}, terrain.json,
│               monthly_series.csv, monthly_climatology.csv, annual.csv, trends.json, region_climate.json
└── raw/                       # git-ignored API response cache
```

## Status (2026-11-14)

| Source | Status |
|---|---|
| NASA POWER (weather, soil wetness) | ✅ all sites, 2001–2024 |
| SoilGrids (soil) | ✅ all sites |
| SRTM (terrain) | ✅ all sites |
| CMR inventory | ✅ all sites |
| MODIS NDVI / land cover / ET / LST | see `region_climate.json → _provenance.available`. The ORNL service was very slow on the build day, so re-run `02_fetch_modis.mjs`, then `06_build_summaries.mjs`. |
| SMAP, ECOSTRESS, HLS | script ready; needs an Earthdata login |
| GPM IMERG, GRACE-FO | manual steps in `NEXT_STEPS.md` §2 |
