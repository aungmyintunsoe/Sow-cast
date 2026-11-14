export type RootDepth = 'shallow' | 'medium' | 'deep';

export interface Crop {
  id: string;
  name: string;
  family: string;
  season: 'summer' | 'winter' | 'spring' | 'fall' | 'year-round';
  water_need: number; // 1-5
  nitrogen_fixing: boolean;
  root_depth: RootDepth;
  drought_tolerance: 'low' | 'moderate' | 'high' | 'very high';
  frost_tolerance: 'low' | 'moderate' | 'high' | 'very high';
  temp_min_c: number;
  temp_max_c: number;
  season_days: number;
  erosion_cover: number; // 1-5
  organic_matter: number; // 1-5
  market: number; // 1-5
  forage_value: number; // 1-5
  pest_notes: string;
  plain_description: string;
}

export interface RegionSummary {
  id: string;
  name: string;
  place: string;
  lat: number;
  lon: number;
  thumbnail?: string;
  tagline?: string;
}

export interface MonthlyClimate {
  month: number; // 1-12
  tmax_c: number;
  tmin_c: number;
  precip_mm: number;
  soil_moisture: number; // 0-1 volumetric fraction or index
  et_mm: number; // evapotranspiration
  ndvi: number; // 0-1 greenness
  frost_days: number;
  heat_days: number;
  heavy_rain_days: number;
  typically_bare: boolean;
}

export interface AnnualClimate {
  year: number; // 2001-2024
  heat_days: number;
  precip_mm: number;
  heavy_rain_days: number;
  groundwater_anomaly_cm: number;
  growing_season_days: number;
}

export interface ClimateTrends {
  heat_days_per_decade: number;
  precip_change_pct: number;
  heavy_rain_change_pct: number;
  groundwater: 'rapidly declining' | 'declining' | 'stable' | 'recharging';
}

export interface SoilProfile {
  texture: string;
  organic_matter: 'very low' | 'low' | 'moderate' | 'good' | 'high';
  drainage: 'poor' | 'moderate' | 'well' | 'excessive';
  slope_pct: number;
  erosion_risk: 'low' | 'medium' | 'high' | 'severe';
  water_holding: 'low' | 'moderate' | 'high';
  source: string;
}

export interface CurrentCropCalendar {
  crop: string;
  months: number[]; // 1-12
}

export interface PlainInsight {
  title: string;
  body: string;
  source: string; // e.g. "Landsat NDVI", "NASA POWER", "SMAP"
  confidence: 'high' | 'medium' | 'experimental';
  badgeType?: 'warning' | 'opportunity' | 'neutral';
}

export interface RotationScores {
  soil: number; // 1-5
  water: number; // 1-5
  erosion: number; // 1-5
  income: number; // 1-5
  pest_break: number; // 1-5
}

export interface RotationOption {
  id: string;
  label: string; // "Current", "Option A", "Option B"
  name: string; // e.g. "Corn → Soybean"
  tagline?: string;
  sequence: string[]; // crop IDs in order
  cover_by_month: number[]; // 12 elements: 0 = bare soil, 1 = living plant cover
  scores: RotationScores;
  why: string;
  evidence: string[]; // satellite missions cited, e.g. ["GPM IMERG", "Landsat NDVI"]
  benefits: string[];
  gaps: string[]; // unknowns
  risks: string[]; // risks to check locally
}

export interface CropFitResult {
  crop: string; // crop ID
  fit: number; // 0-100 score
  trend: 'increasing' | 'flat' | 'declining';
  limits: string[]; // plain language limiting factors (e.g., "high summer frost risk", "water deficit in July")
}

export interface RegionDetail {
  region: {
    id: string;
    name: string;
    place: string;
    lat: number;
    lon: number;
  };
  monthly: MonthlyClimate[];
  annual: AnnualClimate[];
  trends: ClimateTrends;
  soil: SoilProfile;
  current_rotation: CurrentCropCalendar[];
  insights: PlainInsight[];
  rotations: RotationOption[];
  crop_fit: CropFitResult[];
  sources: string[];
}
