// Goal re-ranking for the Crops page. The base `fit` comes from the data pipeline
// (data/inputs/make_data.py via data/scripts/05b_score_measured.py); a goal blends it with crop traits.
// Formulas moved verbatim from CropFitList — change them only together with the team's scoring rules.
import type { Crop, CropFitResult } from '../types';

export type GoalId = 'overall' | 'soil' | 'water' | 'nitrogen' | 'income';

export function goalScore(goal: GoalId, fit: number, crop: Crop): number {
  switch (goal) {
    case 'soil':
      return Math.round(fit * 0.45 + (crop.erosion_cover * 10 + crop.organic_matter * 10) * 0.55);
    case 'water': {
      const lowWaterPts = (6 - crop.water_need) * 18;
      const droughtBonus = crop.drought_tolerance >= 5 ? 15 : crop.drought_tolerance >= 4 ? 8 : 0;
      return Math.min(99, Math.round(fit * 0.4 + (lowWaterPts + droughtBonus) * 0.6));
    }
    case 'nitrogen':
      return Math.min(99, Math.round(fit * 0.45 + (crop.nitrogen_fixing ? 52 : 10) + crop.organic_matter * 3));
    case 'income':
      return Math.min(99, Math.round(fit * 0.45 + crop.market * 11));
    default:
      return fit;
  }
}

export interface RankedCrop extends CropFitResult {
  cropObj: Crop;
  goalScore: number;
}

/** Crops for a region, best first for the chosen goal. Crops missing from the catalog are skipped. */
export function rankCrops(cropFit: CropFitResult[], cropsMap: Record<string, Crop>, goal: GoalId): RankedCrop[] {
  return cropFit
    .flatMap((cf) => {
      const cropObj = cropsMap[cf.crop];
      return cropObj ? [{ ...cf, cropObj, goalScore: goalScore(goal, cf.fit, cropObj) }] : [];
    })
    .sort((a, b) => b.goalScore - a.goalScore);
}
