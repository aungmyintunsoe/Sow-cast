# Data dictionary — what you can now fetch

All analysis-ready files live in `data/processed/`. Each site has its own folder: `iowa/`, `punjab/`, `nakuru/` and `darling_downs/`. The period is **2001-01-01 → 2024-12-31** (24 years, 8,766 days).

## Cross-site files (start here)

| File | Rows | What it is |
|---|---|---|
| `all_sites_annual.csv` | 96 (4 × 24) | One row per site-year with every annual metric. **Best file for a first look.** |
| `all_sites_monthly_climatology.csv` | 48 (4 × 12) | The "typical year" for each site. |
| `site_check.csv` | 4 | App pin vs sampled field point, with land cover at each. |
| `data_availability.csv` | 32 | Login-only NASA datasets and how many files cover each field, plus date range. |

## Per-site files

### `power_daily.csv` — NASA POWER, daily ✅

| Column | Unit | Notes |
|---|---|---|
| `tmean_c`, `tmax_c`, `tmin_c` | °C | 2 m air temperature |
| `dewpoint_c`, `rh_pct` | °C, % | humidity |
| `precip_mm` | mm/day | bias-corrected (`PRECTOTCORR`) |
| `wind_ms`, `solar_mj_m2` | m/s, MJ/m²/day | 2 m wind, all-sky shortwave radiation |
| `soil_wet_top` / `soil_wet_root` / `soil_wet_profile` | 0–1 | MERRA-2 soil **wetness** (0 = dry, 1 = saturated) for 0–5 cm, 0–100 cm and the full profile. An index, not volumetric %. |
| `et_model_mm` | mm/day | ⚠ MERRA-2 model ET. Runs low and ignores irrigation. Reference only. |
| `et0_hargreaves_mm` | mm/day | *Derived:* reference evapotranspiration (Hargreaves-Samani, FAO-56 Ra) = crop water **demand** |
| `water_balance_mm` | mm/day | *Derived:* `precip − ET0`. Negative means rain didn't cover demand. |
| `skin_temp_c` | °C | ground-surface temperature |
| `gdd_base10` | °C·day | *Derived:* growing degree days, base 10 °C, cap 30 °C |
| `frost_day` | 0/1 | `tmin < 0 °C` |
| `heat_day` | 0/1 | `tmax ≥ 35 °C` (pollination-damage range for maize and wheat) |
| `heavy_rain_day` | 0/1 | `precip ≥ 20 mm` (ETCCDI "R20mm") |

### `modis_ndvi.csv` — MODIS MOD13Q1, 16-day, 250 m ⏳

| Column | Notes |
|---|---|
| `ndvi` | raw NDVI (−0.2…1). Below 0.3 is bare or sparse, 0.3–0.6 is moderate, above 0.6 is a dense green crop. |
| `reliability` | `good`, `marginal`, `snow/ice`, `cloudy` or `fill` |
| `ndvi_clean` | NDVI only where reliability is good or marginal. **Use this one.** |

### `modis_et.csv` — MODIS MOD16A2GF, 8-day, 500 m ⏳

`et_mm_8day` is actual ET summed over the composite and `pet_mm_8day` is potential ET. `et_ratio = ET/PET`: below ~0.5 the crop is water-limited, near 1 it is unstressed. This product **does** see irrigation, unlike POWER.

### `modis_lst.csv` — MODIS MOD11A2, 8-day, 1 km ⏳

`lst_day_c` is daytime land-surface temperature, the leaf and soil "skin" heat. It runs hotter than air temperature and is the long-record stand-in for ECOSTRESS.

### `landcover_annual.csv` — MODIS MCD12Q1, yearly ⏳

`igbp_class`: 10 = grassland, 12 = cropland, 13 = urban, 14 = cropland/natural mosaic.

### `soil_profile.csv` — SoilGrids, long format ✅

One row per property × depth (11 × 6 = 66 rows), with `mean`, `q05` and `q95` (90% prediction interval). Properties: `bdod` bulk density, `cec`, `cfvo` coarse fragments, `clay`, `sand`, `silt`, `nitrogen`, `phh2o` pH, `soc` organic carbon, `wv0033` field capacity, `wv1500` wilting point.

### `soil_summary.json` ✅

Depth-weighted 0–30 cm topsoil values, USDA texture class, organic matter %, and available water capacity (mm in the top metre). It also includes `app_labels` in the exact vocabulary of the app's `SoilProfile` type.

### `terrain.json` ✅

`elevation_m`, `slope_pct_field` (100 m scale), `slope_pct_landscape_mean` (~1.5 km), `relief_m_within_1500m` and `erosion_risk_from_slope`.

### Built by `06_build_summaries.mjs` ✅

| File | What |
|---|---|
| `monthly_series.csv` | year × month (288 rows): temperature, rain, ET0, water balance, soil wetness, frost/heat/heavy-rain days, GDD, plus NDVI, MODIS ET and LST once fetched |
| `monthly_climatology.csv` | the 12-month typical year. Adds `ndvi_p10`/`ndvi_p90` and `typically_bare` (mean NDVI < 0.3). |
| `annual.csv` | 24 rows: `heat_days`, `frost_days`, `frost_free_run_days`, `precip_mm`, `heavy_rain_days`, `max_dry_spell_days`, `precip_p95_day_mm`, `gdd`, `et0_mm`, `water_balance_mm`, `soil_wet_top_mean`, `ndvi_mean`, `ndvi_peak`, `bare_composite_share`, `et_modis_mm`, `lst_day_max_c`, `growing_season_days` |
| `trends.json` | for every annual metric: OLS slope per decade, first-10-year vs last-10-year means, % change, Mann-Kendall z and p |
| `region_climate.json` | **same shape as `RegionDetail` in `src/types/index.ts`** (`monthly`, `annual`, `trends`, `soil`, `sources`). It can replace the fake values in `public/data/regions/*.json`. `_provenance.available` lists which sources were present when it was built. |

✅ = fetched for all 4 sites. ⏳ = the MODIS download is slow; re-run `02_fetch_modis.mjs` and then `06_build_summaries.mjs` to fill these in. Check `region_climate.json → _provenance.available` to see what made it in.

## How app fields map to real data

| App field (`src/types`) | Now comes from | Still missing |
|---|---|---|
| `monthly.tmax_c / tmin_c / precip_mm` | POWER | — |
| `monthly.soil_moisture` | POWER `GWETTOP` (index) | SMAP volumetric (AppEEARS) |
| `monthly.et_mm` | MODIS ET (falls back to POWER ET0) | — |
| `monthly.ndvi`, `typically_bare` | MODIS NDVI | HLS 30 m for field scale |
| `monthly.frost_days / heat_days / heavy_rain_days` | POWER (derived) | IMERG to cross-check rain |
| `annual.*` | POWER (+ MODIS) | `groundwater_anomaly_cm` → GRACE-FO |
| `trends.*` | `trends.json` | `groundwater` → GRACE-FO |
| `soil.*` | SoilGrids + SRTM | — |
| `insights`, `rotations`, `crop_fit` | **not data — these are the analysis outputs** | see `NEXT_STEPS.md` |
