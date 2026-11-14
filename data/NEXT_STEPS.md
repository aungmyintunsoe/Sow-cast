# Next steps — from fetched data to the app's insight cards

Scope: open data only (POWER, MODIS, SoilGrids, SRTM). Analysis runs in Python (`data/.venv`).

## 0. Finish the MODIS fetch (waiting, no effort)

```bash
node data/scripts/02_fetch_modis.mjs --only=ndvi     # most valuable first
node data/scripts/02_fetch_modis.mjs --only=et,lst
node data/scripts/05_build_summaries.mjs             # rebuild tables with MODIS included
```

The ORNL service is unstable, so re-run until `region_climate.json → _provenance.available` is all `true`. Finished pages are cached and never re-downloaded.

## 1. Sanity-check before analysing (½ day, in a notebook)

1. **Plot daily `tmax_c` and `precip_mm`, and 16-day `ndvi_clean`, for each site.** Look for gaps, spikes and flat lines.
2. **Known suspicious signals.** Show these to farmers softly or not at all:
   - **Punjab:** rain 564 → 894 mm and −0.75 °C/decade. The trend survives dropping 2023 (p = 0.0002) and is consistent with documented irrigation cooling. Still, it rests on one source, so word it as "possible", not "proven".
   - **Darling Downs:** 0.9 frost days/yr is almost certainly an under-count (a ~50 km grid misses frosts that form on cold, low ground). Use a `tmin < 2 °C` "frost-risk day" instead, or leave frost off this site.
   - **Nakuru:** 1,388 mm/yr on the Rift escarpment is probably high. Lean on *changes* (heavy-rain days) rather than absolute totals.
3. **Land cover at the locations** (`landcover_annual.csv`): Iowa and Punjab are cropland in all 24 years. Darling Downs is cropland in 9 years and grassland in 15, which is typical for dryland grain with long fallows. Interpret its NDVI as "crop + fallow + pasture".

## 2. Turn data into the four insight cards (core analysis)

Groundwater has no open source, so the four cards become:

| Card | Signal | Suggested rule (tune it) | File |
|---|---|---|---|
| **Bare soil** | low cover during heavy rain | `typically_bare` months overlapping the top-3 `heavy_rain_days` months | `monthly_climatology.csv` |
| **Heat** | more heat at sensitive stages | `heat_days` in flowering months, plus MODIS `lst_day_c` peaks | `annual.csv`, `modis_lst.csv` |
| **Rain pattern** | rain arriving in fewer, heavier bursts or longer gaps | `heavy_rain_days` / `precip_p95_day_mm` / `max_dry_spell_days` trend | `annual.csv`, `trends.json` |
| **Water budget** (replaces groundwater) | crop demand vs rain | yearly `water_balance_mm` deficit, plus MODIS `et_ratio`. If NDVI stays green during a deficit, the field depends on irrigation (Punjab's story). | `monthly_series.csv`, `modis_et.csv` |

Set `confidence` from the evidence:
- `high`: Mann-Kendall p < 0.05 **and** physically consistent across variables (e.g. more rain → wetter soil → greener NDVI)
- `medium`: p < 0.15, or only one variable supports it
- `experimental`: anything resting on a known weak spot (§1.2)

Early signals ready to become cards:
- **Iowa:** longest dry spell 20 → 26 days (p = 0.02).
- **Nakuru:** heavy-rain days 6 → 16 per year on a 15% slope, which is an erosion risk.
- **Darling Downs:** ~1,080 mm/yr deficit, so a dryland system.
- **Punjab:** ~1,040 mm/yr deficit that rain can't cover, so irrigation dependence.

## 3. Crop fit and rotations (replace the fake `crop_fit` / `rotations`)

1. **Crop fit (0–100):** for each crop in `public/data/crops.json`, score how often the site's monthly climatology falls within `temp_min_c`–`temp_max_c` over `season_days`. Then penalise:
   - heat days in the crop's months
   - frost days, scaled by `frost_tolerance`
   - water deficit relative to `water_need`

   This makes `(Local Fit) × (Goal Alignment) − (Irrigation Penalty)` concrete.
2. **Trend:** score the first 10 years and the last 10 years separately, then compare them to get `increasing`/`flat`/`declining`.
3. **Rotations:** for "Current", `cover_by_month` comes from **observed NDVI**. Alternatives use crop calendars. The `erosion` score is bare months × heavy rain × slope.
4. **Backtest:** crops farmers actually grow there should score well. If corn scores poorly in Iowa, fix the formula.

## 4. Ship it into the app

1. Write a merge script that combines `processed/<site>/region_climate.json` with the analysis outputs (`insights`, `rotations`, `crop_fit`) into `public/data/regions/<site>.json`.
2. Update `public/data/regions/index.json` with the coordinates from `config/sites.json`, which are the globe's preset locations.
3. Retire `scripts/make_fake_data.ts`.
4. Update the project README's data-source table (see `context.md`).
