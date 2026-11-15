import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useSowcastData } from './hooks/useSowcastData';
import { AppHeader, STEPS, type StepId } from './components/layout/AppHeader';

// Each step loads on demand, so the map library (Leaflet) and the chart library (Recharts) are only
// downloaded when their step is opened.
const FieldMap = lazy(() => import('./components/map/FieldMap').then((m) => ({ default: m.FieldMap })));
const FieldBrief = lazy(() => import('./components/brief/FieldBrief').then((m) => ({ default: m.FieldBrief })));
const RotationCompare = lazy(() => import('./components/rotations/RotationCompare').then((m) => ({ default: m.RotationCompare })));
const CropFitList = lazy(() => import('./components/crops/CropFitList').then((m) => ({ default: m.CropFitList })));

/** ?step=brief|rotations|crops opens a page directly (handy for demos and testing). */
function initialStep(): StepId {
  const s = new URLSearchParams(window.location.search).get('step');
  return STEPS.some((x) => x.id === s) ? (s as StepId) : 'map';
}

function Loading({ text }: { text: string }) {
  return (
    <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-500">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      <p className="text-sm font-semibold">{text}</p>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState<StepId>(initialStep);
  const { regions, cropsMap, selectedRegionId, setSelectedRegionId, regionDetail, loadingInit, loadingRegion, error } = useSowcastData();
  const regionLabel = regionDetail ? `${regionDetail.region.name}, ${regionDetail.region.country}` : null;
  const detail = !loadingRegion ? regionDetail : null;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <AppHeader step={step} onStepChange={setStep} regionLabel={regionLabel} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:py-7">
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {loadingInit ? (
          <Loading text="Loading field profiles & crop library…" />
        ) : (
          <MotionConfig reducedMotion="user">
            <AnimatePresence mode="wait">
              {/* Keyed by step only: regions change on the map step, and re-keying there would rebuild the map. */}
              <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <Suspense fallback={<Loading text="Loading…" />}>
                {step === 'map' && (
                  <FieldMap regions={regions} selectedRegionId={selectedRegionId} onSelectRegion={setSelectedRegionId} onContinue={() => setStep('brief')} />
                )}
                {step !== 'map' && loadingRegion && <Loading text="Loading satellite summary…" />}
                {step === 'brief' && detail && <FieldBrief data={detail} cropsMap={cropsMap} onContinue={() => setStep('rotations')} />}
                {step === 'rotations' && detail && regionLabel && (
                  <RotationCompare regionName={regionLabel} rotations={detail.rotations} cropsMap={cropsMap} onContinue={() => setStep('crops')} />
                )}
                {step === 'crops' && detail && regionLabel && <CropFitList regionName={regionLabel} cropFit={detail.crop_fit} cropsMap={cropsMap} />}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </MotionConfig>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white py-4 px-4 text-center text-xs text-stone-600">
        Sowcast suggests options from satellite patterns. It doesn't replace an agronomist, so check with a local agricultural expert before you change your rotation.
      </footer>
    </div>
  );
}
