# API calls — what we call and why

All services are **open: no API key and no login**. Each was run and verified on 2026-11-14. Raw responses are cached in `data/raw/` (git-ignored), so re-runs don't hit the services again. Pass `--refresh` to force a re-download.

| # | Service | Run by | Script | What we pull |
|---|---|---|---|---|
| 1 | **NASA POWER** Daily Point API | NASA LaRC | `01_fetch_power.mjs` | Daily weather + soil wetness 2001–2024 |
| 2 | **ORNL DAAC MODIS Web Service** | NASA / Oak Ridge | `02_fetch_modis.mjs` | NDVI, land cover, ET, land-surface temperature |
| 3 | **ISRIC SoilGrids 2.0** REST | ISRIC (World Soil Information) | `03_fetch_soil.mjs` | Soil texture, carbon, pH, water retention, 0–200 cm |
| 4 | **OpenTopoData** (NASA SRTM 30 m) | public instance | `04_fetch_terrain.mjs` | Elevation samples → slope for erosion risk |
| 5 | **SERVIR ClimateSERV** (CHIRPS) | NASA/USAID SERVIR | `01b_fetch_chirps.mjs` | Daily rain 2001–2024, averaged over a 0.1° box — **the rain source for every region** |
| 6 | **Open-Meteo archive** (ERA5) | Open-Meteo / ECMWF data | `01c_fetch_era5.mjs` | Daily temperature 2001–2024 — used where POWER is broken |
| 7 | **NASA GIBS** tiles (decoded) | NASA ESDIS | `02b_fetch_ndvi_gibs.py` | Monthly VIIRS NDVI 2012–2024 on cropland pixels (MODIS land-cover mask) |

