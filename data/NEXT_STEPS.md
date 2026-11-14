# Plan: what to do with the data, and what to collect next

*Updated 2026-11-14, after switching to the team's 23 regions in Myanmar, Thailand, Vietnam and Cambodia.*

## Where things stand

```
data/inputs/  (team draft: make_data.py → 4 CSVs + xlsx)        data/scripts/ (open APIs, no logins)
  sowcast_regions.csv   23 regions, draft climate/soil/risk        01 NASA POWER weather 2001-2024  ✅ 23/23
  sowcast_crops.csv     21 crops, traits 1-5                       03 SoilGrids soil                ⏳ running
  sowcast_region_crop_fit.csv  483 rule-based scores               04 SRTM slope                    ✅ 23/23
  sowcast_rotations.csv  69 options (current + 2 alternatives)     02 MODIS greenness               ⏸ not run (slow)
                 │                                                 05 summaries + weather check     ✅
                 └──────────────┬──────────────────────────────────────────────┘
                     06_build_app_data.mjs  →  public/data (what the app shows)   ✅
```

Rebuild everything with `node data/scripts/run_all.mjs`, or just the app files with `npm run data:build`.

### What the measured data already told us

1. **NASA POWER weather is broken for 8 of 23 regions.** These are all 6 in Myanmar, plus Central Highlands (Vietnam) and Plateau and Mountains (Cambodia). Around 2008, yearly rain jumps 2–10 times and mean temperature drops 0.4–1.9 °C at the same moment. That is a change in the model's inputs, not real weather. `05_build_summaries.mjs` detects it automatically, and the app hides all weather numbers for those regions and says why.
2. **For the other 15 regions, your draft rain mostly holds up.** It is within 15% of measured for 11 of them. The four big gaps:

   | Region | Draft rain | POWER rain | Likely right |
   |---|---|---|---|
   | South Central Coast (Ninh Thuan) | 700 mm | 1,478 mm | **Draft.** Ninh Thuan is Vietnam's driest pocket; POWER's ~50 km grid smears in wetter surroundings. |
   | Tonle Sap Plain | 1,400 | 1,881 | Check with CHIRPS |
   | South (Thailand) | 1,800 | 2,383 | Check with CHIRPS |
   | Southeast (Vietnam) | 1,800 | 1,327 | Check with CHIRPS |

   Temperature agrees within 1 °C, except North Thailand (draft 26 °C vs 23.2 °C measured; the grid cell includes the hills around Chiang Mai).
3. **The reference points are town centres.** SoilGrids has no data inside towns, so soil is sampled 3–6 km out when needed (the app says so). Satellite greenness at a town point would show rooftops.
4. **The evidence base is thin, and the app now shows that.** Only 2 of 23 regions and 6 of 69 rotations are backed by literature; the rest are "general knowledge – verify". The app labels each one.

---

## Part A — What to do with the data you provided

| # | Task | Why | How | Effort |
|---|---|---|---|---|
| A1 | **Keep `make_data.py` as the single source** for regions, crops and rotations | One place to edit; the CSVs are regenerated from it | Edit it, run `python data/inputs/make_data.py`, then `npm run data:build`. It now writes next to itself and reproduces the CSVs exactly. | — |
| A2 | **Replace draft climate with measured climate** where the weather check passes | The crop-fit score uses `rain_mm_approx` and `mean_temp_c_approx`. Measured values make the ranking defensible. | Write `data/processed/region_climate_measured.csv` (POWER means for the 15 good regions) and have `make_data.py` prefer it over the draft values. Keep the draft for the 8 flagged regions until CHIRPS is in (B1), and keep it for Ninh Thuan. | ½ day |
| A3 | **Compare draft soil with SoilGrids and SRTM** | Draft `soil_texture`, `drainage` and `slope_pct` drive the soil part of the fit score | Once step 03 finishes, tabulate draft vs measured per region and agree which to use. Watch for clay deltas where SoilGrids can be off. | ½ day |
| A4 | **Compute the crop-fit trend** (currently `tbd`) | The app's "improving / facing stress" badges need it | Run `make_data.py`'s `score()` once per year with that year's rain and temperature, then apply the Mann-Kendall test to the yearly fit (as in `trends.json`). Only for weather-OK regions. | 1 day (Python) |
| A5 | **Turn rotation scores into a documented rule** | The 1–5 scores in the app are derived from crop traits by `06_build_app_data.mjs` (organic matter, water need, erosion cover, market, number of crops, cereal–legume break) | Review those rules with whoever owns agronomy, or move them into `make_data.py` so all scoring lives in one place | ½ day |
| A6 | **Verify the 63 "general knowledge" rotations**, starting with the regions you will demo | They are labelled "Not yet verified" in the app | One cited source per current pattern (FAO country briefs, national extension guides). Put it in `source_or_basis`, and the app shows it as evidence automatically. | ongoing |
| A7 | **Decide what tree-crop regions show** (Tanintharyi, Thailand South, East, Central Highlands) | Rotation advice doesn't fit rubber and oil palm | Either keep the intercrop and cover-crop framing already in the data, or mark them "not a rotation region" in the app | decision |

