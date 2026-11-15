# Sowcast data analysis: methods, sources and limits

This explains how Sowcast turns open satellite and weather data into the numbers in the app: the measured
climate, the crop scores, the rotation plans and the 2035 projections with their consequences. Every step
is a script in `data/scripts/`, and each one can be re-run on its own.

## 1. Sources (all open, no login)

| What | Source | Resolution / period | Script |
|---|---|---|---|
| Daily rain | **CHIRPS 2.0** via ClimateSERV (UCSB/USAID/NASA SERVIR) | ~5 km, 2001–2024 | `01b_fetch_chirps.mjs` |
| Daily temperature, humidity, radiation | **NASA POWER** (MERRA-2 based) | ~50 km, 2001–2024 | `01_fetch_power.mjs` |
| Daily temperature where POWER is broken | **ERA5** reanalysis via Open-Meteo archive (ECMWF/Copernicus) | ~25 km, 2001–2024 | `01c_fetch_era5.mjs` |
| Plant greenness (NDVI) over cropland | **NASA GIBS** VIIRS/MODIS NDVI tiles | monthly, 2012–2024 | `02b_fetch_ndvi_gibs.py` |
| Soil texture, organic carbon, pH, water holding | **ISRIC SoilGrids 2.0** (REST API, or WCS map service when the API is down) | 250 m, 0–200 cm | `03_fetch_soil.mjs`, `03b_fetch_soil_wcs.py` |
| Elevation and slope | **NASA SRTM** 30 m via OpenTopoData | 30 m | `04_fetch_terrain.mjs` |
| Regions, crops, crop traits, rotations, planting calendar | **Sowcast team tables** (`data/inputs/`, from `make_data.py`) with cited literature (Cornish 2018, Herridge 2019, Vityakon 2007, Toomsan et al., FAO) | 31 regions × 25 crops | — |
| Rotation recommender | **Sowcast team** `data/inputs/recommender/rec.py` | 6 goals × top 3 per region | `05d_recommend_rotations.py` |

## 2. Measured climate per region (`05_build_summaries.mjs`)

- Daily data are aggregated to months and years for 2001–2024.
- **Heat days**: days with a maximum of 35 °C or more. **Downpour days**: days with 20 mm of rain or more.
  **Longest dry spell**: the longest run of days with less than 1 mm of rain.
- **Crop water demand** is reference evapotranspiration (ET0, Hargreaves equation from daily temperature and radiation). **Water balance** is
  rain minus ET0.
- **Elevation correction (POWER temperature).** POWER's ~50 km cell has a single average elevation, so hill
  and valley towns read too warm or too cold (Cameron Highlands: 1,437 m town in a 593 m cell). Temperatures
  are shifted by the standard lapse rate, −6.5 °C per 1,000 m, from the cell elevation to the town's SRTM
  elevation when they differ by 100 m or more. ERA5 via Open-Meteo is already elevation-corrected. Applied
  to 8 regions; the corrected values match the team's literature values (for example Chiang Mai 26.0 °C, Cameron Highlands 18.1 °C).
- **Dry months** follow the FAO length-of-growing-period rule: a month counts as dry when rain is below half of ET0.
- **Quality check (2008 step test).** NASA POWER has a known break around 2008 in parts of mainland
  Southeast Asia. Each series is tested for a sudden jump in rain (ratio) and temperature (°C) at 2008.
  Where POWER fails, rain comes from CHIRPS and temperature from ERA5. Where the merged series still
  fails, weather numbers and projections are **hidden** in the app rather than shown wrong.

## 3. Trend tests

- **Mann-Kendall test** (non-parametric, `pymannkendall`): is there a steady upward or downward change?
  The app uses p < 0.05 as a "clear" change and 0.05–0.15 as a "possible" change. With 24 years of data,
  a p-value in the 0.05–0.15 band is a signal worth watching, not proof.
- **Theil–Sen slope**: the median of all pairwise slopes. It is robust to single extreme years (a strong
  El Niño or La Niña year cannot drag the line the way it drags least squares).

## 4. Projections to 2035 (`lib_projections.py`, run by `05b_score_measured.py`)

For each region with reliable weather and each measure (yearly rain, average temperature, heat days,
downpour days, longest dry spell, water balance, dry months):

1. If the trend is clear or possible (Mann-Kendall p < 0.15), extend the **Theil–Sen line** to 2035.
   Otherwise assume no direction and project the **2001–2024 average** (we do not extrapolate noise).
