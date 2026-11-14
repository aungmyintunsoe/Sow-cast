# Context — the data stage of Sowcast

## Where we are

The prototype app (`src/`) runs on **fake data** from `scripts/make_fake_data.ts`, stored in `public/data/regions/*.json`. This `data/` folder replaces it with a reproducible pipeline that pulls **real NASA and partner data**, needs **no keys or logins**, and shapes the data for analysis and, later, for the app.

**Demo scope decisions (2026-11-14):**
- **No login-only NASA data.** SMAP, GPM IMERG, ECOSTRESS, GRACE-FO and Landsat/HLS are out of scope. Everything here comes from open endpoints.
- **No map APIs.** The app will show a globe with **preset locations** chosen from an accordion menu. The data pipeline makes no map or tile calls.

## The four preset locations

| Location | lat, lon | Note |
|---|---|---|
| Story County, Iowa | 42.10, −93.55 | farmland NE of Ames |
| Ludhiana, Punjab | 30.80, 75.70 | farmland SW of Ludhiana |
| Nakuru, Kenya | −0.27, 35.80 | farmland near Rongai |
| Darling Downs, Qld | −27.5854, 151.5134 | farmland W of Toowoomba |

> **Use these coordinates for the globe pins.** The old app pins (`public/data/regions/index.json`) sat on town centres, where satellite crop and soil data describes rooftops: MODIS land cover said "urban", and SoilGrids returned no data. Each point above was checked to be farmland.

## What the data already says (POWER weather, 2001–2024)

Trends were checked twice: in the Node pipeline and independently with Python `pymannkendall`. The results match.

| Site | Typical year | Strongest change |
|---|---|---|
| **Iowa** | 840 mm rain, 144 frost days, 6 heat days | Longest dry spell 20 → 26 days (p = 0.02). Frost-free season +7 days/decade (p = 0.03). |
| **Punjab** | 715 mm rain, 151 days ≥ 35 °C, ~1,040 mm/yr water deficit | Rain 564 → 894 mm and cooler (p < 0.001). The trend still holds without the 2023 flood year (p = 0.0002), but confirm it with a local source before showing farmers. |
| **Nakuru** | 1,390 mm rain (likely high), no heat or frost days, 15% slope | Heavy-rain days 6 → 16 per year (p = 0.01). Wettest days ~50% heavier (p = 0.003). |
| **Darling Downs** | 580 mm rain, 40 heat days, ~1,080 mm/yr deficit | Frost days falling (p = 0.003), but the counts are tiny and likely under-counted. |

**Consequences of the scope decisions for the app** (the project README's source table needs updating to match):

| README row | Original source | Now |
|---|---|---|
| Heat, frost, rain history | NASA POWER, GPM IMERG | NASA POWER |
| Topsoil moisture | SMAP | POWER soil-wetness index (0–1, modelled) |
| Green vs bare fields | Landsat / MODIS NDVI | MODIS NDVI 250 m |
| Heat stress hotspots | ECOSTRESS | MODIS land-surface temperature, 1 km |
| Groundwater decline | GRACE-FO | **No source.** Replace the card with a water-deficit card (see `NEXT_STEPS.md`). |
| Soil type, slope | USDA SSURGO, SRTM | ISRIC SoilGrids (global), SRTM |

## Design decisions

- **Node, zero dependencies, for fetching.** It runs on the same Node as the app, with no install.
- **Python for analysis** (`data/.venv`, `requirements.txt`). Notebooks read `processed/` only and never call APIs.
- **SoilGrids instead of SSURGO**, so all four countries are treated equally.
- **Raw cache git-ignored; processed tables committed**, so the team analyses identical numbers.
- **Output in the app's own shape** (`region_climate.json` ≈ `RegionDetail`), so integration is a merge.
- **Honesty flags built in:** POWER model ET is renamed `et_model_mm`, SRTM slope uses a 100 m step (30 m was noise), and soil caveats are stored in the JSON.
