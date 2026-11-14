# Sowcast `data/` — start here

Real NASA and partner data for the four Sowcast preset locations. Node scripts fetch it with no API keys or logins. A Python environment is set up for the analysis.

```bash
node data/scripts/run_all.mjs        # fetch + build everything (resumable — safe to re-run)
node data/scripts/run_all.mjs iowa   # one location
```

Python analysis environment (already created at `data/.venv`):

```powershell
data\.venv\Scripts\Activate.ps1
jupyter lab            # notebooks read from data/processed/
```

On a new machine: `python -m venv data/.venv`, then `pip install -r data/requirements.txt`.

## Read in this order

| File | Answers |
|---|---|
| [context.md](context.md) | Where this stage fits, key findings so far, design decisions |
| [API_CALLS.md](API_CALLS.md) | **Which APIs we call**: endpoints, parameters, request counts, gotchas |
| [DATA_DICTIONARY.md](DATA_DICTIONARY.md) | **What data you have**: every file and column, with units |
| [NEXT_STEPS.md](NEXT_STEPS.md) | **What to do next in the analysis** |
| [resources.txt](resources.txt) | **Resources still worth getting** |
| [VISUALIZATIONS.md](VISUALIZATIONS.md) | **Charts you can build**, mapped to files and app screens |
| [ANALYSIS_TIPS.md](ANALYSIS_TIPS.md) | **How to analyse it well** |

## Folder layout

```
data/
├── config/sites.json          # the 4 preset locations (globe menu) + period 2001–2024
├── scripts/                   # Node, zero dependencies
│   ├── lib.mjs                # fetch+retry+cache, CSV, stats (OLS, Mann-Kendall)
│   ├── 01_fetch_power.mjs     # NASA POWER daily weather + soil wetness
│   ├── 02_fetch_modis.mjs     # MODIS NDVI, land cover, ET, LST (slow service; --only=ndvi,...)
│   ├── 03_fetch_soil.mjs      # ISRIC SoilGrids profile + derived soil labels
│   ├── 04_fetch_terrain.mjs   # NASA SRTM elevation → slope (for erosion risk)
│   ├── 05_build_summaries.mjs # monthly / annual / trends / app-shaped JSON
│   └── run_all.mjs
├── requirements.txt           # Python analysis packages
├── processed/                 # ✅ committed — analyse from here
│   ├── all_sites_annual.csv, all_sites_monthly_climatology.csv
│   └── <site>/ power_daily.csv, modis_*.csv, landcover_annual.csv, soil_*.{csv,json}, terrain.json,
│               monthly_series.csv, monthly_climatology.csv, annual.csv, trends.json, region_climate.json
├── raw/                       # git-ignored API cache
└── .venv/                     # git-ignored Python environment
```

## Status

Check `processed/<site>/region_climate.json → _provenance.available` for exactly what is in each site's build.

| Source | Status |
|---|---|
| NASA POWER (weather, soil wetness) | ✅ all sites, 2001–2024 |
| SoilGrids (soil), SRTM (slope) | ✅ all sites |
| MODIS land cover | ✅ all sites |
| MODIS NDVI | ✅ Iowa; other sites resuming (ORNL service unstable — re-run `02_fetch_modis.mjs`) |
| MODIS ET, LST | queued after NDVI |