**Suggestion for the demo:** feature **Northeast (Isan)**. It has literature-backed regions and rotations, weather that passes the check, and a clear story (cassava monoculture on sandy soil, with legume and green-manure alternatives). The **Mekong Delta** is a good second (salinity story, weather OK). The **Central Dry Zone** is also literature-backed, but its weather is flagged until B1 is done.

---

## Part B — Data still to collect (all free, no login)

| Priority | Data | Fixes | Source | How |
|---|---|---|---|---|
| **B1 — high** | **CHIRPS v3 rainfall** (satellite + gauges, ~5 km, 1981–now) | The 8 broken regions; rain accuracy everywhere; Ninh Thuan dry pocket | `data.chc.ucsb.edu/products/CHIRPS/v3.0/` (monthly and daily, Cloud-Optimized GeoTIFF; checked reachable 2026-11-14) | Python + `rasterio` reads one pixel per file over HTTP, without downloading whole files. New script `07_fetch_chirps.py` writes `processed/<site>/chirps_monthly.csv`; summaries prefer CHIRPS rain where available. |
| **B2 — high** | **Temperature cross-check (ERA5)** | Temperature for the 8 broken regions | Open-Meteo archive API (keyless; checked) | One request per site, 2001–2024 daily max/min. Not NASA, so label it as such in the app. |
| **B3 — high** | **Crop calendars** (sowing and harvest month per crop per region) | Ground cover by month, bare-soil months, season-window scoring, "plant now" advice | FAO GIEWS country briefs, USDA FAS IPAD crop calendars, GEOGLAM, national agriculture ministries | A new CSV `inputs/sowcast_crop_calendar.csv` (`region_id, crop_id, sow_month, harvest_month`). The builder then fills `cover_by_month` automatically. Start with Isan and the Mekong Delta. |
| B4 — medium | **Cropland reference points** | Soil and greenness at real farms, not towns | MODIS land cover via ORNL (the earlier verify script did this; it is in git history) | Add `field_lat` / `field_lon` columns to `sowcast_regions.csv`. Keep the town for display. |
| B5 — medium | **Greenness time series (MODIS NDVI)** | Bare-soil months, green-up dates, "plant cover" line in the app | Already scripted (`02_fetch_modis.mjs --only=ndvi`) | About 112 requests per region on a slow service. To make it manageable: run after B4, limit to 2016–2024, and run overnight. |
| B6 — medium | **Flood frequency** | Replaces draft `flood_risk_0_3` | JRC Global Surface Water (open) | Share of years each area is under water, near each point |
| B7 — medium | **Salinity intrusion** | Replaces draft `salinity_risk_0_3` (Mekong, Ayeyarwady, Rakhine, Kampot) | Mekong River Commission reports; Vietnam SIWRR bulletins | Manual: one value per region with a citation |
| B8 — low | **Irrigation access** | Replaces draft `irrigation_access_0_3` | FAO GMIA / AQUASTAT irrigated-area map | Percentage of land irrigated near each point |
| B9 — low | **Yields, area and prices** | Market score, and checking that crops farmers really grow score well | FAOSTAT (bulk CSV); Thailand OAE, Vietnam GSO, Myanmar MOALI, Cambodia MAFF | Backtest: is each region's "common" crop in its top 5? (Rice in Isan currently ranks 9th, so worth a look.) |
| — | Groundwater (GRACE-FO) | — | Dropped: needs an Earthdata login | — |

---

## Part C — Suggested order

1. **Now (today):** let the soil fetch finish (step 03 is rate-limited, about an hour) and run `npm run data:build`. Do A3, and decide the tree-crop question (A7).
2. **Next 2–3 days:** B1 (CHIRPS), then A2 (measured climate into the fit score). The 8 flagged regions get weather back and every ranking rests on measured climate. Do B3 for the two demo regions.
3. **Then:** B4 and B5 (cropland points, then greenness), A4 (fit trends), A5 (agree the scoring rules).
4. **Before the demo:** an agronomist or extension-staff read-through of the insight wording and the top rotations (A6), and a backtest (B9).

## What changes in the app as each piece lands

| When this is done | The app shows |
|---|---|
| B1 + B2 | Weather cards and charts for the 8 currently hidden regions |
| A2 | Crop rankings based on measured climate (the Crops page updates automatically) |
| B3 | Ground cover strips on the Rotations page, and "bare months" on the Brief |
| B5 | A plant-cover line on the monthly chart, and real bare-soil counts |
| A4 | "Improving fit" / "Facing stress" badges on the Crops page |
