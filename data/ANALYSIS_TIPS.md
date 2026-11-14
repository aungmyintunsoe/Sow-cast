# How to analyse this data — practical tips

## Know what each number really is

1. **POWER is a ~50 km grid cell, not your field.** It is good for the regional climate and for trends, and bad for anything local: frost in low ground, mountain rain, one storm. Darling Downs frost days (0.9/yr) and Nakuru rain (1,388 mm/yr) both look off for this reason. Lean on *changes over time* more than absolute values. For validation, `resources.txt` §C lists free no-login sources.
2. **Reanalysis doesn't know about irrigation.** POWER soil wetness and `et_model_mm` describe a field *without* irrigation. In Punjab the model soil is at its driest in May–June, which is exactly when real fields are being flooded for rice transplanting (from mid-June). Use MODIS ET and NDVI (which see real plants) for "what's actually happening", and POWER for "what the weather is doing to you".
3. **NDVI is one 250 m pixel.** That is about 6 ha, which can be bigger than smallholder fields in Nakuru and Punjab. Read it as the local landscape, not the farmer's plot. For the demo, say "your area" rather than "your field".
4. **SoilGrids is a prediction.** Always look at `q05`/`q95`. Its water capacity for the Darling Downs cracking clay (60 mm) is very likely too low.
5. **"Soil moisture" in the app today is a 0–1 wetness index.** Don't put "%" on it. Call it "soil wetness" and compare months or years, not absolute values.
6. **MODIS LST is surface (skin) temperature, not air temperature.** Bare soil in sun reads 10–20 °C hotter than the air. Use it to compare months, years and locations ("hotter surface than usual"), not against crop air-temperature limits. Use POWER `tmax_c` for those.

## Doing the statistics right

7. **Use Mann-Kendall plus Sen's slope for trends**, not just a linear fit. Climate series are skewed and have outliers (`trends.json` already contains Mann-Kendall). With n = 24, p < 0.05 is solid, p < 0.15 is "possible", and anything above that is "no clear trend". Say exactly that to the farmer.
8. **Test robustness:** drop the most extreme year and re-run. Example: the Punjab rain trend survives dropping the 2023 flood year (p = 0.0002, Sen slope +213 mm/decade). Do this check for every card you ship.
9. **Many metrics × four sites means false positives.** At p < 0.05 you should expect about 1 in 20 "significant" results by chance. Prefer signals that agree across two sources, or that are physically linked (more rain → wetter soil → greener NDVI).
10. **Use anomalies to compare years:** subtract the monthly climatology first (`monthly_series` − `monthly_climatology`). Otherwise the seasonal cycle swamps everything.
11. **Use seasons and water years, not calendar years, in the southern hemisphere.** Darling Downs' summer straddles 31 December. For summer-crop stats use Jul–Jun years. Nakuru has two rainy seasons (long rains Mar–May, short rains Oct–Dec), so analyse them separately.
12. **Clean NDVI before using it.** Use `ndvi_clean` and drop isolated dips (cloud remnants: one composite much lower than its neighbours). Smooth with a Savitzky-Golay filter (window 5) before picking green-up and harvest dates.
13. **Thresholds are choices.** 35 °C heat, 20 mm heavy rain and 0.3 bare NDVI are sensible defaults. Store them in one config and show the farmer the threshold ("days above 35 °C"). Run a sensitivity check (e.g. 32 °C vs 35 °C) to show conclusions don't hinge on one number.

## Turning analysis into the app

14. **Every insight needs a number, a source, a period and a confidence level.** Example: "Heavy-rain days rose from 6 to 16 a year (NASA POWER, 2001–2024, high confidence)." If you can't fill all four slots, don't show the card.
15. **Prefer "then vs now" over slopes.** "26 dry days in a row now vs 20 before" lands better than "+4.4 days/decade".
16. **Rank causes, not data.** A farmer cares about one or two problems. Score each candidate insight by effect size × confidence × relevance to the crops grown, and show the top 4.
17. **Backtest the crop-fit formula against reality.** Crops that farmers successfully grow there should score well. If they don't, fix the formula before tuning anything else.
18. **Keep the pipeline the source of truth.** Don't hand-edit `public/data/regions/*.json`. Change a script and re-run it, so the next data refresh doesn't erase your fixes.

## Workflow suggestion

- Fetching stays in `data/scripts/*.mjs` (Node, no setup).
- Do exploration in **Jupyter notebooks** under `data/notebooks/`: run `data.venvScriptsActivate.ps1`, then `jupyter lab`. Notebooks read only from `data/processed/` and never call the APIs.
- When an analysis result is final, move its logic into a script (e.g. `07_build_insights.mjs` or `.py`) that writes the app's JSON.
- Commit `processed/` so everyone analyses identical numbers. `raw/` stays local.
