import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Map,
  Satellite,
  RefreshCw,
  Sprout,
  Sun,
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
  { id: 'map', label: '1. Pick Field', shortLabel: '1. Map', icon: <Map className="w-4 h-4" /> },
  {
    id: 'brief',
    label: '2. Satellite Brief',
    shortLabel: '2. Sky & Soil',
    icon: <Satellite className="w-4 h-4" />,
  },
  {
    id: 'rotations',
    label: '3. Compare Rotations',
    shortLabel: '3. Rotations',
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    id: 'crops',
    label: '4. Best Crops',
    shortLabel: '4. Crops',
    icon: <Sprout className="w-4 h-4" />,
  },
];

export function App() {
  const [step, setStep] = useState<StepId>('map');
  const [sunMode, setSunMode] = useState(false);

  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('iowa');
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
    <div className={`min-h-screen flex flex-col ${sunMode ? 'sun-mode' : 'bg-stone-50 text-stone-900'}`}>
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
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-nasa-blue border border-blue-200 px-2 py-0.5 rounded-full">
                  NASA Space Apps · Field Shift
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">
                20+ years of satellite data turned into plain crop-rotation decisions
              </p>
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
                  {regionDetail.region.name}, {regionDetail.region.place}
                </span>
              </button>
            )}

            <button
              onClick={() => setSunMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                sunMode
                  ? 'bg-amber-400 text-stone-950 border-stone-900'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
              title="Boost contrast for bright outdoor sunlight"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{sunMode ? 'Sun Mode ON' : 'Outdoor Mode'}</span>
            </button>
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
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition ${
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
                <FieldBrief data={regionDetail} onContinue={() => setStep('rotations')} />
              )}

              {step === 'rotations' && !loadingRegion && regionDetail && (
                <RotationCompare
                  regionName={`${regionDetail.region.name}, ${regionDetail.region.place}`}
                  rotations={regionDetail.rotations}
                  cropsMap={cropsMap}
                  onContinue={() => setStep('crops')}
                />
              )}

              {step === 'crops' && !loadingRegion && regionDetail && (
                <CropFitList
                  regionName={`${regionDetail.region.name}, ${regionDetail.region.place}`}
                  cropFit={regionDetail.crop_fit}
                  cropsMap={cropsMap}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 px-4 text-center text-xs text-stone-500">
        Sowcast Demo · Built with static NASA/soil data in <code className="bg-stone-100 px-1 py-0.5 rounded">/public/data</code> · No backend or API keys required
      </footer>
    </div>
  );
}

export default App;
