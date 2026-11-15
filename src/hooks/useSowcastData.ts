import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Crop, RegionDetail, RegionSummary } from '../types';

async function getJson<T>(url: string, what: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${what} (HTTP ${res.status}). Check your connection and try again.`);
  return res.json();
}

// Module-level so prefetches started from anywhere (hovering a region, the command menu) are shared.
const regionCache = new Map<string, RegionDetail>();
const inFlight = new Map<string, Promise<RegionDetail>>();

function loadRegion(id: string): Promise<RegionDetail> {
  const pending = inFlight.get(id);
  if (pending) return pending;
  const p = getJson<RegionDetail>(`/data/regions/${id}.json`, 'this region')
    .then((detail) => {
      regionCache.set(id, detail);
      return detail;
    })
    .finally(() => inFlight.delete(id));
  inFlight.set(id, p);
  return p;
}

/** Start downloading a region in the background (e.g. on hover), so opening it is instant. */
export function prefetchRegion(id: string) {
  if (!regionCache.has(id)) loadRegion(id).catch(() => undefined);
}

/**
 * Loads the static data in public/data: the region list and crop catalog once, then the selected
 * region's detail. A cached region is shown immediately and re-checked in the background
 * (stale-while-revalidate), so returning to a region never shows a loader.
 */
export function useSowcastData() {
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [regionDetail, setRegionDetail] = useState<RegionDetail | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingInit(true);
    Promise.all([
      getJson<RegionSummary[]>('/data/regions/index.json', 'the region list'),
      getJson<Crop[]>('/data/crops.json', 'the crop catalog'),
    ])
      .then(([regionList, cropList]) => {
        if (cancelled) return;
        setError(null);
        setRegions(regionList);
        setCrops(cropList);
        setSelectedRegionId((cur) => cur || regionList[0]?.id || '');
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
  }, [attempt]);

  useEffect(() => {
    if (!selectedRegionId) return;
    let cancelled = false;
    const cached = regionCache.get(selectedRegionId);
    if (cached) {
      setRegionDetail(cached);
      setLoadingRegion(false);
      // Revalidate quietly; swap in the fresh copy only if the file changed.
      fetch(`/data/regions/${selectedRegionId}.json`, { cache: 'no-cache' })
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh: RegionDetail | null) => {
          if (!fresh || cancelled || JSON.stringify(fresh) === JSON.stringify(cached)) return;
          regionCache.set(selectedRegionId, fresh);
          setRegionDetail(fresh);
        })
        .catch(() => undefined);
    } else {
      setLoadingRegion(true);
      loadRegion(selectedRegionId)
        .then((detail) => {
          if (!cancelled) {
            setError(null);
            setRegionDetail(detail);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load region');
        })
        .finally(() => {
          if (!cancelled) setLoadingRegion(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [selectedRegionId, attempt]);

  const cropsMap = useMemo(() => Object.fromEntries(crops.map((c) => [c.id, c])) as Record<string, Crop>, [crops]);
  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { regions, cropsMap, selectedRegionId, setSelectedRegionId, regionDetail, loadingInit, loadingRegion, error, retry };
}