**Calls the app itself makes in the browser** (the map's layer dropdown; all keyless, defined in `src/components/mapLayers.ts`):

| Layer | Source (GIBS layer id) | Max zoom |
|---|---|---|
| Plant greenness | `MODIS_Terra_NDVI_8Day` | 9 |
| Street map | OpenStreetMap `tile.openstreetmap.org` | 19 |
| Satellite photo | `MODIS_Terra_CorrectedReflectance_TrueColor` | 9 |
| Rainfall | `IMERG_Precipitation_Rate` (GPM IMERG) | 6 |
| Soil moisture | `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture` | 6 |
| Surface heat | `MODIS_Terra_Land_Surface_Temp_Day` | 7 |
| Land cover | `MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual` (2024) | 8 |
| Recent flooding | `MODIS_Combined_Flood_3-Day` | 9 |
| Elevation | `SRTM_Color_Index` | 12 |
| Place names, borders (overlay) | `Reference_Labels`, `Reference_Features` | 9 |

URL pattern: `gibs.earthdata.nasa.gov/wmts/epsg3857/best/<layer>/default/default/GoogleMapsCompatible_Level<n>/{z}/{y}/{x}.png`. Using `default` as the date always serves the newest image; a fixed date breaks after a few months (the old 2024-06-17 NDVI date now returns 404). Legends are GIBS's own SVGs (`gibs.earthdata.nasa.gov/legends/<name>_H.svg`). SMAP and IMERG *map images* need no login, even though their raw data does. `Reference_Labels_15m` returns blank tiles in this region, so the overlay uses the standard `Reference_Labels`. For heavy public traffic, move the OpenStreetMap base to a hosted tile provider (OSM tile usage policy).

---

## 1. NASA POWER — `power.larc.nasa.gov`

```
GET https://power.larc.nasa.gov/api/temporal/daily/point
    ?parameters=T2M,T2M_MAX,T2M_MIN,T2MDEW,RH2M,PRECTOTCORR,WS2M,ALLSKY_SFC_SW_DWN,
                GWETTOP,GWETROOT,GWETPROF,EVPTRNS,TS
    &community=AG&latitude={lat}&longitude={lon}
    &start=YYYY0101&end=YYYY1231&format=JSON&time-standard=LST
```

- **Calls:** 31 regions × 4 six-year chunks = **124 requests**, each ~0.5 s. This service is fast and reliable, but see the 2008 break in 8 regions (`trends.json → quality`).
- **Under the hood:** MERRA-2 reanalysis for weather and soil wetness, and CERES SYN1deg for solar radiation. The grid is about 0.5° × 0.625° (~50 km).
- **Fill value:** `-999` is converted to empty.
- **Gotcha:** `EVPTRNS` is a *model* ET and runs far too low (Punjab ≈ 0.05 mm/day under irrigated wheat). It is kept as `et_model_mm` for reference only. **Use MODIS ET.**

## 2. ORNL DAAC MODIS Web Service — `modis.ornl.gov/rst/api/v1`

```
GET /{product}/dates?latitude=&longitude=                       # list available composites
GET /{product}/subset?latitude=&longitude=&band=&startDate=A2001001&endDate=A2001145
                     &kmAboveBelow=0&kmLeftRight=0             # ≤10 composites per call
```

| Product | Band(s) | Resolution | Scale → unit |
|---|---|---|---|
| MOD13Q1 v061 | `250m_16_days_NDVI`, `250m_16_days_pixel_reliability` | 250 m, 16-day | ×0.0001 → NDVI |
| MCD12Q1 v061 | `LC_Type1` (IGBP classes) | 500 m, yearly | class code |
| MOD16A2GF v061 | `ET_500m`, `PET_500m` | 500 m, 8-day | ×0.1 → mm per 8 days |
| MOD11A2 v061 | `LST_Day_1km` | 1 km, 8-day | ×0.02 − 273.15 → °C |

- **Calls:** ~56 per band per site for 16-day products and ~111 for 8-day products. That is about **440 requests per region (~13,500 for all 31)**, because the service returns at most 10 dates per call, so the pipeline skips it unless you pass `--with-modis`.
- **Gotcha:** the service is **unreliable**. On 2026-11-14 it was slow (15–60 s per call) and often returned `HTTP 502`/`503`. The script runs 3 requests at a time, retries with backoff, caches every page, and skips to the next site after 5 failures. **Just re-run it**; finished pages are never re-downloaded.
- Fetch the most important layer first: `node data/scripts/02_fetch_modis.mjs --only=ndvi`.

## 3. ISRIC SoilGrids 2.0 — `rest.isric.org`

```
GET https://rest.isric.org/soilgrids/v2.0/properties/query
    ?lon=&lat=&property=bdod&property=cec&property=cfvo&property=clay&property=sand&property=silt
     &property=nitrogen&property=phh2o&property=soc&property=wv0033&property=wv1500
     &depth=0-5cm&depth=5-15cm&depth=15-30cm&depth=30-60cm&depth=60-100cm&depth=100-200cm
     &value=mean&value=Q0.05&value=Q0.95
```

- **Calls:** 1 per region, plus up to 16 more when the town point has no data (the script tries 8 points 3 km out, then 8 points 6 km out). Fair use is ~5 requests/minute, so the script waits 13 s between requests; all 31 regions take over an hour; `03b_fetch_soil_wcs.py` reads the same maps through ISRIC's WCS service when the API is down.
- Values are returned as integers. Divide by `unit_measure.d_factor`, which the script does.
- **Gotcha:** it returns `null` over towns. This was one reason to move the locations onto farmland.

## 4. OpenTopoData SRTM — `api.opentopodata.org`

```
GET https://api.opentopodata.org/v1/srtm30m?locations=lat,lon|lat,lon|...   # ≤100 points
```

- **Calls:** 2 per region = **46 requests**. Limits are 1 request/s and 1,000 requests/day.
- It samples a small 3×3 (100 m) and 7×7 (500 m) set of elevations around each location **only to compute slope**. Slope feeds the erosion-risk score; it is not a map.
- **Gotcha:** at 30 m spacing, SRTM's ±5 m noise made flat Punjab read as a 3% slope. 100 m spacing gives 0.35%.

## 5. SERVIR ClimateSERV (CHIRPS) — `climateserv.servirglobal.net/api`

```
GET /submitDataRequest/?datatype=0&begintime=01/01/2001&endtime=12/31/2006&intervaltype=0&operationtype=5
                        &geometry={"type":"Polygon","coordinates":[[...0.1° box around the town...]]}   → ["<job id>"]
GET /getDataRequestProgress/?id=<job id>     → [100.0] when finished
GET /getDataFromRequest/?id=<job id>         → {"data":[{"date":"01/01/2001","value":{"avg":0.0}}, ...]}
```

- `datatype=0` = CHIRPS, `intervaltype=0` = daily, `operationtype=5` = average over the polygon.
- **Calls:** 4 jobs (six-year chunks) × 31 regions = 124 jobs, ~3 min per region in total.
- **Why:** CHIRPS blends satellite rain with gauges at ~5 km. It has no 2008 break: the Ayeyarwady Delta gets a steady 2,500–3,400 mm a year, while POWER said 20–1,100 mm.

## 6. Open-Meteo historical archive (ERA5) — `archive-api.open-meteo.com/v1/archive`

```
GET ?latitude=&longitude=&start_date=2001-01-01&end_date=2024-12-31
    &daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,et0_fao_evapotranspiration&timezone=auto
```

- One request per region. **Gotcha:** the free tier weights requests by size, so 24 years of daily data hits the hourly limit (HTTP 429) after ~15 regions. The script waits 20 s between requests; if it still stops, re-run later (cached regions are skipped).
- ERA5 is ECMWF's reanalysis, not NASA. It is used for temperature only where POWER fails the 2008 step check, and it is labelled in the app.

## 7. NASA GIBS tiles, decoded — `gibs.earthdata.nasa.gov`

- **Greenness:** `VIIRS_SNPP_L3_NDVI_Monthly` tiles at zoom 7 (~1.2 km pixels), one per month 2012–2024. Each pixel colour is converted back to NDVI with GIBS's published colour table (`colormaps/v1.3/MODIS_L3_NDVI.xml`, exact RGB → value in 0.005–0.01 steps).
- **Cropland mask:** `MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual` (2024) tiles at zoom 8, decoded with `MODIS_IGBP_Land_Cover_Type.xml`. Within a 9 × 9 pixel window (~10 km) around the town, only pixels that are mostly cropland (class 12) or cropland mosaic (14) count. If fewer than 3 exist, all land pixels are used (only Vietnam's Northern Mountains).
- **Calls:** ~160 small PNG tiles per region, cached in `data/raw/gibs/`.
- **Why:** the ORNL MODIS service was down (HTTP 502/504) for most of 2026-11-14, and the GIBS route also solves the town-centre problem.

## Out of scope for the demo

Login-only NASA *data downloads* (SMAP, GPM IMERG, ECOSTRESS, GRACE-FO, Landsat/HLS) and USDA SSURGO are not used by the pipeline. SMAP and IMERG appear only as map images (above). `ANALYSIS.md` lists the open sources used instead.
