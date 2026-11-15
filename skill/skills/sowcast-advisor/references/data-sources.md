# Data sources: what to look up, where, and the traps

Contents: 1 Which source for which question · 2 Climate · 3 Soil and land · 4 Crops and calendars · 5 Local, market and pest information · 6 Forecasts · 7 Checking a source

All sources here are free and need no login. When a script can't reach the internet (sandboxed code execution),
fetch the same URLs with a web tool, or fall back to the bundled region data and say so.

## 1. Which source for which question

| Question | First choice | Then |
|---|---|---|
| Rain at a farm, past 20+ years | CHIRPS (`fetch_climate.py --chirps`) | ERA5 rain (default in the script), NASA POWER |
| Temperature, heat days, crop water demand (ET0) | ERA5 via Open-Meteo (`fetch_climate.py`) | NASA POWER (correct for elevation, see below) |
| Soil type, organic matter, pH, water holding | SoilGrids (`fetch_soil.py`) | National soil maps (e.g. Thailand Land Development Department) |
| Is the land cropped, when is it green or bare | NASA GIBS / MODIS NDVI | Sentinel-2 imagery in NASA Worldview or Copernicus Browser |
| When do people plant and harvest here | FAO crop calendar, USDA FAS crop calendars, national extension | The team's planting windows in the bundled data |
| Is a crop suited at all | FAO ECOCROP crop ranges, FAO GAEZ suitability | The bundled crop table (`data/crops.json`) |
| What rotations work locally | National research institutes, IRRI, ICRISAT, CGIAR papers | The bundled rotations (verified ones cite a study) |
| Prices and markets | FAO FPMA price tool, WFP market monitor, national price bulletins | Ask the farmer about local buyers |
| Pests and diseases now | National plant protection department alerts, Plantwise Knowledge Bank, IRRI | Ask the farmer what they saw last season |
| What the coming season looks like | ENSO outlook (NOAA CPC, IRI), ASEAN Specialised Meteorological Centre outlook, national met service | Open-Meteo 16-day forecast for sowing timing |

## 2. Climate

**ERA5 (ECMWF reanalysis) via Open-Meteo** — `https://archive-api.open-meteo.com/v1/archive`
- Daily temperature, rain, ET0 (FAO-56) from 1940; ~25 km, downscaled by Open-Meteo to the point's elevation.
- Strength: consistent, gap-free, elevation-corrected temperature. Weakness: tropical rain is smeared, with too many
  light-rain days and too few downpours, and trends in ERA5 rain can disagree with gauge-based data. Prefer CHIRPS
  for rain and rain trends.
- Rate limit: about 10,000 calls/day; a 429 error means wait. One 24-year request per location is enough.

**CHIRPS 2.0** (Climate Hazards Center, UCSB; satellite + rain gauges) via SERVIR ClimateSERV — `https://climateserv.servirglobal.net/api`
- Daily rain, ~5 km, 1981–present, land between 50°S and 50°N. The best open rain record for smallholder areas.
- The API is a job queue (submit, poll progress, download); a 24-year request takes a few minutes. Average over a small
  box (~0.1°) around the farm rather than one pixel.

**NASA POWER** — `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR&community=AG&latitude=..&longitude=..&start=20010101&end=20241231&format=JSON`
- Daily weather from MERRA-2, ~50 km cells. The JSON's `geometry.coordinates[2]` is the cell's elevation.
- **Trap 1, the 2008 break:** in parts of mainland Southeast Asia (8 of the Sowcast regions) POWER rain jumps several-fold
  and temperature shifts by ~1 °C around 2008. Always compare the mean of 2001–2007 with 2009–2015; a ratio far from 1 is
  a data artefact, not climate change. Use CHIRPS/ERA5 there.
- **Trap 2, elevation:** one cell elevation for 50 km. Hill towns read too warm, valley towns too cold. Correct with the
  lapse rate: `T_site = T_power − 0.0065 × (site_elevation_m − cell_elevation_m)`. Cameron Highlands (1,437 m town in a
  593 m cell) reads 23.6 °C uncorrected and 18.1 °C corrected.

**National met services** (station data, monsoon onset dates): Myanmar Department of Meteorology and Hydrology,
Thai Meteorological Department, Vietnam National Centre for Hydro-Meteorological Forecasting, Cambodia Ministry of Water
Resources and Meteorology, Malaysian Meteorological Department (MetMalaysia). Station records beat gridded data for a
town, but are rarely downloadable; quote their published normals when you find them.

## 3. Soil and land

