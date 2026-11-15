import { useEffect, useMemo, useRef, useState } from 'react';
import type { Crop, RegionDetail, RegionSummary } from '../types';

async function getJson<T>(url: string, what: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${what}.`);
  return res.json();
}

/**
 * Loads the static data in public/data: the region list and crop catalog once, then the selected
 * region's detail file. Region files are cached in memory, so going back to a region is instant.
 */
export function useSowcastData() {
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [regionDetail, setRegionDetail] = useState<RegionDetail | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<string, RegionDetail>());

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getJson<RegionSummary[]>('/data/regions/index.json', 'the region list'),
      getJson<Crop[]>('/data/crops.json', 'the crop catalog'),
    ])
      .then(([regionList, cropList]) => {
        if (cancelled) return;
        setRegions(regionList);
        setCrops(cropList);
        if (regionList.length > 0) setSelectedRegionId(regionList[0].id);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => {
        if (!cancelled) setLoadingInit(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedRegionId) return;
    setError(null);
    const cached = cache.current.get(selectedRegionId);
    if (cached) {
      setRegionDetail(cached);
      setLoadingRegion(false);
      return;
    }
    let cancelled = false;
    setLoadingRegion(true);
    getJson<RegionDetail>(`/data/regions/${selectedRegionId}.json`, 'this region')
      .then((detail) => {
        cache.current.set(selectedRegionId, detail);
        if (!cancelled) setRegionDetail(detail);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load region');
      })
      .finally(() => {
        if (!cancelled) setLoadingRegion(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRegionId]);

  const cropsMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])) as Record<string, Crop>, [crops]);

  return { regions, cropsMap, selectedRegionId, setSelectedRegionId, regionDetail, loadingInit, loadingRegion, error };
}
