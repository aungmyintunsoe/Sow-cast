# Graph Report - Sow-cast  (2026-11-15)

## Corpus Check
- 199 files · ~166,902 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 211 file(s) not represented in the graph (top: .csv 204, (none) 3, .lock 1)
- WARNING: 211 of 410 files seen (51%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 474 nodes · 949 edges · 17 communities (14 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.84)
- Token cost: 92,465 input · 0 output

## Community Hubs (Navigation)
- App UI Components
- Data Fetch Scripts
- Python Scoring and Greenness
- Package Dependencies
- Analysis Methods and Docs
- Map and Layers
- App Data Builder
- Pipeline Runner and Skill Sync
- App Shell and Data Hook
- TypeScript Config
- Satellite and Soil Sources
- Team Draft Inputs
- Skill Data Manifest
- Vercel Deploy Config
- Terrain Source

## God Nodes (most connected - your core abstractions)
1. `Card()` - 21 edges
2. `react` - 17 edges
3. `compilerOptions` - 16 edges
4. `lucide-react` - 14 edges
5. `Crop` - 14 edges
6. `fetchJSON()` - 11 edges
7. `main()` - 10 edges
8. `PROCESSED_DIR` - 10 edges
9. `round()` - 10 edges
10. `App()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `No AI-generated text at runtime (rule-based sentences)` --semantically_similar_to--> `Deterministic formula (Local Fit x Goal Alignment - Irrigation Penalty)`  [INFERRED] [semantically similar]
  data/context.md → README.md
- `Deterministic formula (Local Fit x Goal Alignment - Irrigation Penalty)` --semantically_similar_to--> `Crop fit weights (30% climate, 25% water, 20% soil, 15% risk, 10% benefit, +5 local; 0-95)`  [INFERRED] [semantically similar]
  README.md → skill/sowcast-advisor/references/data-model.md
- `Insight rule: number, source, period, confidence` --semantically_similar_to--> `Rules that protect the farmer (quality flag, sources, significance, unverified rotations, never replace agronomist)`  [INFERRED] [semantically similar]
  data/ANALYSIS_TIPS.md → skill/sowcast-advisor/SKILL.md
- `Rules that protect the farmer (quality flag, sources, significance, unverified rotations, never replace agronomist)` --conceptually_related_to--> `Sowcast (project overview)`  [INFERRED]
  skill/sowcast-advisor/SKILL.md → README.md
- `Field Year Calendar` --conceptually_related_to--> `Farmer app charts V1-V6 (Field Year Calendar, Then vs now, Rain vs thirst, Water budget, Cover vs storms, What-if)`  [INFERRED]
  README.md → data/VISUALIZATIONS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Merged weather series: POWER, CHIRPS rain and ERA5 temperature combined to work around the POWER 2008 break** — data_api_calls_nasa_power_api, data_api_calls_climateserv_chirps, data_api_calls_open_meteo_era5, data_data_dictionary_weather_daily_csv, data_next_steps_power_2008_break, data_readme_build_summaries_mjs [EXTRACTED 1.00]
- **Crop scoring: team rules in make_data.py applied to measured inputs by 05b, published by 06, reused by the skill's whatif.py** — data_data_dictionary_make_data_py, data_scripts_05b_score_measured, data_data_dictionary_scored_outputs, data_readme_build_app_data_mjs, skill_sowcast_advisor_scripts_whatif, skill_sowcast_advisor_references_data_model_crop_fit_weights [EXTRACTED 1.00]
- **Trust principles: every claim has source, confidence, significance; no runtime AI** — data_analysis_tips_insight_four_slots, data_visualizations_chart_design_rules, skill_sowcast_advisor_skill_farmer_safety_rules, data_context_no_runtime_ai, readme_deterministic_scoring_formula [INFERRED 0.85]

## Communities (17 total, 3 thin omitted)

### Community 0 - "App UI Components"
Cohesion: 0.06
Nodes (73): recharts@^2.15.1, lucide-react, react, recharts, AXIS_TICK, ClimateCharts(), ClimateChartsProps, COLOR (+65 more)

### Community 1 - "Data Fetch Scripts"
Cohesion: 0.06
Nodes (62): cfg, regions, cfg, PARAMS, cfg, chirps(), getJSON(), cfg (+54 more)

### Community 2 - "Python Scoring and Greenness"
Cohesion: 0.06
Nodes (32): Draft vs measured labelling, make_data.py (team scoring rules / draft generator), processed/scored (05b_score_measured.py outputs), build_fit(), build_rotations(), limits_and_why(), main(), score() (+24 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.05
Nodes (50): dependencies, canvas-confetti@^1.9.4, clsx@^2.1.1, framer-motion@^12.4.7, leaflet@^1.9.4, lucide-react@^1.16.0, react@^18.3.1, react-dom@^18.3.1 (+42 more)

### Community 4 - "Analysis Methods and Docs"
Cohesion: 0.05
Nodes (38): Anomalies vs climatology and monsoon-season analysis, Thresholds: 35 C heat, 20 mm heavy rain, 0.3 bare NDVI, Mann-Kendall + Sen's slope trend testing, App map GIBS layers (mapLayers.ts), SERVIR ClimateSERV (CHIRPS), NASA POWER Daily Point API, Open-Meteo archive (ERA5), Finding: wetter almost everywhere (9 of 15 regions) (+30 more)

### Community 5 - "Map and Layers"
Cohesion: 0.13
Nodes (19): ClickHandler(), CustomPin, FieldMap(), FieldMapProps, FlyTo(), REGION_ICON, SELECTED_ICON, LayerPanel() (+11 more)

### Community 6 - "App Data Builder"
Cohesion: 0.11
Nodes (21): buildInsights(), buildRotations(), clamp15(), cropById, cropName(), cropRows, crops, fitRows (+13 more)

### Community 7 - "Pipeline Runner and Skill Sync"
Cohesion: 0.10
Nodes (15): args, failed, here, passArgs, python, steps, venv, withModis (+7 more)

### Community 8 - "App Shell and Data Hook"
Cohesion: 0.20
Nodes (13): App(), CropFitList, FieldBrief, FieldMap, initialStep(), Loading(), RotationCompare, AppHeader() (+5 more)

### Community 9 - "TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 10 - "Satellite and Soil Sources"
Cohesion: 0.33
Nodes (5): NASA GIBS decoded tiles (VIIRS NDVI + MODIS land-cover cropland mask), ORNL DAAC MODIS Web Service, ISRIC SoilGrids 2.0 REST, ndvi_monthly.csv + ndvi_mask.json, soil_summary.json / soil_profile.csv

### Community 11 - "Team Draft Inputs"
Cohesion: 0.33
Nodes (5): Inputs layer (data/inputs team draft CSVs), sowcast_crops.csv, sowcast_region_crop_fit.csv, sowcast_regions.csv, sowcast_rotations.csv

### Community 12 - "Skill Data Manifest"
Cohesion: 0.50
Nodes (3): coverage, regions, synced

### Community 13 - "Vercel Deploy Config"
Cohesion: 0.50
Nodes (3): buildCommand, outputDirectory, rewrites

## Ambiguous Edges - Review These
- `App map GIBS layers (mapLayers.ts)` → `Scope decisions 2026-11-14 (23 SE Asia regions, open data only, NDVI-only map, Field design)`  [AMBIGUOUS]
  data/API_CALLS.md · relation: conceptually_related_to

## Knowledge Gaps
- **18 isolated node(s):** `RFC-4180`, `Thresholds: 35 C heat, 20 mm heavy rain, 0.3 bare NDVI`, `Anomalies vs climatology and monsoon-season analysis`, `ORNL DAAC MODIS Web Service`, `OpenTopoData SRTM 30 m` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 170 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Data pipeline flow (00 sites -> 01-04 fetch -> 05 summaries -> 05b score -> 06 build app data)` connect `Analysis Methods and Docs` to `Python Scoring and Greenness`, `Pipeline Runner and Skill Sync`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `Thresholds: 35 C heat, 20 mm heavy rain, 0.3 bare NDVI`, `Anomalies vs climatology and monsoon-season analysis` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06007480130902291 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App UI Components` to `App Shell and Data Hook`, `Package Dependencies`, `Map and Layers`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `Data Fetch Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.05981012658227848 - nodes in this community are weakly interconnected._
- **Should `Python Scoring and Greenness` be split into smaller, more focused modules?**
  _Cohesion score 0.05921325051759834 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `App map GIBS layers (mapLayers.ts)` and `Scope decisions 2026-11-14 (23 SE Asia regions, open data only, NDVI-only map, Field design)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._