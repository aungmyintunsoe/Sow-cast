# API calls — what we call and why

All four services are **open: no API key and no login**. Each was run and verified on 2026-11-14. Raw responses are cached in `data/raw/` (git-ignored), so re-runs don't hit the services again. Pass `--refresh` to force a re-download.

| # | Service | Run by | Script | What we pull |
|---|---|---|---|---|
| 1 | **NASA POWER** Daily Point API | NASA LaRC | `01_fetch_power.mjs` | Daily weather + soil wetness 2001–2024 |
| 2 | **ORNL DAAC MODIS Web Service** | NASA / Oak Ridge | `02_fetch_modis.mjs` | NDVI, land cover, ET, land-surface temperature |
| 3 | **ISRIC SoilGrids 2.0** REST | ISRIC (World Soil Information) | `03_fetch_soil.mjs` | Soil texture, carbon, pH, water retention, 0–200 cm |
| 4 | **OpenTopoData** (NASA SRTM 30 m) | public instance | `04_fetch_terrain.mjs` | Elevation samples → slope for erosion risk |

The app's globe makes no API calls. Location coordinates are fixed in `config/sites.json`.

---

## 1. NASA POWER — `power.larc.nasa.gov`

```
GET https://power.larc.nasa.gov/api/temporal/daily/point
    ?parameters=T2M,T2M_MAX,T2M_MIN,T2MDEW,RH2M,PRECTOTCORR,WS2M,ALLSKY_SFC_SW_DWN,
                GWETTOP,GWETROOT,GWETPROF,EVPTRNS,TS
    &community=AG&latitude={lat}&longitude={lon}
    &start=YYYY0101&end=YYYY1231&format=JSON&time-standard=LST
```

- **Calls:** 4 sites × 4 six-year chunks = **16 requests**, each ~0.5 s. This service is fast and reliable.
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

- **Calls:** ~56 per band per site for 16-day products and ~111 for 8-day products. That is **~1,800 requests** in total, because the service returns at most 10 dates per call.
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

- **Calls:** 1 per site = **4 requests**. Fair use is ~5 requests/minute, so the script waits 13 s between sites.
- Values are returned as integers. Divide by `unit_measure.d_factor`, which the script does.
- **Gotcha:** it returns `null` over towns. This was one reason to move the locations onto farmland.

## 4. OpenTopoData SRTM — `api.opentopodata.org`

```
GET https://api.opentopodata.org/v1/srtm30m?locations=lat,lon|lat,lon|...   # ≤100 points
```

- **Calls:** 2 per site = **8 requests**. Limits are 1 request/s and 1,000 requests/day.
- It samples a small 3×3 (100 m) and 7×7 (500 m) set of elevations around each location **only to compute slope**. Slope feeds the erosion-risk score; it is not a map.
- **Gotcha:** at 30 m spacing, SRTM's ±5 m noise made flat Punjab read as a 3% slope. 100 m spacing gives 0.35%.

## Out of scope for the demo

Login-only NASA sources (SMAP, GPM IMERG, ECOSTRESS, GRACE-FO, Landsat/HLS) and USDA SSURGO are not used. `context.md` shows what replaces each one.
