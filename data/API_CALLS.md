# API calls — what we called and why

Every call below was **run and verified on 2026-11-14** unless it is marked *not yet run*. None of them need an API key. Raw responses are cached in `data/raw/` (git-ignored) so re-runs don't hit the services again. Use `--refresh` to force a re-download.

| # | Service | Who runs it | Key? | Script | What we pull |
|---|---|---|---|---|---|
| 1 | **NASA POWER** Daily Point API | NASA LaRC | No | `01_fetch_power.mjs` | Daily weather + soil wetness 2001–2024 |
| 2 | **ORNL DAAC MODIS Web Service** | NASA / Oak Ridge | No | `00_verify_sites.mjs`, `02_fetch_modis.mjs` | NDVI, land cover, ET, land-surface temperature |
| 3 | **ISRIC SoilGrids 2.0** REST | ISRIC (World Soil Information) | No | `03_fetch_soil.mjs` | Soil texture, carbon, pH, water retention, 0–200 cm |
| 4 | **OpenTopoData** (NASA SRTM 30 m) | Public instance of open-source server | No | `04_fetch_terrain.mjs` | Elevation → slope, relief |
| 5 | **NASA CMR** Search API | NASA Earthdata | No | `05_check_availability.mjs` | *Inventory only:* how many SMAP / IMERG / GRACE-FO / ECOSTRESS / HLS files cover each field |
| 6 | **NASA AppEEARS** API | NASA LP DAAC | **Earthdata login** | `earthdata/appeears_point_request.mjs` | SMAP soil moisture, ECOSTRESS LST, HLS 30 m NDVI — *written, not yet run* |

---

## 1. NASA POWER — `power.larc.nasa.gov`

```
GET https://power.larc.nasa.gov/api/temporal/daily/point
    ?parameters=T2M,T2M_MAX,T2M_MIN,T2MDEW,RH2M,PRECTOTCORR,WS2M,ALLSKY_SFC_SW_DWN,
                GWETTOP,GWETROOT,GWETPROF,EVPTRNS,TS
    &community=AG&latitude={lat}&longitude={lon}
    &start=YYYY0101&end=YYYY1231&format=JSON&time-standard=LST
```

- **Calls made:** 4 sites × 4 six-year chunks = **16 requests**, each ~0.5 s.
- **Under the hood:** MERRA-2 reanalysis for weather and soil wetness, and CERES SYN1deg for solar radiation. The grid is about 0.5° × 0.625° (~50 km).
- **Fill value:** `-999` is converted to empty.
- **Gotcha:** `EVPTRNS` is a *model* ET in MJ/m²/day. We convert it ÷ 2.45 to mm, but it runs far too low (Punjab ≈ 0.05 mm/day in April under irrigated wheat). It is kept as `et_model_mm` for reference only. **Use MODIS ET instead.**

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

- **Calls:** ~56 per band per site for 16-day products and ~111 for 8-day products. That is **~1,800 requests** in total, because the service returns at most 10 dates per call.
- **Gotcha:** on 2026-11-14 the service was slow (27–54 s per call) and returned `HTTP 502` above ~3 parallel requests. The script uses 3 at a time, retries with backoff, and caches every page, so **just re-run it to resume**. Use `--only=ndvi` to fetch only what you need first.
- `00_verify_sites.mjs` also pulls a ±5 km land-cover grid around each field to check it is cropland. This is how we found that **all four app pins sit on towns** (see `context.md`).

## 3. ISRIC SoilGrids 2.0 — `rest.isric.org`

```
GET https://rest.isric.org/soilgrids/v2.0/properties/query
    ?lon=&lat=&property=bdod&property=cec&property=cfvo&property=clay&property=sand&property=silt
     &property=nitrogen&property=phh2o&property=soc&property=wv0033&property=wv1500
     &depth=0-5cm&depth=5-15cm&depth=15-30cm&depth=30-60cm&depth=60-100cm&depth=100-200cm
     &value=mean&value=Q0.05&value=Q0.95
```

- **Calls:** 1 per site = **4 requests**. Fair use is ~5 requests/minute, so the script waits 13 s between sites.
- Values are returned as integers. Divide by `unit_measure.d_factor`, which the script does.
- **Gotcha:** it returns `null` over towns. The original Ames, Ludhiana, Nakuru and Toowoomba pins all returned `null`.

## 4. OpenTopoData SRTM — `api.opentopodata.org`

```
GET https://api.opentopodata.org/v1/srtm30m?locations=lat,lon|lat,lon|...   # ≤100 points
```

- **Calls:** 2 per site (a 3×3 grid at 100 m and a 7×7 grid at 500 m) = **8 requests**. Limits are 1 request/s and 1,000 requests/day.
- **Gotcha:** at 30 m spacing, SRTM's ±5 m noise made flat Punjab read as a 3% slope. 100 m spacing gives 0.35%.

## 5. NASA CMR — `cmr.earthdata.nasa.gov`

```
GET https://cmr.earthdata.nasa.gov/search/granules.json
    ?short_name=SPL3SMP_E&version=006&point={lon},{lat}&page_size=1&sort_key=start_date
# total count is in the CMR-Hits response header
```

- **Calls:** 8 collections × 2 (first and last) × 4 sites = **64 requests**. No login is needed to search, only to download.
- **Result:** every login-only dataset in the README's source table covers all four fields. See `processed/data_availability.csv`.

## 6. NASA AppEEARS — `appeears.earthdatacloud.nasa.gov/api` *(not yet run)*

```
POST /login                 (Basic auth: Earthdata user:pass) → token
POST /task                  {"task_type":"point", params:{dates, layers, coordinates}}
GET  /task/{id}             poll until status = "done"
GET  /bundle/{id}           list result files → GET /bundle/{id}/{file_id}
```

Layers requested:
- `SPL4SMGP.008`: `Geophysical_Data_sm_surface` and `Geophysical_Data_sm_rootzone`
- `SPL3SMP_E.006`: `..._AM_soil_moisture` and its quality flag
- `ECO_L2T_LSTE.002`: `LST`, `QC` and `cloud`
- `HLSL30_VI.020` and `HLSS30_VI.020`: `NDVI`

Product and layer names were checked against the public `/api/product` listing. The script still needs a team member's Earthdata account to run it.

## Not called (and why)

| README source | Why it is not wired up yet | Where it goes |
|---|---|---|
| **GPM IMERG** | Daily point extraction needs an Earthdata login (Giovanni or OPeNDAP). AppEEARS does not carry it. | `NEXT_STEPS.md` §2 |
| **GRACE-FO** | Distributed as one global NetCDF grid (login required). Easiest to read with Python `xarray`. | `NEXT_STEPS.md` §2 |
| **USDA SSURGO** | US-only. Replaced by global SoilGrids so all four sites are treated the same. Optional for Iowa. | `resources.txt` |
| **Landsat** (direct) | Covered by HLS (Landsat + Sentinel-2 harmonised) through AppEEARS. | script 6 |
