# Sowcast `data/` — start here

Everything behind the app's numbers, for 23 farming regions in Myanmar, Thailand, Vietnam and Cambodia.

```bash
node data/scripts/run_all.mjs        # fetch open data + score crops + build the app's files (resumable, no keys)
npm run data:build                   # only rebuild public/data from what is already fetched and scored
python data/inputs/make_data.py      # regenerate the team's draft CSVs after editing them
```

Node 18+ runs the fetch scripts with no install. Python steps use `data/.venv` (`python -m venv data/.venv`, then `pip install -r data/requirements.txt`).

## Read in this order

| File | Answers |
|---|---|
| [NEXT_STEPS.md](NEXT_STEPS.md) | **The plan**: what is done, what to collect next, in what order |
| [context.md](context.md) | Decisions so far and what the data shows |
| [DATA_DICTIONARY.md](DATA_DICTIONARY.md) | Every file and column |
| [API_CALLS.md](API_CALLS.md) | Which open APIs we call (pipeline and app map), and their gotchas |
| [resources.txt](resources.txt) | Sources in use and sources still worth getting |
| [ANALYSIS.md](ANALYSIS.md) | **Methods and sources behind the app:** trend tests, 2035 projections, crop re-scoring, consequences, rotation recommender, limits |
| [VISUALIZATIONS.md](VISUALIZATIONS.md) / [ANALYSIS_TIPS.md](ANALYSIS_TIPS.md) | Charts to build; how to analyse the data well |

## How data flows

```
data/inputs/  team draft data — make_data.py → regions, crops, crop fit, rotations (CSV + xlsx)
      │
      ├─ 00_sites_from_inputs.mjs → config/sites.json (23 sites)
      │     ├─ 01_fetch_power.mjs       NASA POWER daily weather 2001–2024
      │     ├─ 01b_fetch_chirps.mjs     CHIRPS daily rain (ClimateSERV)          ← rain source everywhere
      │     ├─ 01c_fetch_era5.mjs       ERA5 daily temperature (Open-Meteo)       ← where POWER is broken
      │     ├─ 02b_fetch_ndvi_gibs.py   monthly greenness on cropland (NASA GIBS VIIRS NDVI + MODIS land cover)
      │     ├─ 03_fetch_soil.mjs        ISRIC SoilGrids (samples 3–6 km out if the town point is empty)
      │     ├─ 04_fetch_terrain.mjs     NASA SRTM slope
      │     └─ 05_build_summaries.mjs   merge sources + quality check → processed/<site>/
      │
      ├─ 05b_score_measured.py   the team's scoring rules (make_data.py) on measured inputs + per-year trend
      │                          → processed/scored/
      └─ 06_build_app_data.mjs   → public/data/crops.json, regions/index.json, regions/<id>.json
```

Edit `inputs/` (or `make_data.py`), never `public/data`: it is regenerated.

## Status

| Data | Status |
|---|---|
| Team draft data (23 regions, 21 crops, 483 fit scores, 69 rotations) | ✅ `inputs/`, reproducible from `make_data.py` |
| NASA POWER weather | ✅ 23/23. Broken (2008 step change) for 8 regions, where it is replaced automatically |
| CHIRPS rain | see `processed/<site>/chirps_daily.csv`; ClimateSERV takes ~3 min per region |
| ERA5 temperature | see `processed/<site>/era5_daily.csv`; Open-Meteo has an hourly limit, so re-run if it stops |
| Greenness (VIIRS NDVI on cropland, 2012–2024) | ✅ 23/23 |
| SRTM slope | ✅ 23/23 |
| SoilGrids soil | ⏳ slow (rate limit + timeouts). Re-run `03_fetch_soil.mjs` |
| Crop scores from measured data + crop-fit trends | ✅ `processed/scored/` (re-run `05b` after new data) |
| Crop calendars, flood/salinity/irrigation measurements | ❌ to collect (NEXT_STEPS.md Part B) |