**ISRIC SoilGrids 2.0** — REST `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=..&lat=..&property=clay&depth=0-5cm&value=mean`;
WCS maps `https://maps.isric.org` (same data; use a window of about 0.1° or more, tiny windows hang).
- 250 m model predictions of clay/sand/silt, organic carbon, pH, CEC, water content at field capacity and wilting point.
- Integers are scaled: clay/sand/silt g/kg (÷10 for %), SOC dg/kg (÷10 for g/kg), pH×10, CEC mmol/kg (÷10 for cmol/kg).
- The REST API is frequently down; `fetch_soil.py` falls back to WCS. Town centres and water bodies have no data: sample
  3–6 km away. Treat it as "typical soil around here", never as a field test; a farmer's own soil test wins.

**NASA GIBS** (imagery, keyless) — WMS `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`
- `MODIS_Terra_L3_NDVI_Monthly` (greenness), `VIIRS_SNPP_CorrectedReflectance_TrueColor` (photo-like). Comparing the
  greenest and barest months shows the cropping season and how long soil lies bare.
- Browse interactively at NASA Worldview: `https://worldview.earthdata.nasa.gov`.

**NASA SRTM elevation and slope** — via OpenTopoData `https://api.opentopodata.org/v1/srtm30m?locations=lat,lon|lat,lon`
(1 request/s). Slope above ~8% means contour planting and permanent cover matter.

## 4. Crops and calendars

- **Bundled crop table** (`data/crops.json`): 25 crops with temperature range, season length, seasonal rain need, drought/
  flood/salt tolerance, family, nitrogen fixing, good-after/avoid-after, inputs, yield ranges and a farmer tip. Read
  `references/crop-notes.md` first.
- **FAO ECOCROP** (search "ECOCROP" + crop name): optimal and absolute temperature, rainfall, pH and soil ranges for
  thousands of crops. Use it to build a profile for any crop the table lacks.
- **FAO GAEZ v4** (`https://gaez.fao.org`): mapped crop suitability and attainable yield.
- **Crop calendars:** FAO Crop Calendar tool (`https://cropcalendar.apps.fao.org`), USDA FAS IPAD crop calendars
  (`https://ipad.fas.usda.gov`), national department of agriculture calendars. Local calendars beat rules of thumb.
- **Agronomy references:** IRRI Rice Knowledge Bank (rice, rice-based rotations), ICRISAT (groundnut, pigeon pea,
  chickpea, sorghum in dry zones), CIAT/Alliance Bioversity-CIAT (cassava), ACIAR project reports (Southeast Asian
  farming systems, many free PDFs), and peer-reviewed studies (search Google Scholar with region + crop + "rotation").

## 5. Local, market and pest information

- **Extension services** (the farmer's best follow-up; name the right one):
  Myanmar — Department of Agriculture (Ministry of Agriculture, Livestock and Irrigation) township offices;
  Thailand — Department of Agricultural Extension (DOAE) district offices, Land Development Department (soil tests, green-manure seed);
  Vietnam — provincial agricultural extension centres;
  Cambodia — provincial departments of agriculture, CARDI (research);
  Malaysia — Department of Agriculture (DOA), MARDI (research), MADA/KADA for the Muda and Kemubu rice schemes.
- **Prices:** FAO FPMA (`https://fpma.fao.org`), WFP market monitoring, national price bulletins. A rotation the farmer
  cannot sell is not a recommendation.
- **Pests and diseases:** national plant-protection alerts, Plantwise Knowledge Bank, IRRI for rice pests, FAO for fall
  armyworm. Ask the farmer what attacked last season: their answer is more current than any database.

## 6. Forecasts (for timing, not for the long-term plan)

- **ENSO:** El Niño years usually bring later, weaker monsoon rains and drought across mainland Southeast Asia; La Niña
  brings wetter years and floods. Check NOAA Climate Prediction Center's ENSO diagnostic discussion or IRI's ENSO forecast
  before advising on the next season.
- **Seasonal outlooks:** ASEAN Specialised Meteorological Centre (ASMC) and national met services publish 3-month outlooks.
- **Sowing:** Open-Meteo forecast API (`https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&daily=precipitation_sum`)
  gives 16 days of rain; use it with the onset rule in `analysis-methods.md` to decide when to sow.

## 7. Checking a source before you use it

1. Who made it and how (measured, satellite-estimated, modelled, or someone's opinion)?
2. Resolution vs the question (a 50 km cell cannot tell one valley from the next).
3. Period: is it long enough for a trend (20+ years) or is it one season?
4. Does it agree with a second source? If two disagree, say so and prefer the one built for the job (CHIRPS for rain,
   ERA5/stations for temperature, the farmer's own records for their field).
5. Write down source, period and resolution next to every number you give the farmer.
