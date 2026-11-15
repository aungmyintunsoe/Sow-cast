# Region file fields (`data/regions/<id>.json`)

Read this when a field's meaning is unclear. The authoritative type definitions are in the project's `src/types/index.ts`.

| Field | Meaning | Measured or estimate |
|---|---|---|
| `region` | name, reference town (`place`), country, lat/lon | — |
| `monthly` | 12-month typical year: max/min temperature, rain, crop water demand (`et0_mm`), soil wetness index, greenness (`ndvi`, 0 = bare, 1 = dense crop), heat and downpour days | measured |
| `annual` | one row per year 2001–2024: heat days, rain, downpour days, longest dry spell, water balance | measured |
| `trends` | per metric: first-10-year vs last-10-year mean, change per decade, Mann-Kendall `p` (< 0.05 clear, < 0.15 possible, else no clear change) | measured |
| `outlook` | 2001–2024 trends projected to 2035: `series` (baseline, `at_horizon` {mid, lo, hi}, significance), `consequences` (headline, detail, action, crops, severity), `crop_outlook` (crop fit today, 2035 trend, dry/hot year). `null` when weather is not reliable | projection from measured data |
| `data_quality.weather` | `ok` or `suspect`. Suspect = the series still shows a 2008 break; do not quote weather numbers | — |
| `data_quality.sources` | which rain (CHIRPS, NASA POWER, ERA5), temperature and greenness sources were used. POWER temperature is elevation-corrected | — |
| `calendar` | rough wet-season start and end month (team data) and its confidence | **estimate** |
| `soil` | texture, organic matter, drainage, water holding (ISRIC SoilGrids), slope and erosion risk (NASA SRTM) | measured (modelled at 250 m) |
| `priors` | the team's draft values: flood/salinity/irrigation risk (0–3), drainage, common crops, evidence, confidence | **estimate** |
| `scoring_inputs` | for rain, temperature, dry months, topsoil, slope: draft value, measured value, which one the crop scores used | both |
| `insights` | up to 3 plain-language findings with `source` and `confidence` | mixed; check source |
| `plans.current` | what most farmers do now: sequence, 0–100 scores (soil, market, water, resilience, low_cost, suitability), why/evidence, cautions, month calendar | team table + recommender scores |
| `plans.by_goal` | for `balanced`, `soil_health`, `market_income`, `water_saving`, `low_risk`, `low_cost_labour`: the recommender's top 3 rotations with the same fields plus `goal_match` and `change_vs_current` | rule-based, not field-tested |
| `crop_fit` | every crop: fit 0–95, rank, `label`, `trend`, `why`, `limits`, `common_locally`, `planting_window`, `harvest`, `sow_month`, `yield_outlook`, `rotation_tip` | rule-based on measured inputs |
| `sources` | short list of the data sources for this region | — |

`data/crops.json` has each crop's traits (see `crop-table.md`). Sequence steps can combine crops grown together with `+`;
`fallow` and `perennial_tree` are not crops.

## Scores in one paragraph

Crop fit comes from the team's rules in `scripts/make_data.py`: climate, water, soil, risk and benefit parts combined
on a 0–95 scale (+5 if already grown locally), fed with measured rain, temperature, dry months, topsoil and slope.
Rotation plans come from the team's recommender, which enumerates valid 1–3 crop rotations from the best-fitting crops
and ranks them per goal with fixed weights. Both are rules of thumb, not field trials.