2. Add an **80% prediction range for a single year**: the residual spread around the line (or around the
   mean), scaled by the t-distribution and widening with distance from the data:
   `half-width = t(0.90, n−2) · s · √(1 + 1/n + (year − mean year)² / Σ(year − mean year)²)`.
   About 1 year in 10 falls below the range and 1 in 10 above it.
3. Physical limits are applied (no negative rain or day counts; dry months stay within 0–12).

**Shown in the app as a projection:** purple, dashed, labelled "Projection", with the range shaded.
**This is statistical extrapolation of observed data, not a climate-model forecast.** It assumes the
2001–2024 direction continues. It does not know about future emissions, El Niño cycles beyond the record,
irrigation changes or land-use change. Treat 2035 values as "if nothing changes", not as a prediction of
what will happen.

## 5. Crop scores, today and in 2035

- **Today:** the team's `score()` rule in `make_data.py` (climate fit, water fit, soil, flood/salt/erosion
  risk, soil benefit) is re-run with the **measured** yearly rain, temperature, dry months, SoilGrids
  texture and SRTM slope in place of the team's draft values. The inputs used are logged in
  `processed/scored/region_inputs_used.csv`.
- **Crop trend 2001–2024:** each crop is re-scored year by year; a Mann-Kendall test on the 24 yearly
  scores labels the crop's fit as improving, declining or steady.
- **2035 if trends continue:** today's inputs shifted by the projected change in rain, temperature and dry
  months, then re-scored with the same rule.
- **A bad year around 2035:** the dry/hot edge of the 80% range (low rain, high temperature, more dry
  months) re-scored the same way. This is the "1 year in 10" stress test.

## 6. Consequences (the "What this means for your farm" cards)

Rule-based, written from the projections above, and only from measures with a clear or possible trend
(except the bad-year card, which comes from year-to-year swings):

| Card | Trigger | Why it matters (agronomy) |
|---|---|---|
| More scorching days | +5 heat days or more by 2035 | Heat at flowering kills pollen; grain and pod set drop in rice, maize and most pulses. Crops listed have an upper temperature limit of 35 °C or less. |
| Warmer on average | +0.2 °C or more | Flags crops whose upper temperature limit is within 2 °C of the projected average. |
| Rain falling / rising | ±5% or more | Crops whose 2035 score falls by 3 points or more are listed. |
| More downpours | +1 downpour day or more | Erosion and fertiliser loss on bare soil. The months named are the 3 lowest-NDVI months with 100 mm+ rain. |
| Longer dry spells | +3 days or more | Failed establishment after false-start rains and stress at flowering. |
| Bigger water gap | water balance −50 mm or more | More irrigation needed. |
| Dry year | always checked | Crops whose water score drops below 0.7 at the low edge of the rain range. |
| Crop shift | crop score −3 or more by 2035 | The crops most affected among the top 10. |

Severity (high, moderate, low) depends on the size of the change. At most 5 cards are shown, most severe first.

## 7. Rotation plans (`05d_recommend_rotations.py`)

The team's recommender (`rec.py`) enumerates every valid 1-, 2- and 3-crop rotation from the 10 best-fitting
crops: no repeated crop back to back, no legume-only sequences, and "avoid after" rules respected. It scores
each rotation on soil health, market value, water fit, weather resilience, cost and labour, and crop match.
It then ranks them for six goals using fixed weights (for example, soil health = 50% soil + 20% crop match + …).
Sowcast runs the same code on the **measured** region values and crop scores. The team's own output, computed
on draft values, is kept in `data/inputs/` and is reproduced exactly when run on those values (checked).

Crop calendars come from the team's planting rule (`make_data.window()`: wet-season crops at the start of
the rains, dry-season crops after them) and each crop's season length. They are approximate.

## 8. Known limits

- **Regions are points**, not fields: each is a town with the farmland around it (CHIRPS ~5 km, ERA5
  ~25 km, SoilGrids sampled up to 6 km away when the town pixel has no soil data).
- **Malaysia (8 regions) and most "auto" regions use the team's general-knowledge draft values** for
  drainage, flood, salinity and irrigation; only rain, temperature, dry months, soil texture and slope are measured.
- **Soil via WCS** gives the mean only (no 5–95% range) and reads the nearest 250 m pixel, so values can
  differ from the REST API by a few percent.
- **Crop and rotation scores are rule-based** and not validated against field trials or yield statistics.
- **24 years is short** for climate trends. A single extreme year near either end can move a trend, which is
  why Theil–Sen and a significance test are used and the range is always shown.

## 9. Reproduce

```
python -m venv data/.venv && data/.venv/Scripts/pip install -r data/requirements.txt
node data/scripts/run_all.mjs            # everything (cached downloads are skipped)
npm run data:status                      # what is downloaded per region
```
