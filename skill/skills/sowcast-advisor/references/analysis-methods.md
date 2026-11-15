# Analysis methods: turning weather and soil data into farm advice

Contents: 1 Order of work · 2 Climate summaries · 3 The rainy season and sowing · 4 Water · 5 Heat · 6 Trends and projections ·
7 Bad years · 8 Soil · 9 Greenness · 10 Crop fit · 11 Saying how sure you are

`scripts/fetch_climate.py` does sections 2, 4, 5 and 6 for any coordinates. This file explains what the numbers mean and
how to reason when a script is not available or a question goes beyond it.

## 1. Order of work

Locate → check data quality → describe the normal year (month by month) → describe how years differ (bad years) →
describe change (trends) → match crops to the calendar → judge the rotation. Normal year first: most farm decisions
depend on the shape of the season, not on a 0.2 °C trend.

## 2. Climate summaries

- Use at least 20 years (2001–2024 by default). Shorter records confuse one wet or dry year with the climate.
- Monthly climatology: mean rain, ET0, max/min temperature, heat days and downpour days for each calendar month.
- Yearly series: total rain, mean temperature, heat days (Tmax ≥ 35 °C), downpour days (≥ 20 mm), longest dry spell
  (consecutive days < 1 mm), water balance (rain − ET0), dry months.
- Quality first: if a series jumps abruptly at one year (NASA POWER around 2008), it is broken. Compare the means of
  the 7 years before and after; rain ratio far from 1, or a temperature step > 0.5 °C, means use another source.

## 3. The rainy season and sowing

- **Wet (growing) month:** rain ≥ half of ET0 (FAO length-of-growing-period rule). **Dry month:** rain < half of ET0.
  The run of wet months is the rainfed growing season; compare it with each crop's season length.
- **Onset of the rains (when to sow):** a widely used agronomic rule is the first day after a fixed start date
  (e.g. 1 April) on which 3 consecutive days total ≥ 20 mm, with no dry spell of 10+ days in the following 30 days.
  Sowing on a "false start" (big rain then a long dry spell) kills seedlings; dry spells after the first rains are a
  key risk to explain.
- Late-season crops on residual moisture (chickpea, green gram after rice): they need sowing within days of the
  previous harvest; every week of delay loses stored water.

## 4. Water

- Crop water need over its season ≈ the crop's `seasonal_rain_need_mm` (bundled table) or FAO crop coefficients × ET0.
- Usable rain ≈ 85% of rain falling during the crop's months (the rest runs off or drains). Add stored soil moisture
  (~100–150 mm on loams, less on sand) only for a crop sown straight after a wet-season crop.
- Rainfed paddy rice also stores rain from before transplanting behind its bunds.
- Water balance below about −300 mm a year means irrigation or drought-tolerant crops matter; above +300 mm means
  waterlogging and runoff are the bigger risks.

## 5. Heat

- Days ≥ 35 °C during flowering cut grain and pod set in rice (spikelet sterility), maize (pollen death) and most
  pulses. Flowering is roughly 55–75% of the way through the season (later for long-season crops).
- Check the heat days in the expected flowering month, not the yearly total. Shifting sowing by 3–5 weeks often fixes it.
- Night temperature matters too: warm nights (> 25 °C) reduce rice yield and grain quality.

## 6. Trends and projections

- **Mann-Kendall test:** is there a steady rise or fall? p < 0.05 "clear", 0.05–0.15 "possible", above that "no clear
  change". With 24 years, call a possible change a signal to watch, not proof.
- **Theil–Sen slope:** the median of all pairwise slopes; robust to one extreme year. Report per decade.
- **Projection to 2035:** extend the Theil–Sen line only for clear/possible trends; otherwise project the average.
  Add an 80% range for a single year: residual standard deviation × t(0.90, n−2) × √(1 + 1/n + (x − x̄)² / Σ(x − x̄)²).
- Always label projections as "if the 2001–2024 trend continues". It is statistical extrapolation, not a climate model.
  It knows nothing of future emissions, El Niño cycles beyond the record, or land-use change.
- Cross-check rain trends with CHIRPS: ERA5 rain trends in the tropics can point the other way (Khon Kaen: ERA5 shows a
  "possible" rise, CHIRPS shows no clear change).

## 7. Bad years (often more useful than trends)

- Rank the yearly totals: the 20th percentile is a "1 year in 5" dry year; the 10th is "1 in 10".
- Re-check each crop's water at that dry-year rain. A crop that fails 1 year in 5 is a poor bet for a farmer without savings.
- For rotations, the question is "what happens to this plan in a bad year?" A plan with one drought-tolerant crop is
  insurance.

## 8. Soil (SoilGrids 0–30 cm, or the farmer's soil test)

| Measure | Low / poor | What it means for the plan |
|---|---|---|
| Texture: sand, loamy sand | Low water and nutrient holding | Short, drought-tolerant crops; legumes and residue to build organic matter; split fertiliser |
| Texture: clay, poor drainage | Waterlogging | Rice and flood-tolerant crops in the wet season; raised beds for upland crops |
| Organic carbon < 10 g/kg | Low organic matter | Green manure, residue return, legumes; avoid burning |
| pH < 5.5 | Strongly acid | Lime before legumes (nodules fail in acid soil); groundnut needs calcium (gypsum) |
| CEC < 10 cmol/kg | Nutrients leach | Small, frequent fertiliser doses; organic matter |
| Plant-available water < 30 mm (0–30 cm) | Dries fast | Avoid crops that flower late into the dry season |
| Slope > 8% | Erosion | Contour rows, grass strips, permanent cover; avoid long bare periods |

## 9. Greenness (NDVI)

- 0 = bare, 1 = dense green. Over cropland, the monthly NDVI curve shows when fields are planted, peak and bare.
- Bare months that coincide with heavy rain are when topsoil is lost: the strongest argument for a cover or relay crop.
- A second NDVI peak in the dry season means farmers already irrigate or grow a second crop.

## 10. Crop fit

- Quick test for any crop: (1) average temperature over its months inside its range, (2) usable water ≥ its need,
  (3) season fits inside the wet months (or there is irrigation / residual moisture), (4) no flowering in heat,
  (5) tolerates local flood/salt/drought hazards, (6) suits the soil.
- For the 25 table crops, `scripts/whatif.py` reproduces the team's 0–95 fit score and re-scores under changed rain and
  temperature; `scripts/critique_rotation.py` applies the month-by-month tests above to a whole rotation.

## 11. Saying how sure you are

- Measured (CHIRPS, ERA5, SoilGrids, NDVI): "measured/estimated from satellites, 2001–2024".
- Team estimates (flood, salt, irrigation, drainage, Malaysian regions): "estimate, not measured".
- Rule-based scores: "a rule-of-thumb score, not a field trial".
- Projections: "if the trend continues".
- When sources disagree, say so plainly and say which you trust more and why.
