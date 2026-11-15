# Sowcast `data/`: the pipeline behind the app

Everything behind the app's numbers: 31 farming regions in Myanmar, Thailand, Vietnam, Cambodia and Malaysia,
25 crops, daily open data for 2001–2024. No API keys or logins.

```bash
node data/scripts/run_all.mjs        # fetch open data, score crops, project trends, build the app's files (resumable)
npm run data:build                   # only rebuild public/data from what is already fetched and scored
npm run data:status                  # what has been downloaded, per source
npm run skill:sync                   # copy the new data into the Claude skill
```

Node 18+ runs the fetch scripts with no install. Python steps use `data/.venv`:
`python -m venv data/.venv`, then `data/.venv/Scripts/pip install -r data/requirements.txt` (Windows) or
`data/.venv/bin/pip install -r data/requirements.txt`.

## Docs

| File | What it covers |
|---|---|
| [ANALYSIS.md](ANALYSIS.md) | Methods and sources: quality checks, trend tests, 2035 projections, crop re-scoring, consequences, rotation recommender, limits |
| [DATA_DICTIONARY.md](DATA_DICTIONARY.md) | Every file and column |
| [API_CALLS.md](API_CALLS.md) | Each open API we call, how, and its quirks |

## How data flows

```
inputs/            the team's tables (make_data.py → regions, crops, crop fit, rotations; recommender/rec.py)
   │
   ├─ 00_sites_from_inputs.mjs   → config/sites.json (31 sites)
   ├─ 01_fetch_power.mjs         NASA POWER daily weather (temperature elevation-corrected in step 05)
   ├─ 01b_fetch_chirps.mjs       CHIRPS daily rain via ClimateSERV        ← rain source everywhere
   ├─ 01c_fetch_era5.mjs         ERA5 daily temperature via Open-Meteo    ← where POWER has the 2008 break
   ├─ 02b_fetch_ndvi_gibs.py     monthly greenness on cropland (NASA GIBS)
   ├─ 03b_fetch_soil_wcs.py      ISRIC SoilGrids via its map service (the REST API is often down)
   ├─ 03_fetch_soil.mjs          SoilGrids soil profile and topsoil summary
   ├─ 04_fetch_terrain.mjs       NASA SRTM elevation and slope
   ├─ 05_build_summaries.mjs     merge sources, quality check, monthly/annual tables, trends → processed/<site>/
   ├─ 05b_score_measured.py      team scoring rules on measured inputs, crop trends, 2035 projections (lib_projections.py)
   ├─ 05d_recommend_rotations.py team recommender on measured data (6 goals × top 3)
   └─ 06_build_app_data.mjs      → public/data/crops.json, regions/index.json, regions/<id>.json
```

`02_fetch_modis.mjs` (ORNL MODIS series) is optional (`run_all.mjs --with-modis`); it is slow and often down.

Edit `inputs/` (or `make_data.py`), never `public/data`: it is regenerated.

## What is in git

- `inputs/`: the team's source tables and scoring/recommender code.
- `processed/<site>/`: per-region summaries (monthly, annual, trends, projections, soil, terrain, greenness) and
  `processed/scored/`. Small, and enough to rebuild the app files with `05b`, `05d` and `06`.
- Not in git: `raw/` (API response cache) and `processed/*/*_daily.csv` (daily series). Re-run the fetch steps to
  recreate them; everything is cached and resumable.
