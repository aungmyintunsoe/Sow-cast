# Visualizations you can build from this data

Each chart names its **source file** and the **question it answers**. The ⭐ charts map directly onto screens in the app; the rest are for the team's analysis and the pitch.

## For the farmer (app screens)

| # | Chart | File(s) | Question | Notes |
|---|---|---|---|---|
| ⭐ V1 | **Field Year Calendar**: 12 columns, one strip per variable (rain, heat days, frost days, NDVI-green/bare) | `monthly_climatology.csv` | "What does a normal year look like on my field?" | Already a screen in the app. Real NDVI makes the bare strip honest. Colour bare months (`typically_bare`) in soil-brown. |
| ⭐ V2 | **Then vs now** paired bars: first 10 years vs last 10 years | `trends.json` → `first_10y_mean` / `last_10y_mean` | "Is it getting worse?" | Easier for farmers than slopes and p-values. Show only metrics with p < 0.15. |
| ⭐ V3 | **Rain vs thirst** (monthly rain bars + ET0 line, shaded deficit) | `monthly_climatology.csv` (`precip_mm`, `et0_mm`) | "When is my field short of water?" | In the dry season (roughly Dec–Apr) the gap is large almost everywhere; it shows why dry-season crops need irrigation or residual soil moisture. |
| ⭐ V4 | **Water budget bar**: yearly rain vs crop demand (ET0), deficit highlighted; MODIS ET overlaid once fetched | `annual.csv` (`precip_mm`, `et0_mm`, `et_modis_mm`) | "How much water does my field need beyond the rain?" | Replaces the groundwater line (no open groundwater data). Hide it for regions whose weather is flagged (`trends.json → quality.weather`). |
| ⭐ V5 | **Cover vs storms**: monthly NDVI area with heavy-rain-day bars on top | `monthly_climatology.csv` | "Is my soil bare when the big rains hit?" | The core argument for cover crops. |
| ⭐ V6 | **"What if?" sliders** recomputing V3 and the heat-day count | `power_daily.csv` | "What if it's 2 °C hotter / 20% drier?" | Shift `tmax`, scale `precip`, recount heat days and deficit from the daily data. Don't extrapolate trends. |

## For the team (analysis)

| # | Chart | File(s) | Use |
|---|---|---|---|
| V7 | **Annual time series + trend line** (one small multiple per metric) | `all_sites_annual.csv`, `trends.json` | First look at every trend. Annotate the Mann-Kendall p-value. |
| V8 | **NDVI seasonal curve**: 24 years overlaid in grey, mean in colour, p10–p90 band | `modis_ndvi.csv`, `monthly_climatology.csv` | Shows crop calendar, double and triple rice (Mekong and Red River deltas show two or three humps) and drift in green-up dates. |
| V9 | **Heatmap**: year (rows) × month (columns), coloured by anomaly | `monthly_series.csv` | Spot seasonal shifts, e.g. rains arriving later, spring heat creeping earlier. Make one per variable. |
| V10 | **Climograph** (Walter-Lieth: temperature line + rain bars) for 4 sites side by side | `all_sites_monthly_climatology.csv` | Explains in one image why the four regions need different advice. |
| V11 | **Daily distribution shift**: histogram or ridgeline of `tmax_c`, first vs last decade | `power_daily.csv` | Shows that the *tails* are moving (more extreme days), not just the mean. |
| V12 | **Rainfall intensity**: share of annual rain falling on days ≥ 20 mm, per year | `power_daily.csv` | The erosion story for sloping regions (Vietnam Northern Mountains, Shan, Kachin). |
| V13 | **Soil profile**: horizontal bars by depth for clay, SOC and water capacity, with q05–q95 whiskers | `soil_profile.csv` | Displays prediction uncertainty honestly. |
| V14 | **NDVI vs water balance scatter**: one dot per growing season | `annual.csv` | Does drought show up in greenness? A flat cloud in the irrigated deltas means irrigation is buffering it. |
| V15 | **ET/PET ratio over the season** | `modis_et.csv` | Water stress as the plant sees it, including irrigation. |
| V16 | **Land-cover strip**: 24 coloured cells per location, one per year | `landcover_annual.csv` | Shows how stable each location is as cropland. Useful for tree-crop regions, where land cover may read as forest or mosaic. |

## For the pitch

- **V2 + V4 together** make the "what's changing" slide: a real number and a real source for each.
- **V8 for the Mekong Delta** (three rice humps) next to the salinity risk makes the "why rotate here" slide.
- **V10** introduces the four regions.

## Design rules that matter for this audience

- **One message per chart**, written as the title: "Spring is 6 days longer than in 2001", not "frost_free_run_days".
- **Show uncertainty** (bands and whiskers). The app promises to say what it doesn't know.
- Use colour-blind-safe palettes. Keep red or orange for "warning" cards only.
- Put the **source and years** in small text under every chart (e.g. "NASA POWER, 2001–2024"). The app's trust story depends on it.
- Use the existing **Recharts** dependency (`package.json`) for app charts. Python (matplotlib or plotly, both installed in `data/.venv`) works for analysis notebooks.
