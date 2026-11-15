# Region file fields (`data/regions/<id>.json`)

Read this when a field's meaning is unclear. The authoritative type definitions are in the project's `src/types/index.ts`.

| Field | Meaning | Measured or estimate |
|---|---|---|
| `region` | name, reference town (`place`), country, lat/lon | — |
| `monthly` | 12-month typical year: max/min temperature, rain, crop water demand (`et0_mm`), soil wetness index, greenness (`ndvi`, 0 = bare, 1 = dense crop), heat and downpour days | measured |
| `annual` | one row per year 2001–2024: heat days, rain, downpour days, longest dry spell, water balance | measured |
| `trends` | per metric: first-10-year vs last-10-year mean, change per decade, Mann-Kendall `p` (< 0.05 clear, < 0.15 possible, else no clear change) | measured |
| `data_quality.weather` | `ok` or `suspect`. Suspect = the series still shows a 2008 break; do not quote weather numbers | — |
| `data_quality.sources` | which rain (CHIRPS, NASA POWER, ERA5), temperature and greenness sources were used | — |
| `soil` | texture, organic matter, drainage, water holding (ISRIC SoilGrids), slope and erosion risk (NASA SRTM); `null` if not fetched yet | measured (modelled at 250 m) |
| `priors` | the team's draft values: flood/salinity/irrigation risk (0–3), common crops, evidence, confidence | **estimate** |
| `scoring_inputs` | for rain, temperature, dry months, topsoil, slope: draft value, measured value, which one the crop scores used | both |
| `insights` | up to 3 plain-language findings with `source` and `confidence` (`high`, `medium`, `experimental`) | mixed; check source |
| `rotations` | current + two options: crop sequence (`+` = grown together; `fallow`, `perennial_tree` are not crops), 1–5 scores, why, evidence, benefits, gaps, risks, confidence | rule-based on the team's data |
| `crop_fit` | every crop: fit 0–95, rank, `trend` (`increasing`/`declining`/`flat`/`unknown`, from year-by-year re-scoring), `why`, `limits`, `common_locally` | rule-based on measured inputs where available |
| `sources` | short list of the data sources for this region | — |

## Scores in one paragraph

Crop fit comes from the team's rules in `scripts/make_data.py`: 30% climate, 25% water, 20% soil, 15% risk, 10% benefit, +5 if already grown locally, on a 0–95 scale. The pipeline feeds it measured rain, temperature, dry months, topsoil and slope where they exist. Rotation scores (1–5) are derived from crop traits (organic matter, water need, erosion cover, market, number of crops, cereal–legume break) and are a draft rule.
