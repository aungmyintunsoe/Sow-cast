import fs from 'node:fs';
import path from 'node:path';
import type { Crop, RegionDetail, RegionSummary } from '../src/types';

const PUBLIC_DATA_DIR = path.resolve(process.cwd(), 'public', 'data');
const REGIONS_DIR = path.join(PUBLIC_DATA_DIR, 'regions');

fs.mkdirSync(REGIONS_DIR, { recursive: true });

// ~20 realistic crops covering grasses, legumes, oilseeds, and cover crops
const crops: Crop[] = [
  {
    id: 'corn',
    name: 'Field Corn (Maize)',
    family: 'Grass (Poaceae)',
    season: 'summer',
    water_need: 4,
    nitrogen_fixing: false,
    root_depth: 'medium',
    drought_tolerance: 'moderate',
    frost_tolerance: 'low',
    temp_min_c: 10,
    temp_max_c: 35,
    season_days: 115,
    erosion_cover: 2,
    organic_matter: 3,
    market: 5,
    forage_value: 4,
    pest_notes: 'Corn rootworm and gray leaf spot build up if planted in the same field year after year.',
    plain_description: 'High-earning summer grain. Needs plenty of nitrogen and steady moisture during tasseling.'
  },
  {
    id: 'soybean',
    name: 'Soybean',
    family: 'Legume (Fabaceae)',
    season: 'summer',
    water_need: 3,
    nitrogen_fixing: true,
    root_depth: 'medium',
    drought_tolerance: 'moderate',
    frost_tolerance: 'low',
    temp_min_c: 10,
    temp_max_c: 34,
    season_days: 110,
    erosion_cover: 2,
    organic_matter: 2,
    market: 5,
    forage_value: 3,
    pest_notes: 'Soybean cyst nematode and sudden death syndrome increase in tight corn-soybean rotations.',
    plain_description: 'Reliable summer protein/oilseed crop that adds some nitrogen back, though leaves little residue after harvest.'
  },
  {
    id: 'winter_wheat',
    name: 'Winter Wheat',
    family: 'Grass (Poaceae)',
    season: 'winter',
    water_need: 2,
    nitrogen_fixing: false,
    root_depth: 'medium',
    drought_tolerance: 'high',
    frost_tolerance: 'very high',
    temp_min_c: -15,
    temp_max_c: 30,
    season_days: 240,
    erosion_cover: 4,
    organic_matter: 3,
    market: 4,
    forage_value: 3,
    pest_notes: 'Breaks summer corn/soybean pest cycles; watch for Fusarium head blight in wet springs.',
    plain_description: 'Planted in autumn, protects bare soil all winter, and harvests in early summer before peak heat.'
  },
  {
    id: 'oats',
    name: 'Oats',
    family: 'Grass (Poaceae)',
    season: 'spring',
    water_need: 2,
    nitrogen_fixing: false,
    root_depth: 'shallow',
    drought_tolerance: 'moderate',
    frost_tolerance: 'high',
    temp_min_c: 2,
    temp_max_c: 28,
    season_days: 90,
    erosion_cover: 4,
    organic_matter: 3,
    market: 3,
    forage_value: 5,
    pest_notes: 'Suppresses early-season weeds naturally and breaks rootworm and nematode cycles.',
    plain_description: 'Fast-growing cool-season grain or forage that establishes quickly and shields spring soil.'
  },
  {
    id: 'cereal_rye',
    name: 'Cereal Rye',
    family: 'Grass (Poaceae)',
    season: 'winter',
    water_need: 1,
    nitrogen_fixing: false,
    root_depth: 'deep',
    drought_tolerance: 'very high',
    frost_tolerance: 'very high',
    temp_min_c: -25,
    temp_max_c: 28,
    season_days: 210,
    erosion_cover: 5,
    organic_matter: 5,
    market: 2,
    forage_value: 4,
    pest_notes: 'Strong natural weed suppression; terminate 2 weeks before corn to avoid early nitrogen tie-up.',
    plain_description: 'Tough winter cover or grain. Deep roots hold topsoil during heavy spring rains and scavenge leftover nutrients.'
  },
  {
    id: 'triticale',
    name: 'Triticale',
    family: 'Grass (Poaceae)',
    season: 'winter',
    water_need: 2,
    nitrogen_fixing: false,
    root_depth: 'deep',
    drought_tolerance: 'high',
    frost_tolerance: 'very high',
    temp_min_c: -20,
    temp_max_c: 30,
    season_days: 220,
    erosion_cover: 5,
    organic_matter: 4,
    market: 3,
    forage_value: 5,
    pest_notes: 'More disease-resistant than wheat; great dual-purpose grain and livestock silage.',
    plain_description: 'Wheat-rye hybrid combining high forage yield with strong winter soil protection.'
  },
  {
    id: 'red_clover',
    name: 'Red Clover',
    family: 'Legume (Fabaceae)',
    season: 'spring',
    water_need: 3,
    nitrogen_fixing: true,
    root_depth: 'deep',
    drought_tolerance: 'moderate',
    frost_tolerance: 'high',
    temp_min_c: -10,
    temp_max_c: 30,
    season_days: 150,
    erosion_cover: 4,
    organic_matter: 4,
    market: 2,
    forage_value: 5,
    pest_notes: 'Attracts beneficial pollinators and breaks cereal disease cycles.',
    plain_description: 'Easy-to-establish legume that can be frost-seeded into winter wheat to build free nitrogen and organic matter.'
  },
  {
    id: 'hairy_vetch',
    name: 'Hairy Vetch',
    family: 'Legume (Fabaceae)',
    season: 'winter',
    water_need: 2,
    nitrogen_fixing: true,
    root_depth: 'medium',
    drought_tolerance: 'high',
    frost_tolerance: 'high',
    temp_min_c: -15,
    temp_max_c: 30,
    season_days: 190,
    erosion_cover: 4,
    organic_matter: 4,
    market: 1,
    forage_value: 3,
    pest_notes: 'Can produce hard seed that volunteers later if allowed to go to pod.',
    plain_description: 'Winter-hardy viney legume that delivers a big boost of natural nitrogen before summer corn or sorghum.'
  },
  {
    id: 'alfalfa',
    name: 'Alfalfa (Lucerne)',
    family: 'Legume (Fabaceae)',
    season: 'year-round',
    water_need: 4,
    nitrogen_fixing: true,
    root_depth: 'deep',
    drought_tolerance: 'high',
    frost_tolerance: 'high',
    temp_min_c: -15,
    temp_max_c: 36,
    season_days: 365,
    erosion_cover: 5,
    organic_matter: 5,
    market: 4,
    forage_value: 5,
    pest_notes: 'A 3-year stand wipes out corn rootworm and many annual weeds completely.',
    plain_description: 'Deep-rooted perennial hay crop that rebuilds tired soil structure and feeds livestock.'
  },
  {
    id: 'sorghum',
    name: 'Grain Sorghum',
    family: 'Grass (Poaceae)',
    season: 'summer',
    water_need: 2,
    nitrogen_fixing: false,
    root_depth: 'deep',
    drought_tolerance: 'very high',
    frost_tolerance: 'low',
    temp_min_c: 14,
    temp_max_c: 40,
    season_days: 105,
    erosion_cover: 3,
    organic_matter: 3,
    market: 4,
    forage_value: 4,
    pest_notes: 'Watch for sugarcane aphid late in season; tolerates heat spikes far better than corn.',
    plain_description: 'Drought-champion summer grain that pauses growth during dry spells and bounces back when rain returns.'
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    family: 'Aster (Asteraceae)',
    season: 'summer',
    water_need: 2,
    nitrogen_fixing: false,
    root_depth: 'deep',
    drought_tolerance: 'high',
    frost_tolerance: 'low',
    temp_min_c: 10,
    temp_max_c: 36,
    season_days: 100,
    erosion_cover: 2,
    organic_matter: 2,
    market: 4,
    forage_value: 2,
    pest_notes: 'Avoid planting right after soybean or canola to prevent white mold (Sclerotinia).',
    plain_description: 'Deep taproot pulls up moisture and nutrients from deeper soil layers other crops cannot reach.'
  },
  {
    id: 'safflower',
    name: 'Safflower',
    family: 'Aster (Asteraceae)',
    season: 'spring',
    water_need: 1,
    nitrogen_fixing: false,
    root_depth: 'deep',
    drought_tolerance: 'very high',
    frost_tolerance: 'moderate',
    temp_min_c: 5,
    temp_max_c: 38,
    season_days: 115,
    erosion_cover: 2,
    organic_matter: 2,
    market: 3,
    forage_value: 1,
    pest_notes: 'Dislikes waterlogged soils; thrives in dryland rotations to break cereal root diseases.',
    plain_description: 'Thistle-like oilseed with roots reaching over 6 feet deep to tap stored subsoil water.'
  },
  {
    id: 'chickpea',
    name: 'Chickpea (Garbanzo)',
    family: 'Legume (Fabaceae)',
    season: 'winter',
    water_need: 1,
    nitrogen_fixing: true,
    root_depth: 'medium',
    drought_tolerance: 'very high',
    frost_tolerance: 'moderate',
    temp_min_c: 4,
    temp_max_c: 32,
    season_days: 110,
    erosion_cover: 2,
    organic_matter: 2,
    market: 5,
    forage_value: 2,
    pest_notes: 'Sensitive to Ascochyta blight in humid weather; needs 3–4 years between chickpea crops.',
    plain_description: 'High-value dryland pulse crop that thrives on residual soil moisture with minimal irrigation.'
  },
  {
    id: 'pigeon_pea',
    name: 'Pigeon Pea',
    family: 'Legume (Fabaceae)',
    season: 'summer',
    water_need: 2,
    nitrogen_fixing: true,
    root_depth: 'deep',
    drought_tolerance: 'very high',
    frost_tolerance: 'low',
    temp_min_c: 15,
    temp_max_c: 42,
    season_days: 150,
    erosion_cover: 4,
    organic_matter: 4,
    market: 4,
    forage_value: 4,
    pest_notes: 'Pod borer can affect yields; intercropping with sorghum or millet reduces pest pressure.',
    plain_description: 'Woody, heat-tolerant legume that breaks hardpan soil, fixes nitrogen, and produces nutritious grain.'
  },
  {
    id: 'green_gram',
    name: 'Green Gram (Mung Bean)',
    family: 'Legume (Fabaceae)',
    season: 'summer',
    water_need: 2,
    nitrogen_fixing: true,
    root_depth: 'shallow',
    drought_tolerance: 'high',
    frost_tolerance: 'low',
    temp_min_c: 16,
    temp_max_c: 40,
    season_days: 65,
    erosion_cover: 3,
    organic_matter: 3,
    market: 4,
    forage_value: 3,
    pest_notes: 'Short 65-day window outruns many late-season pests; watch for whitefly.',
    plain_description: 'Fast 2-month catch crop that fits between main harvests, adds nitrogen, and earns extra cash.'
  },
  {
    id: 'cowpea',
    name: 'Cowpea (Black-eyed Pea)',
    family: 'Legume (Fabaceae)',
    season: 'summer',
    water_need: 2,
    nitrogen_fixing: true,
    root_depth: 'medium',
    drought_tolerance: 'very high',
    frost_tolerance: 'low',
    temp_min_c: 16,
    temp_max_c: 42,
    season_days: 80,
    erosion_cover: 4,
    organic_matter: 3,
    market: 4,
    forage_value: 4,
    pest_notes: 'Great at shading out weeds quickly; resists heat that causes other beans to drop blossoms.',
    plain_description: 'Heat-loving legume that covers bare ground fast, feeds the soil, and produces reliable food or fodder.'
  },
  {
    id: 'groundnut',
    name: 'Groundnut (Peanut)',
    family: 'Legume (Fabaceae)',
    season: 'summer',
    water_need: 3,
    nitrogen_fixing: true,
    root_depth: 'medium',
    drought_tolerance: 'high',
    frost_tolerance: 'low',
    temp_min_c: 15,
    temp_max_c: 36,
    season_days: 120,
    erosion_cover: 3,
    organic_matter: 2,
    market: 5,
    forage_value: 4,
    pest_notes: 'Digging pods disturbs soil, so follow with a dense grass cover crop to prevent erosion.',
    plain_description: 'High-value cash legume suited to lighter, sandy-loam soils with warm growing seasons.'
  },
  {
    id: 'sesame',
    name: 'Sesame',
    family: 'Pedaliaceae',
    season: 'summer',
    water_need: 1,
    nitrogen_fixing: false,
    root_depth: 'deep',
    drought_tolerance: 'very high',
    frost_tolerance: 'low',
    temp_min_c: 18,
    temp_max_c: 42,
    season_days: 100,
    erosion_cover: 2,
    organic_matter: 2,
    market: 5,
    forage_value: 1,
    pest_notes: 'Naturally resistant to root-knot nematodes; very few shared diseases with corn or cotton.',
    plain_description: 'Low-water, high-value oilseed that thrives in intense heat where thirsty crops fail.'
  },
  {
    id: 'pearl_millet',
    name: 'Pearl Millet',
    family: 'Grass (Poaceae)',
    season: 'summer',
    water_need: 1,
    nitrogen_fixing: false,
    root_depth: 'deep',
    drought_tolerance: 'very high',
    frost_tolerance: 'low',
    temp_min_c: 16,
    temp_max_c: 43,
    season_days: 85,
    erosion_cover: 3,
    organic_matter: 3,
    market: 3,
    forage_value: 5,
    pest_notes: 'Suppresses root-lesion nematodes and thrives in sandy, low-fertility soils.',
    plain_description: 'Fast, ultra-drought-hardy grain and forage crop for hot, dry growing windows.'
  },
  {
    id: 'mustard',
    name: 'Indian Mustard / Canola',
    family: 'Brassica (Brassicaceae)',
    season: 'winter',
    water_need: 2,
    nitrogen_fixing: false,
    root_depth: 'deep',
    drought_tolerance: 'moderate',
    frost_tolerance: 'high',
    temp_min_c: 2,
    temp_max_c: 30,
    season_days: 120,
    erosion_cover: 4,
    organic_matter: 3,
    market: 4,
    forage_value: 2,
    pest_notes: 'Releases natural bio-fumigant compounds in soil that suppress soil-borne fungi and nematodes.',
    plain_description: 'Cool-season oilseed with a deep taproot that breaks compacted soil layers and diversifies cereal farms.'
  }
];

fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'crops.json'), JSON.stringify(crops, null, 2));

const regionSummaries: RegionSummary[] = [
  {
    id: 'iowa',
    name: 'Story County',
    place: 'Iowa, USA',
    lat: 42.03,
    lon: -93.62,
    tagline: 'Corn & soybean belt facing heavier spring storms'
  },
  {
    id: 'punjab',
    name: 'Ludhiana District',
    place: 'Punjab, India',
    lat: 30.9,
    lon: 75.85,
    tagline: 'Rice–wheat belt under rapid groundwater drawdown'
  },
  {
    id: 'nakuru',
    name: 'Nakuru County',
    place: 'Rift Valley, Kenya',
    lat: -0.3,
    lon: 36.07,
    tagline: 'Highland maize farms with shifting rainy seasons'
  },
  {
    id: 'darling_downs',
    name: 'Darling Downs',
    place: 'Queensland, Australia',
    lat: -27.56,
    lon: 151.95,
    tagline: 'Dryland grain country adapting to hotter summers'
  }
];

fs.writeFileSync(path.join(REGIONS_DIR, 'index.json'), JSON.stringify(regionSummaries, null, 2));

function buildAnnual(
  baseHeat: number,
  heatSlopePerYear: number,
  basePrecip: number,
  precipSlopePerYear: number,
  baseHeavyRain: number,
  heavySlope: number,
  gwSlope: number,
  baseSeasonDays: number,
  seasonSlope: number
) {
  const years = [];
  for (let i = 0; i < 24; i++) {
    const year = 2001 + i;
    // deterministic pseudo-noise so it looks realistic without Math.random drift
    const wave = Math.sin(i * 1.3) * 0.6 + Math.cos(i * 0.7) * 0.4;
    years.push({
      year,
      heat_days: Math.max(0, Math.round(baseHeat + heatSlopePerYear * i + wave * 3)),
      precip_mm: Math.max(150, Math.round(basePrecip + precipSlopePerYear * i + wave * 85)),
      heavy_rain_days: Math.max(1, Math.round(baseHeavyRain + heavySlope * i + wave * 2)),
      groundwater_anomaly_cm: Number((gwSlope * i + wave * 1.8).toFixed(1)),
      growing_season_days: Math.round(baseSeasonDays + seasonSlope * i + wave * 5)
    });
  }
  return years;
}

