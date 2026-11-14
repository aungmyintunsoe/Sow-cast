// Map layers for the "Pick your area" map. All are keyless.
// NASA GIBS layers use "default" as the date, which always serves the newest image, so nothing goes stale.
// Legends are NASA's own GIBS legend images. Checked against GIBS capabilities on 2026-11-14.

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const gibs = (layer: string, level: number, ext: 'png' | 'jpg' = 'png') =>
  `${GIBS}/${layer}/default/default/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${ext}`;
const legend = (name: string) => `https://gibs.earthdata.nasa.gov/legends/${name}_H.svg`;

export interface MapLayer {
  id: string;
  label: string;
  description: string;
  url: string;
  maxNativeZoom: number;
  opacity: number;
  attribution: string;
  legendUrl?: string;
  /** draw the OpenStreetMap street map underneath (for layers with transparent gaps) */
  streetBase: boolean;
  /** offer NASA's place-name overlay (not needed on the street map, which has its own names) */
  placeNames: boolean;
}

export const MAP_LAYERS: MapLayer[] = [
  {
    id: 'greenness', label: 'Plant greenness', description: 'NDVI, latest 8-day image (MODIS Terra)',
    url: gibs('MODIS_Terra_NDVI_8Day', 9), maxNativeZoom: 9, opacity: 0.85, attribution: 'NASA GIBS, MODIS Terra NDVI',
    legendUrl: legend('MODIS_NDVI'), streetBase: true, placeNames: true,
  },
  {
    id: 'street', label: 'Street map', description: 'Towns, roads and place names (OpenStreetMap)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxNativeZoom: 19, opacity: 1,
    attribution: '&copy; OpenStreetMap contributors', streetBase: false, placeNames: false,
  },
  {
    id: 'satellite', label: 'Satellite photo', description: 'Most recent true-colour image (MODIS Terra); clouds included',
    url: gibs('MODIS_Terra_CorrectedReflectance_TrueColor', 9, 'jpg'), maxNativeZoom: 9, opacity: 1,
    attribution: 'NASA GIBS, MODIS Terra true colour', streetBase: false, placeNames: true,
  },
  {
    id: 'rain', label: 'Rainfall', description: 'Latest daily rain rate (NASA GPM IMERG)',
    url: gibs('IMERG_Precipitation_Rate', 6), maxNativeZoom: 6, opacity: 0.8, attribution: 'NASA GIBS, GPM IMERG',
    legendUrl: legend('GPM_Precipitation_Rate'), streetBase: true, placeNames: true,
  },
  {
    id: 'soil-moisture', label: 'Soil moisture', description: 'Root-zone soil moisture, latest day (NASA SMAP L4)',
    url: gibs('SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', 6), maxNativeZoom: 6, opacity: 0.8, attribution: 'NASA GIBS, SMAP L4',
    legendUrl: legend('SMAP_Analyzed_Soil_Moisture'), streetBase: true, placeNames: true,
  },
  {
    id: 'heat', label: 'Surface heat', description: 'Daytime land temperature, latest day (MODIS Terra); gaps are clouds',
    url: gibs('MODIS_Terra_Land_Surface_Temp_Day', 7), maxNativeZoom: 7, opacity: 0.8, attribution: 'NASA GIBS, MODIS Terra LST',
    legendUrl: legend('MODIS_Land_Surface_Temp'), streetBase: true, placeNames: true,
  },
  {
    id: 'land-cover', label: 'Land cover', description: 'Cropland, forest, towns and water, 2024 (MODIS)',
    url: gibs('MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual', 8), maxNativeZoom: 8, opacity: 0.9,
    attribution: 'NASA GIBS, MODIS land cover', legendUrl: legend('MODIS_IGBP_Land_Cover_Type'), streetBase: true, placeNames: true,
  },
  {
    id: 'flood', label: 'Recent flooding', description: 'Flood water seen in the last 3 days (MODIS)',
    url: gibs('MODIS_Combined_Flood_3-Day', 9), maxNativeZoom: 9, opacity: 0.9, attribution: 'NASA GIBS, MODIS flood',
    legendUrl: legend('MODIS_Flood'), streetBase: true, placeNames: true,
  },
  {
    id: 'elevation', label: 'Elevation', description: 'Height above sea level (NASA SRTM)',
    url: gibs('SRTM_Color_Index', 12), maxNativeZoom: 12, opacity: 0.85, attribution: 'NASA GIBS, SRTM',
    legendUrl: legend('SRTM_Color_Index'), streetBase: true, placeNames: true,
  },
];

export const PLACE_NAMES_URL = gibs('Reference_Labels', 9);
export const BORDERS_URL = gibs('Reference_Features', 9);
