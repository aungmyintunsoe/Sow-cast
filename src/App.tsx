import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  Map,
  Satellite,
  RefreshCw,
  Sprout,
  MapPin,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { Crop, RegionDetail, RegionSummary } from './types';
import { FieldMap } from './components/FieldMap';
import { FieldBrief } from './components/FieldBrief';
import { RotationCompare } from './components/RotationCompare';
import { CropFitList } from './components/CropFitList';

type StepId = 'map' | 'brief' | 'rotations' | 'crops';

const STEPS: { id: StepId; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { id: 'map', label: '1. Pick Field', shortLabel: 'Field', icon: <Map className="w-4 h-4" /> },
  {
    id: 'brief',
    label: '2. Satellite Brief',
    shortLabel: 'Brief',
    icon: <Satellite className="w-4 h-4" />,
  },
  {
    id: 'rotations',
    label: '3. Compare Rotations',
    shortLabel: 'Rotations',
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    id: 'crops',
    label: '4. Best Crops',
    shortLabel: 'Crops',
    icon: <Sprout className="w-4 h-4" />,
  },
];

export function App() {
  // ?step=brief|rotations|crops opens a page directly (handy for comparing designs page by page)
  const [step, setStep] = useState<StepId>(() => {
    const s = new URLSearchParams(window.location.search).get('step');
    return STEPS.some((x) => x.id === s) ? (s as StepId) : 'map';
  });

  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [regionDetail, setRegionDetail] = useState<RegionDetail | null>(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial regions index and crops catalog
  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      try {
        const [regRes, cropRes] = await Promise.all([
          fetch('/data/regions/index.json'),
          fetch('/data/crops.json'),
        ]);
        if (!regRes.ok || !cropRes.ok) {
          throw new Error('Could not load static data files from /data.');
        }
        const regData: RegionSummary[] = await regRes.json();
        const cropData: Crop[] = await cropRes.json();
        if (!cancelled) {
          setRegions(regData);
          setCrops(cropData);
          if (regData.length > 0) {
            setSelectedRegionId(regData[0].id);
          }
          setLoadingInit(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
          setLoadingInit(false);
        }
      }
    }
    loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load selected region details
  useEffect(() => {
    if (!selectedRegionId) return;
    let cancelled = false;
    async function loadRegion() {
      setLoadingRegion(true);
      try {
        const res = await fetch(`/data/regions/${selectedRegionId}.json`);
        if (!res.ok) throw new Error(`Failed to load region: ${selectedRegionId}`);
        const detail: RegionDetail = await res.json();
        if (!cancelled) {
          setRegionDetail(detail);
          setLoadingRegion(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load region');
          setLoadingRegion(false);
        }
      }
    }
    loadRegion();
    return () => {
      cancelled = true;
    };
  }, [selectedRegionId]);

  const cropsMap = useMemo(() => {
    const map: Record<string, Crop> = {};
    for (const c of crops) {
      map[c.id] = c;
    }
    return map;
  }, [crops]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xl shadow-sm">
              🌱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg sm:text-xl tracking-tight text-stone-900">
                  Sowcast
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold bg-blue-50 text-nasa-blue border border-blue-200 px-2 py-0.5 rounded-full">
                  NASA Space Apps · Field Shift
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {regionDetail && (
              <button
                onClick={() => setStep('map')}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 transition"
                title="Change field location"
              >
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span className="max-w-[140px] sm:max-w-none truncate">
                  {regionDetail.region.name}, {regionDetail.region.country}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Step Navigation Bar */}
        <div className="max-w-6xl mx-auto px-4 pb-2.5">
          <nav className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {STEPS.map((s) => {
              const active = step === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  aria-current={active ? 'step' : undefined}
                  className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1.5 py-1.5 md:py-2 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs md:text-sm font-bold whitespace-nowrap transition ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {s.icon}
                  <span className="hidden md:inline">{s.label}</span>
                  <span className="md:hidden">{s.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:py-7">
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {loadingInit ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-stone-500">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-sm font-semibold">Loading field profiles & crop library…</p>
          </div>
        ) : (
          <MotionConfig reducedMotion="user">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${step}-${selectedRegionId}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {step === 'map' && (
                <FieldMap
                  regions={regions}
                  selectedRegionId={selectedRegionId}
                  onSelectRegion={(id) => setSelectedRegionId(id)}
                  onContinue={() => setStep('brief')}
                />
              )}

              {step !== 'map' && loadingRegion && (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-500">
                  <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
                  <p className="text-sm font-semibold">Loading satellite summary…</p>
                </div>
              )}

              {step === 'brief' && !loadingRegion && regionDetail && (
                <FieldBrief data={regionDetail} cropsMap={cropsMap} onContinue={() => setStep('rotations')} />
              )}

              {step === 'rotations' && !loadingRegion && regionDetail && (
                <RotationCompare
                  regionName={`${regionDetail.region.name}, ${regionDetail.region.country}`}
                  rotations={regionDetail.rotations}
                  cropsMap={cropsMap}
                  onContinue={() => setStep('crops')}
                />
              )}

              {step === 'crops' && !loadingRegion && regionDetail && (
                <CropFitList
                  regionName={`${regionDetail.region.name}, ${regionDetail.region.country}`}
                  cropFit={regionDetail.crop_fit}
                  cropsMap={cropsMap}
                />
              )}
            </motion.div>
          </AnimatePresence>
          </MotionConfig>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 px-4 text-center text-xs text-stone-600">
        Sowcast suggests options from satellite patterns. It doesn't replace an agronomist, so check with a local agricultural expert before you change your rotation.
      </footer>
    </div>
  );
}

export default App;