const iowaData: RegionDetail = {
  region: { id: 'iowa', name: 'Story County', place: 'Iowa, USA', lat: 42.03, lon: -93.62 },
  monthly: [
    { month: 1, tmax_c: -1.8, tmin_c: -11.5, precip_mm: 24, soil_moisture: 0.72, et_mm: 8, ndvi: 0.16, frost_days: 29, heat_days: 0, heavy_rain_days: 0, typically_bare: true },
    { month: 2, tmax_c: 1.2, tmin_c: -8.9, precip_mm: 28, soil_moisture: 0.74, et_mm: 12, ndvi: 0.17, frost_days: 25, heat_days: 0, heavy_rain_days: 0, typically_bare: true },
    { month: 3, tmax_c: 8.5, tmin_c: -2.4, precip_mm: 52, soil_moisture: 0.79, et_mm: 32, ndvi: 0.22, frost_days: 18, heat_days: 0, heavy_rain_days: 1, typically_bare: true },
    { month: 4, tmax_c: 15.8, tmin_c: 3.4, precip_mm: 89, soil_moisture: 0.78, et_mm: 64, ndvi: 0.30, frost_days: 7, heat_days: 0, heavy_rain_days: 2, typically_bare: true },
    { month: 5, tmax_c: 22.1, tmin_c: 9.8, precip_mm: 118, soil_moisture: 0.73, et_mm: 105, ndvi: 0.48, frost_days: 1, heat_days: 0, heavy_rain_days: 3, typically_bare: false },
    { month: 6, tmax_c: 27.2, tmin_c: 15.3, precip_mm: 128, soil_moisture: 0.66, et_mm: 138, ndvi: 0.76, frost_days: 0, heat_days: 3, heavy_rain_days: 3, typically_bare: false },
    { month: 7, tmax_c: 29.1, tmin_c: 17.6, precip_mm: 104, soil_moisture: 0.56, et_mm: 148, ndvi: 0.85, frost_days: 0, heat_days: 6, heavy_rain_days: 2, typically_bare: false },
    { month: 8, tmax_c: 28.0, tmin_c: 16.4, precip_mm: 102, soil_moisture: 0.54, et_mm: 126, ndvi: 0.81, frost_days: 0, heat_days: 4, heavy_rain_days: 2, typically_bare: false },
    { month: 9, tmax_c: 24.1, tmin_c: 11.2, precip_mm: 82, soil_moisture: 0.58, et_mm: 82, ndvi: 0.58, frost_days: 0, heat_days: 1, heavy_rain_days: 1, typically_bare: false },
    { month: 10, tmax_c: 16.9, tmin_c: 4.5, precip_mm: 66, soil_moisture: 0.65, et_mm: 45, ndvi: 0.28, frost_days: 6, heat_days: 0, heavy_rain_days: 1, typically_bare: true },
    { month: 11, tmax_c: 8.2, tmin_c: -2.6, precip_mm: 46, soil_moisture: 0.70, et_mm: 18, ndvi: 0.19, frost_days: 19, heat_days: 0, heavy_rain_days: 1, typically_bare: true },
    { month: 12, tmax_c: 0.5, tmin_c: -8.8, precip_mm: 31, soil_moisture: 0.72, et_mm: 9, ndvi: 0.17, frost_days: 28, heat_days: 0, heavy_rain_days: 0, typically_bare: true }
  ],
  annual: buildAnnual(9, 0.25, 870, 1.8, 9, 0.22, 0.05, 166, 0.5),
  trends: {
    heat_days_per_decade: 2.5,
    precip_change_pct: 5,
    heavy_rain_change_pct: 19,
    groundwater: 'stable'
  },
  soil: {
    texture: 'Silty clay loam',
    organic_matter: 'good',
    drainage: 'moderate',
    slope_pct: 3,
    erosion_risk: 'medium',
    water_holding: 'high',
    source: 'USDA SSURGO'
  },
  current_rotation: [
    { crop: 'corn', months: [5, 6, 7, 8, 9, 10] },
    { crop: 'soybean', months: [5, 6, 7, 8, 9, 10] }
  ],
  insights: [
    {
      title: 'Fields sit bare during the heaviest spring storms',
      body: 'Satellite greenness shows almost no living plant cover from November through April, while heavy rainstorms in April and May have jumped 19% over the last 20 years.',
      source: 'Landsat NDVI + GPM IMERG',
      confidence: 'high',
      badgeType: 'warning'
    },
    {
      title: 'Longer frost-free window opens cover crop time',
      body: 'The growing season is now about 12 days longer than in 2001, giving autumn-planted rye or winter wheat extra weeks to root before freeze-up.',
      source: 'NASA POWER',
      confidence: 'high',
      badgeType: 'opportunity'
    },
    {
      title: 'Subsoil moisture holds steady but August heat spikes',
      body: 'Deep soil water stays strong overall, but days above 32°C are climbing by 2.5 days per decade, stressing corn during late grain-fill.',
      source: 'SMAP + ECOSTRESS',
      confidence: 'medium',
      badgeType: 'neutral'
    }
  ],
  rotations: [
    {
      id: 'current',
      label: 'Current',
      name: 'Corn → Soybean',
      tagline: '2-year standard summer grain rotation',
      sequence: ['corn', 'soybean'],
      cover_by_month: [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
      scores: { soil: 2, water: 3, erosion: 2, income: 4, pest_break: 2 },
      why: 'Generates strong cash income in good years, but leaves topsoil exposed for 7 months every year and feeds recurring rootworm and nematode pressure.',
      evidence: ['Landsat NDVI', 'GPM IMERG', 'USDA SSURGO'],
      benefits: ['Familiar machinery and local grain buyers', 'High peak-year revenue'],
      gaps: ['Exact field tile-drainage spacing is not visible from space'],
      risks: ['Spring washouts on 3%+ slopes', 'Rising fertilizer costs if organic matter drops']
    },
    {
      id: 'rye_bridge',
      label: 'Option A',
      name: 'Corn → Cereal Rye → Soybean → Cereal Rye',
      tagline: 'Keep living roots in the soil all winter',
      sequence: ['corn', 'cereal_rye', 'soybean', 'cereal_rye'],
      cover_by_month: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      scores: { soil: 5, water: 4, erosion: 5, income: 4, pest_break: 3 },
      why: 'Adding winter cereal rye after harvest keeps living roots holding soil during April–May downpours without giving up any summer corn or soybean harvest.',
      evidence: ['GPM IMERG', 'Landsat NDVI', 'SMAP'],
      benefits: ['Cuts spring soil erosion by up to 60%', 'Traps leftover nitrogen before it leaches', 'Suppresses early-season pigweed and waterhemp'],
      gaps: ['Local custom-seeding availability in late September'],
      risks: ['Must terminate rye 10–14 days before planting corn so it does not tie up starter nitrogen']
    },
    {
      id: 'three_crop',
      label: 'Option B',
      name: 'Corn → Soybean → Winter Wheat + Red Clover',
      tagline: '3-year diversity to break pests and cut nitrogen bills',
      sequence: ['corn', 'soybean', 'winter_wheat', 'red_clover'],
      cover_by_month: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      scores: { soil: 5, water: 4, erosion: 5, income: 3, pest_break: 5 },
      why: 'Adding winter wheat with frost-seeded red clover breaks the 2-year corn/soybean pest cycle and supplies 50–80 lbs/acre of natural nitrogen for the next corn crop.',
      evidence: ['NASA POWER', 'Landsat NDVI', 'USDA SSURGO'],
      benefits: ['Major drop in rootworm and cyst nematode pressure', 'Free nitrogen from clover reduces fertilizer bills', 'Spreads farm workload across summer and autumn'],
      gaps: ['Local elevator market price for winter wheat vs corn'],
      risks: ['Wheat harvest in July needs timely storage or buyer contract']
    }
  ],
  crop_fit: [
    { crop: 'cereal_rye', fit: 95, trend: 'increasing', limits: [] },
    { crop: 'soybean', fit: 90, trend: 'flat', limits: ['Increasing heavy May rain delays planting'] },
    { crop: 'corn', fit: 86, trend: 'declining', limits: ['More August heat days above 32°C'] },
    { crop: 'winter_wheat', fit: 84, trend: 'increasing', limits: ['Check local grain elevator contract'] },
    { crop: 'red_clover', fit: 82, trend: 'flat', limits: [] },
    { crop: 'oats', fit: 79, trend: 'flat', limits: ['Lower per-acre cash return unless sold for seed/forage'] },
    { crop: 'alfalfa', fit: 78, trend: 'flat', limits: ['Best if livestock or hay buyer is nearby'] },
    { crop: 'hairy_vetch', fit: 72, trend: 'increasing', limits: ['Can volunteer in wheat if not terminated cleanly'] },
    { crop: 'sorghum', fit: 64, trend: 'increasing', limits: ['Cool May soils slow emergence'] },
    { crop: 'sunflower', fit: 60, trend: 'flat', limits: ['Humid summers raise white mold risk'] }
  ],
  sources: ['NASA POWER', 'SMAP', 'GPM IMERG', 'Landsat NDVI', 'ECOSTRESS', 'GRACE-FO', 'USDA SSURGO']
};

const punjabData: RegionDetail = {
  region: { id: 'punjab', name: 'Ludhiana District', place: 'Punjab, India', lat: 30.9, lon: 75.85 },
  monthly: [
    { month: 1, tmax_c: 19.2, tmin_c: 6.1, precip_mm: 25, soil_moisture: 0.42, et_mm: 42, ndvi: 0.72, frost_days: 1, heat_days: 0, heavy_rain_days: 0, typically_bare: false },
    { month: 2, tmax_c: 22.5, tmin_c: 8.8, precip_mm: 28, soil_moisture: 0.41, et_mm: 58, ndvi: 0.78, frost_days: 0, heat_days: 0, heavy_rain_days: 0, typically_bare: false },
    { month: 3, tmax_c: 28.1, tmin_c: 13.4, precip_mm: 24, soil_moisture: 0.35, et_mm: 92, ndvi: 0.65, frost_days: 0, heat_days: 1, heavy_rain_days: 0, typically_bare: false },
    { month: 4, tmax_c: 35.6, tmin_c: 19.1, precip_mm: 16, soil_moisture: 0.24, et_mm: 138, ndvi: 0.25, frost_days: 0, heat_days: 12, heavy_rain_days: 0, typically_bare: true },
    { month: 5, tmax_c: 40.4, tmin_c: 24.3, precip_mm: 22, soil_moisture: 0.19, et_mm: 175, ndvi: 0.19, frost_days: 0, heat_days: 26, heavy_rain_days: 0, typically_bare: true },
    { month: 6, tmax_c: 39.2, tmin_c: 26.8, precip_mm: 78, soil_moisture: 0.31, et_mm: 168, ndvi: 0.36, frost_days: 0, heat_days: 22, heavy_rain_days: 2, typically_bare: false },
    { month: 7, tmax_c: 34.4, tmin_c: 26.4, precip_mm: 215, soil_moisture: 0.62, et_mm: 134, ndvi: 0.68, frost_days: 0, heat_days: 6, heavy_rain_days: 5, typically_bare: false },
    { month: 8, tmax_c: 33.6, tmin_c: 25.8, precip_mm: 188, soil_moisture: 0.65, et_mm: 122, ndvi: 0.80, frost_days: 0, heat_days: 4, heavy_rain_days: 4, typically_bare: false },
    { month: 9, tmax_c: 33.5, tmin_c: 23.2, precip_mm: 102, soil_moisture: 0.54, et_mm: 108, ndvi: 0.74, frost_days: 0, heat_days: 4, heavy_rain_days: 2, typically_bare: false },
    { month: 10, tmax_c: 31.8, tmin_c: 16.5, precip_mm: 14, soil_moisture: 0.36, et_mm: 86, ndvi: 0.32, frost_days: 0, heat_days: 2, heavy_rain_days: 0, typically_bare: true },
    { month: 11, tmax_c: 26.8, tmin_c: 10.6, precip_mm: 6, soil_moisture: 0.34, et_mm: 56, ndvi: 0.38, frost_days: 0, heat_days: 0, heavy_rain_days: 0, typically_bare: false },
    { month: 12, tmax_c: 20.9, tmin_c: 6.8, precip_mm: 14, soil_moisture: 0.40, et_mm: 40, ndvi: 0.58, frost_days: 0, heat_days: 0, heavy_rain_days: 0, typically_bare: false }
  ],
  annual: buildAnnual(62, 0.7, 725, -2.5, 11, 0.15, -2.1, 315, 0.3),
  trends: {
    heat_days_per_decade: 7.0,
    precip_change_pct: -8,
    heavy_rain_change_pct: 14,
    groundwater: 'rapidly declining'
  },
  soil: {
    texture: 'Alluvial sandy loam',
    organic_matter: 'low',
    drainage: 'well',
    slope_pct: 1,
    erosion_risk: 'low',
    water_holding: 'moderate',
    source: 'ISRIC SoilGrids + NBSS'
  },
  current_rotation: [
    { crop: 'winter_wheat', months: [11, 12, 1, 2, 3, 4] },
    { crop: 'corn', months: [6, 7, 8, 9] } // representing summer Kharif intensive cereal (paddy/maize)
  ],
  insights: [
    {
      title: 'Underground water reserves are dropping fast',
      body: 'NASA gravity satellites show groundwater has fallen steadily for 20+ years. Pumping water for flooded summer paddy is forcing deeper, costlier borewells every 3–5 years.',
      source: 'GRACE-FO',
      confidence: 'high',
      badgeType: 'warning'
    },
    {
      title: 'March–April heat spikes hurt late-sown wheat',
      body: 'Days above 35°C are climbing by 7 days per decade, causing early grain shriveling if wheat matures past late March.',
      source: 'NASA POWER + ECOSTRESS',
      confidence: 'high',
      badgeType: 'warning'
    },
    {
      title: '65-day summer gap fits fast nitrogen-fixing pulses',
      body: 'Between April wheat harvest and late June monsoon onset, short-season green gram can add soil nitrogen and extra income using minimal water.',
      source: 'SMAP + Landsat NDVI',
      confidence: 'high',
      badgeType: 'opportunity'
    }
  ],
  rotations: [
    {
      id: 'current',
      label: 'Current',
      name: 'Flooded Paddy → Winter Wheat',
      tagline: 'High water-demand double cereal system',
      sequence: ['corn', 'winter_wheat'],
      cover_by_month: [1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1],
      scores: { soil: 1, water: 1, erosion: 3, income: 4, pest_break: 1 },
      why: 'Steady minimum support prices make this familiar, but continuous cereal cropping depletes organic matter and drains underground aquifers.',
      evidence: ['GRACE-FO', 'SMAP', 'NASA POWER'],
      benefits: ['Guaranteed procurement markets', 'Predictable machinery setup'],
      gaps: ['Exact depth to water table on your specific tube-well'],
      risks: ['Borewell pump burnout or failure during dry June', 'Late-March heat wave shriveling wheat yields']
    },
    {
      id: 'green_gram_bridge',
      label: 'Option A',
      name: 'Winter Wheat → Green Gram → Corn (Maize)',
      tagline: 'Cut summer water use by 60% & rebuild soil nitrogen',
      sequence: ['winter_wheat', 'green_gram', 'corn'],
      cover_by_month: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
      scores: { soil: 4, water: 4, erosion: 4, income: 4, pest_break: 4 },
      why: 'Replacing water-heavy flooded paddy with maize and inserting a 65-day green gram crop in May–June cuts groundwater pumping dramatically while adding free nitrogen.',
      evidence: ['GRACE-FO', 'GPM IMERG', 'Landsat NDVI'],
      benefits: ['Saves massive electricity and borewell pumping', 'Extra harvest of high-protein mung beans', 'Breaks paddy straw burning cycle'],
      gaps: ['Local buyer pricing for maize vs paddy'],
      risks: ['Waterlogging in low-lying fields during heavy July monsoon bursts']
    },
    {
      id: 'mustard_pigeon',
      label: 'Option B',
      name: 'Pigeon Pea → Indian Mustard',
      tagline: 'Low-water, heat-resilient oilseed + pulse rotation',
      sequence: ['pigeon_pea', 'mustard'],
      cover_by_month: [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1],
      scores: { soil: 5, water: 5, erosion: 4, income: 3, pest_break: 5 },
      why: 'Deep taproots from both pigeon pea and mustard break compacted plow-pans and thrive on monsoon rain plus 1–2 light irrigations.',
      evidence: ['GRACE-FO', 'ECOSTRESS', 'SMAP'],
      benefits: ['Near-zero groundwater depletion', 'Shatters hard subsoil layers naturally', 'Strong market demand for mustard oil and dal'],
      gaps: ['Pod borer control readiness for pigeon pea'],
      risks: ['Sudden frost in January can nip mustard pods if sown too late']
    }
  ],
  crop_fit: [
    { crop: 'green_gram', fit: 94, trend: 'increasing', limits: [] },
    { crop: 'mustard', fit: 91, trend: 'flat', limits: ['Watch for aphids in warm February'] },
    { crop: 'pigeon_pea', fit: 89, trend: 'increasing', limits: ['Needs well-drained fields'] },
    { crop: 'pearl_millet', fit: 87, trend: 'increasing', limits: [] },
    { crop: 'winter_wheat', fit: 81, trend: 'declining', limits: ['Rising March heat stress'] },
    { crop: 'chickpea', fit: 80, trend: 'flat', limits: ['Avoid heavy irrigated soils'] },
    { crop: 'corn', fit: 77, trend: 'flat', limits: ['Needs drainage during peak July monsoon'] },
    { crop: 'sorghum', fit: 76, trend: 'increasing', limits: [] },
    { crop: 'sesame', fit: 74, trend: 'increasing', limits: [] }
  ],
  sources: ['GRACE-FO', 'NASA POWER', 'SMAP', 'GPM IMERG', 'Landsat NDVI', 'ECOSTRESS', 'ISRIC SoilGrids']
};

const nakuruData: RegionDetail = {
  region: { id: 'nakuru', name: 'Nakuru County', place: 'Rift Valley, Kenya', lat: -0.3, lon: 36.07 },
  monthly: [
    { month: 1, tmax_c: 26.2, tmin_c: 10.2, precip_mm: 32, soil_moisture: 0.30, et_mm: 118, ndvi: 0.34, frost_days: 0, heat_days: 2, heavy_rain_days: 0, typically_bare: true },
    { month: 2, tmax_c: 27.1, tmin_c: 10.6, precip_mm: 38, soil_moisture: 0.28, et_mm: 122, ndvi: 0.31, frost_days: 0, heat_days: 3, heavy_rain_days: 0, typically_bare: true },
    { month: 3, tmax_c: 26.8, tmin_c: 11.4, precip_mm: 72, soil_moisture: 0.38, et_mm: 116, ndvi: 0.39, frost_days: 0, heat_days: 2, heavy_rain_days: 1, typically_bare: false },
    { month: 4, tmax_c: 24.8, tmin_c: 12.1, precip_mm: 145, soil_moisture: 0.58, et_mm: 94, ndvi: 0.62, frost_days: 0, heat_days: 0, heavy_rain_days: 3, typically_bare: false },
    { month: 5, tmax_c: 24.1, tmin_c: 11.6, precip_mm: 132, soil_moisture: 0.62, et_mm: 88, ndvi: 0.74, frost_days: 0, heat_days: 0, heavy_rain_days: 3, typically_bare: false },
    { month: 6, tmax_c: 23.6, tmin_c: 10.4, precip_mm: 86, soil_moisture: 0.56, et_mm: 84, ndvi: 0.76, frost_days: 0, heat_days: 0, heavy_rain_days: 1, typically_bare: false },
    { month: 7, tmax_c: 22.9, tmin_c: 10.1, precip_mm: 98, soil_moisture: 0.57, et_mm: 82, ndvi: 0.75, frost_days: 0, heat_days: 0, heavy_rain_days: 2, typically_bare: false },
    { month: 8, tmax_c: 23.2, tmin_c: 10.2, precip_mm: 112, soil_moisture: 0.59, et_mm: 86, ndvi: 0.73, frost_days: 0, heat_days: 0, heavy_rain_days: 2, typically_bare: false },
    { month: 9, tmax_c: 24.4, tmin_c: 9.8, precip_mm: 78, soil_moisture: 0.51, et_mm: 95, ndvi: 0.61, frost_days: 0, heat_days: 0, heavy_rain_days: 1, typically_bare: false },
    { month: 10, tmax_c: 24.8, tmin_c: 10.5, precip_mm: 74, soil_moisture: 0.46, et_mm: 102, ndvi: 0.49, frost_days: 0, heat_days: 0, heavy_rain_days: 1, typically_bare: false },
    { month: 11, tmax_c: 23.9, tmin_c: 10.9, precip_mm: 82, soil_moisture: 0.48, et_mm: 94, ndvi: 0.48, frost_days: 0, heat_days: 0, heavy_rain_days: 1, typically_bare: false },
    { month: 12, tmax_c: 24.9, tmin_c: 10.3, precip_mm: 46, soil_moisture: 0.37, et_mm: 108, ndvi: 0.41, frost_days: 0, heat_days: 1, heavy_rain_days: 0, typically_bare: true }
  ],
  annual: buildAnnual(5, 0.3, 995, -1.2, 12, 0.2, -0.2, 245, -0.4),
  trends: {
    heat_days_per_decade: 3.0,
    precip_change_pct: -3,
    heavy_rain_change_pct: 16,
    groundwater: 'declining'
  },
  soil: {
    texture: 'Volcanic clay loam',
    organic_matter: 'moderate',
    drainage: 'well',
    slope_pct: 6,
    erosion_risk: 'high',
    water_holding: 'moderate',
    source: 'iSDAsoil Africa'
  },
  current_rotation: [
    { crop: 'corn', months: [3, 4, 5, 6, 7, 8, 9] }
  ],
  insights: [
    {
      title: 'Long-rains start date has become less predictable',
      body: 'Rainy season onset in March now shifts by 2–3 weeks from year to year, causing early-planted maize to struggle during dry spells.',
      source: 'GPM IMERG',
      confidence: 'high',
      badgeType: 'warning'
    },
    {
      title: 'Sloped volcanic soils lose topsoil in April downpours',
      body: 'At 6% average slope, bare ground between January and March is vulnerable to washing away when heavy April rains arrive.',
      source: 'iSDAsoil + GPM IMERG',
      confidence: 'high',
      badgeType: 'warning'
    },
    {
      title: 'Mild year-round temperatures support relay legumes',
      body: 'With zero frost risk and warm days, drought-hardy cowpea or pigeon pea can protect soil and supply protein even when rains pause.',
      source: 'NASA POWER',
      confidence: 'high',
      badgeType: 'opportunity'
    }
  ],
  rotations: [
    {
      id: 'current',
      label: 'Current',
      name: 'Continuous Maize (Corn)',
      tagline: 'Single annual cereal crop with bare dry season',
      sequence: ['corn'],
      cover_by_month: [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      scores: { soil: 2, water: 2, erosion: 1, income: 3, pest_break: 1 },
      why: 'Maize is the staple food crop, but planting it alone every year drains soil nitrogen, leaves sloped ground bare for 5 months, and encourages Fall Armyworm.',
      evidence: ['GPM IMERG', 'Landsat NDVI', 'iSDAsoil'],
      benefits: ['Direct household food staple', 'Simple single-crop management'],
      gaps: ['Field-specific terracing or contour bunds on your farm'],
      risks: ['Total yield loss if March–April rains stall', 'Severe gully erosion on 6% slopes']
    },
    {
      id: 'sorghum_cowpea',
      label: 'Option A',
      name: 'Sorghum + Cowpea → Oats',
      tagline: 'Drought-proof food security + hillside soil armor',
      sequence: ['sorghum', 'cowpea', 'oats'],
      cover_by_month: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      scores: { soil: 4, water: 5, erosion: 4, income: 4, pest_break: 4 },
      why: 'Sorghum survives mid-season dry spells far better than maize, while cowpea crawls across the soil to stop erosion and add nitrogen. Short-rains oats give grain or dairy fodder.',
      evidence: ['SMAP', 'GPM IMERG', 'NASA POWER'],
      benefits: ['Reliable harvest even in poor rain years', 'Stops hillside runoff during April storms', 'Provides both family food and livestock fodder'],
      gaps: ['Bird pressure on sorghum if neighbors do not plant it'],
      risks: ['Check local market price for sorghum vs maize before switching 100% of acreage']
    },
    {
      id: 'pigeon_pea_maize',
      label: 'Option B',
      name: 'Maize + Pigeon Pea Strip → Groundnut',
      tagline: 'Keep maize while cutting fertilizer and erosion',
      sequence: ['corn', 'pigeon_pea', 'groundnut'],
      cover_by_month: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      scores: { soil: 5, water: 4, erosion: 5, income: 5, pest_break: 4 },
      why: 'Deep-rooted pigeon pea stays green through the dry January–February months after maize is harvested, shading the soil and fixing nitrogen for the following high-value groundnuts.',
      evidence: ['Landsat NDVI', 'iSDAsoil', 'ECOSTRESS'],
      benefits: ['Keeps staple maize in the mix', '12-month living ground cover', 'High cash value from groundnut & pigeon pea'],
      gaps: ['Seed availability for improved short-duration pigeon pea'],
      risks: ['Free-roaming livestock grazing pigeon pea in dry season if unfenced']
    }
  ],
  crop_fit: [
    { crop: 'cowpea', fit: 95, trend: 'increasing', limits: [] },
    { crop: 'sorghum', fit: 92, trend: 'increasing', limits: ['Bird scaring needed near ripening'] },
    { crop: 'pigeon_pea', fit: 90, trend: 'increasing', limits: [] },
    { crop: 'oats', fit: 86, trend: 'flat', limits: ['Best planted for short rains or dairy forage'] },
    { crop: 'groundnut', fit: 83, trend: 'flat', limits: ['Needs loose soil for pegging'] },
    { crop: 'corn', fit: 76, trend: 'declining', limits: ['Vulnerable to erratic March rain onset'] },
    { crop: 'sunflower', fit: 78, trend: 'flat', limits: [] },
    { crop: 'pearl_millet', fit: 81, trend: 'increasing', limits: [] }
  ],
  sources: ['GPM IMERG', 'SMAP', 'NASA POWER', 'Landsat NDVI', 'ECOSTRESS', 'iSDAsoil Africa']
};

const darlingDownsData: RegionDetail = {
  region: { id: 'darling_downs', name: 'Darling Downs', place: 'Queensland, Australia', lat: -27.56, lon: 151.95 },
  monthly: [
    { month: 1, tmax_c: 31.2, tmin_c: 17.8, precip_mm: 92, soil_moisture: 0.44, et_mm: 165, ndvi: 0.54, frost_days: 0, heat_days: 8, heavy_rain_days: 2, typically_bare: false },
    { month: 2, tmax_c: 30.1, tmin_c: 17.4, precip_mm: 84, soil_moisture: 0.46, et_mm: 142, ndvi: 0.58, frost_days: 0, heat_days: 6, heavy_rain_days: 2, typically_bare: false },
    { month: 3, tmax_c: 28.4, tmin_c: 15.2, precip_mm: 62, soil_moisture: 0.43, et_mm: 122, ndvi: 0.51, frost_days: 0, heat_days: 2, heavy_rain_days: 1, typically_bare: false },
    { month: 4, tmax_c: 25.1, tmin_c: 11.4, precip_mm: 38, soil_moisture: 0.39, et_mm: 88, ndvi: 0.36, frost_days: 0, heat_days: 0, heavy_rain_days: 1, typically_bare: true },
    { month: 5, tmax_c: 21.4, tmin_c: 7.2, precip_mm: 36, soil_moisture: 0.38, et_mm: 62, ndvi: 0.34, frost_days: 1, heat_days: 0, heavy_rain_days: 0, typically_bare: false },
    { month: 6, tmax_c: 18.2, tmin_c: 4.5, precip_mm: 34, soil_moisture: 0.40, et_mm: 46, ndvi: 0.42, frost_days: 4, heat_days: 0, heavy_rain_days: 0, typically_bare: false },
    { month: 7, tmax_c: 17.8, tmin_c: 3.4, precip_mm: 32, soil_moisture: 0.39, et_mm: 48, ndvi: 0.52, frost_days: 6, heat_days: 0, heavy_rain_days: 0, typically_bare: false },
    { month: 8, tmax_c: 19.8, tmin_c: 4.8, precip_mm: 28, soil_moisture: 0.36, et_mm: 64, ndvi: 0.58, frost_days: 3, heat_days: 0, heavy_rain_days: 0, typically_bare: false },
    { month: 9, tmax_c: 23.6, tmin_c: 8.2, precip_mm: 36, soil_moisture: 0.33, et_mm: 92, ndvi: 0.52, frost_days: 0, heat_days: 1, heavy_rain_days: 1, typically_bare: false },
    { month: 10, tmax_c: 26.8, tmin_c: 12.1, precip_mm: 58, soil_moisture: 0.34, et_mm: 124, ndvi: 0.38, frost_days: 0, heat_days: 3, heavy_rain_days: 1, typically_bare: true },
    { month: 11, tmax_c: 29.2, tmin_c: 14.9, precip_mm: 76, soil_moisture: 0.38, et_mm: 148, ndvi: 0.41, frost_days: 0, heat_days: 5, heavy_rain_days: 2, typically_bare: false },
    { month: 12, tmax_c: 30.8, tmin_c: 16.8, precip_mm: 88, soil_moisture: 0.42, et_mm: 162, ndvi: 0.49, frost_days: 0, heat_days: 7, heavy_rain_days: 2, typically_bare: false }
  ],
  annual: buildAnnual(24, 0.45, 665, -3.1, 10, 0.12, -0.4, 290, 0.4),
  trends: {
    heat_days_per_decade: 4.5,
    precip_change_pct: -10,
    heavy_rain_change_pct: 10,
    groundwater: 'declining'
  },
  soil: {
    texture: 'Deep cracking black clay (Vertisol)',
    organic_matter: 'moderate',
    drainage: 'moderate',
    slope_pct: 2,
    erosion_risk: 'medium',
    water_holding: 'high',
    source: 'TERN SoilGrid Australia'
  },
  current_rotation: [
    { crop: 'sorghum', months: [10, 11, 12, 1, 2, 3] },
    { crop: 'winter_wheat', months: [5, 6, 7, 8, 9, 10] }
  ],
  insights: [
    {
      title: 'Summer heat spikes are shortening fallow storage',
      body: 'Hot days above 33°C have risen 4.5 days per decade, baking moisture out of bare fallow soil before winter wheat can use it.',
      source: 'NASA POWER + ECOSTRESS',
      confidence: 'high',
      badgeType: 'warning'
    },
    {
      title: 'Deep black clay holds water well if covered',
      body: 'Your soil acts like a giant sponge when protected by stubble or cover crops, holding enough subsoil water to carry winter pulses without rain.',
      source: 'SMAP + TERN SoilGrid',
      confidence: 'high',
      badgeType: 'opportunity'
    }
  ],
  rotations: [
    {
      id: 'current',
      label: 'Current',
      name: 'Sorghum → Long Fallow → Winter Wheat',
      tagline: 'Classic dryland grain + bare chemical fallow',
      sequence: ['sorghum', 'winter_wheat'],
      cover_by_month: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
      scores: { soil: 3, water: 3, erosion: 3, income: 4, pest_break: 2 },
      why: 'Stores water during bare fallow, but repeated grass-on-grass crops (sorghum & wheat) let root-lesion nematodes and herbicide-resistant weeds multiply.',
      evidence: ['SMAP', 'ECOSTRESS', 'TERN SoilGrid'],
      benefits: ['Proven dryland water-banking approach', 'Strong grain infrastructure'],
      gaps: ['Subsoil chloride or sodicity depth on individual paddocks'],
      risks: ['Herbicide-resistant fleabane & feathertop Rhodes grass in fallow', 'Crown rot buildup in wheat']
    },
    {
      id: 'chickpea_break',
      label: 'Option A',
      name: 'Sorghum → Chickpea → Winter Wheat',
      tagline: 'High-value pulse break to slash root disease',
      sequence: ['sorghum', 'chickpea', 'winter_wheat'],
      cover_by_month: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
      scores: { soil: 4, water: 4, erosion: 3, income: 5, pest_break: 5 },
      why: 'Adding winter chickpea breaks cereal crown rot and nematode pressure while fixing nitrogen for the next sorghum crop on stored clay moisture.',
      evidence: ['SMAP', 'NASA POWER', 'Landsat NDVI'],
      benefits: ['Higher wheat yields after a pulse break', 'Strong export cash prices for chickpea', 'Lowers nitrogen fertilizer needs'],
      gaps: ['Paddock drainage during rare wet winters'],
      risks: ['Ascochyta blight if winter turns unusually wet—needs timely fungicide check']
    },
    {
      id: 'sunflower_mung',
      label: 'Option B',
      name: 'Green Gram → Winter Wheat → Sunflower',
      tagline: 'Taproot diversity for hotter summers',
      sequence: ['green_gram', 'winter_wheat', 'sunflower'],
      cover_by_month: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
      scores: { soil: 4, water: 4, erosion: 4, income: 4, pest_break: 5 },
      why: 'Quick summer green gram + deep-rooted sunflower break grass-weed herbicide cycles and pull nutrients up from deep black clay.',
      evidence: ['ECOSTRESS', 'SMAP', 'GPM IMERG'],
      benefits: ['Three completely different plant families', 'Resilient to 40°C summer spikes', 'Breaks stubborn grass weeds'],
      gaps: ['Local crushing/delivery contracts for sunflower'],
      risks: ['Rutherglen bug pressure on sunflower heads during dry springs']
    }
  ],
  crop_fit: [
    { crop: 'chickpea', fit: 93, trend: 'flat', limits: ['Monitor winter Ascochyta blight'] },
    { crop: 'sorghum', fit: 91, trend: 'flat', limits: [] },
    { crop: 'green_gram', fit: 88, trend: 'increasing', limits: ['Needs ~65 frost-free warm days'] },
    { crop: 'winter_wheat', fit: 84, trend: 'declining', limits: ['Drier winter trend requires stored soil water'] },
    { crop: 'sunflower', fit: 82, trend: 'increasing', limits: [] },
    { crop: 'safflower', fit: 79, trend: 'increasing', limits: [] },
    { crop: 'sesame', fit: 76, trend: 'increasing', limits: ['Emerging niche market'] }
  ],
  sources: ['NASA POWER', 'SMAP', 'GPM IMERG', 'Landsat NDVI', 'ECOSTRESS', 'TERN SoilGrid']
};

const regions = [iowaData, punjabData, nakuruData, darlingDownsData];

for (const region of regions) {
  fs.writeFileSync(
    path.join(REGIONS_DIR, `${region.region.id}.json`),
    JSON.stringify(region, null, 2)
  );
}

console.log(`Generated crops.json (${crops.length} crops) and ${regions.length} region files in ${PUBLIC_DATA_DIR}`);
