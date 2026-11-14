# Next steps — from fetched data to the app's insight cards

The infrastructure stage is done when every row in `region_climate.json → _provenance.available` is `true`. After that, the work moves from *getting* data to *deciding what it means for a farmer*.

## 0. Finish the fetch (≈ 1–3 h of waiting, no effort)

```bash
node data/scripts/02_fetch_modis.mjs --only=ndvi,landcover   # most valuable first
node data/scripts/02_fetch_modis.mjs --only=et,lst            # then the rest
node data/scripts/06_build_summaries.mjs                      # rebuild tables with MODIS included
```

Re-running is safe: finished pages come from `data/raw/` cache.

## 1. Sanity-check before analysing (½ day)

1. **Plot daily `tmax_c`, `precip_mm` and `ndvi_clean` for each site** and look for gaps, spikes and flat lines. See chart V1 in `VISUALIZATIONS.md`.
2. **Cross-check rain against a local source** for at least one site (see `resources.txt` §B). POWER's ~50 km grid is a known weak spot. We already see two suspicious signals:
   - **Punjab:** +242 mm/decade of rain and −0.75 °C/decade (p < 0.001). Irrigation cooling in NW India is documented, but this is the strongest claim in the dataset. Confirm it with GPM IMERG and IMD data before any farmer sees it. Also re-run the trend without 2023 (flood year): it should survive.
   - **Darling Downs:** 0.9 frost days/yr. The region is known for regular winter frosts, and grid-mean minimum temperature misses frosts that form on cold, low ground. Check against SILO station data, or use a `tmin < 2 °C` "frost-risk day" instead.
   - **Nakuru:** 1,388 mm/yr on the Rift escarpment is probably high. Check against CHIRPS.
3. **Confirm the field points.** Open each `field` lat/lon from `config/sites.json` in Google Maps satellite view and make sure it is a farm field.

## 2. Fill the login-only gaps (needs one free NASA Earthdata account)

| Gap | How | Effort |
|---|---|---|
| SMAP soil moisture, ECOSTRESS heat, HLS 30 m NDVI | `node data/scripts/earthdata/appeears_point_request.mjs` (script ready) | 10 min plus ~1 h server queue |
| GPM IMERG daily rain | Giovanni time-series (web UI, export CSV) or OPeNDAP. Variable: `GPM_3IMERGDF v07 precipitation` | 30 min per site via UI |
| **GRACE-FO groundwater** | Download the JPL mascon NetCDF (`TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4`, one ~100 MB file) from PO.DAAC, then in Python: `xr.open_dataset(f).lwe_thickness.sel(lat=…, lon=…, method="nearest")` | 1 h. **This is the only source for the "Groundwater decline" card and `trends.groundwater`.** |

## 3. Turn data into the four insight cards (core analysis)

The app shows four plain-English cards (`PlainInsight`). Define each as a **rule over the processed tables**, so every card is traceable to numbers:

| Card | Signal | Suggested rule (tune it) | File |
|---|---|---|---|
| **Bare soil** | months with low cover during heavy rain | `typically_bare` months that overlap the top-3 `heavy_rain_days` months | `monthly_climatology.csv` |
| **Heat** | more heat at sensitive stages | `heat_days` trend p < 0.1 **and** heat days fall within the crop's flowering months | `annual.csv`, `trends.json` |
| **Water** | demand outpacing supply | `water_balance_mm` deficit in growing months, `max_dry_spell_days` trend, `et_ratio` < 0.5 | `monthly_series.csv`, `modis_et.csv` |
| **Groundwater** | aquifer drawdown | GRACE-FO slope in cm/yr, labelled `rapidly declining` (< −2), `declining` (< −0.5), `stable` or `recharging` | needs §2 |

Set `confidence` from the evidence:
- `high`: Mann-Kendall p < 0.05 **and** two sources agree
- `medium`: p < 0.15, or only one source
- `experimental`: ECOSTRESS or other short records

Early signals worth turning into cards:
- **Iowa:** longest dry spell up from 20 to 26 days (p = 0.02). Frost-free season up 7 days per decade (p = 0.03).
- **Nakuru:** heavy-rain days 6 → 16 per year, and the wettest 5% of days got 50% heavier (p < 0.02). That is an erosion risk on a 15% slope.
- **Darling Downs:** about 1,080 mm/yr water deficit (ET0 ≫ rain), so this is a dryland system.
- **Punjab:** about 1,040 mm/yr deficit covered by irrigation, which makes the groundwater card essential.

## 4. Crop fit and rotations (replace the fake `crop_fit` / `rotations`)

1. **Crop fit (0–100):** for each crop in `public/data/crops.json`, score how often the site's monthly climatology falls inside `temp_min_c`–`temp_max_c` across `season_days`. Then penalise:
   - heat days in the crop's months
   - frost days, scaled by `frost_tolerance`
   - water deficit in the crop's months relative to `water_need`

   This makes the README formula concrete: `(Local Fit) × (Goal Alignment) − (Irrigation Penalty)`.
2. **Trend (`increasing`/`flat`/`declining`):** score the first 10 years and the last 10 years separately and compare.
3. **Rotations:** `cover_by_month` should come from **observed NDVI** for "Current" and from crop calendars for the alternatives. The `erosion` score is bare months × heavy rain × slope.
4. **Backtest:** does the fit score rank the crops farmers actually grow there highly? If it says corn is a poor fit in Iowa, the formula is wrong. See `resources.txt` §C for yield and crop-calendar data.

## 5. Ship it into the app

Merge `processed/<site>/region_climate.json` into `public/data/regions/<site>.json`, keeping the analysis outputs (`insights`, `rotations`, `crop_fit`) from steps 3–4. Do it with a small script rather than by hand, so the app can be regenerated whenever data is refreshed. `scripts/make_fake_data.ts` then becomes obsolete.
