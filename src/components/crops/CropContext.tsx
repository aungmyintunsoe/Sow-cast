import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Crop, CropFitResult } from '../../types';

interface CropContextValue {
  cropsMap: Record<string, Crop>;
  /** The selected region's fit for each crop (planting window, harvest, score), when a region is loaded. */
  fitByCrop: Record<string, CropFitResult>;
  place: string | null;
}

const Ctx = createContext<CropContextValue>({ cropsMap: {}, fitByCrop: {}, place: null });

export function CropProvider({ cropsMap, cropFit, place, children }: { cropsMap: Record<string, Crop>; cropFit: CropFitResult[] | null; place: string | null; children: ReactNode }) {
  const value = useMemo(
    () => ({ cropsMap, fitByCrop: Object.fromEntries((cropFit ?? []).map((f) => [f.crop, f])), place }),
    [cropsMap, cropFit, place],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCrops = () => useContext(Ctx);

/** Short display name: "Groundnut (peanut)" → "Groundnut". Non-crop tokens get plain words. */
export function cropLabel(id: string, cropsMap: Record<string, Crop>, short = true) {
  if (id === 'fallow') return 'Fallow (bare)';
  if (id === 'perennial_tree') return 'Tree crops';
  const name = cropsMap[id]?.name ?? id;
  return short ? name.replace(/ \(.*\)$/, '') : name;
}
