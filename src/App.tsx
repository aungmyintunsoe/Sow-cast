import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useSowcastData } from './hooks/useSowcastData';
import { AppHeader } from './components/layout/AppHeader';
import { CommandMenu } from './components/layout/CommandMenu';
import { Button } from './components/ui/Button';
import { PageSkeleton } from './components/ui/Skeleton';
import { FADE } from './lib/motion';
import { PAGE_IDS, stepLoaders, type PageId } from './lib/stepLoaders';
import { CropProvider } from './components/crops/CropContext';
import type { PlanGoal } from './types';

const FieldMap = lazy(() => stepLoaders.map().then((m) => ({ default: m.FieldMap })));
const FieldBrief = lazy(() => stepLoaders.brief().then((m) => ({ default: m.FieldBrief })));
const RotationCompare = lazy(() => stepLoaders.rotations().then((m) => ({ default: m.RotationCompare })));
const CropFitList = lazy(() => stepLoaders.crops().then((m) => ({ default: m.CropFitList })));
const RotationBuilder = lazy(() => stepLoaders.build().then((m) => ({ default: m.RotationBuilder })));
const MethodsPage = lazy(() => stepLoaders.methods().then((m) => ({ default: m.MethodsPage })));
const LandingPage = lazy(() => stepLoaders.home().then((m) => ({ default: m.LandingPage })));
const SkillPage = lazy(() => stepLoaders.skill().then((m) => ({ default: m.SkillPage })));
const PlanDocument = lazy(() => import('./components/plan/PlanDocument').then((m) => ({ default: m.PlanDocument })));

const pageFromUrl = (): PageId => {
  const s = new URLSearchParams(window.location.search).get('step');
  // No step in the URL: the landing page
  return PAGE_IDS.includes(s as PageId) ? (s as PageId) : 'home';
};

// Earlier versions kept a "chosen plan" in this browser. Nothing is stored any more, so clear it.
try {
  localStorage.removeItem('sowcast:chosen-plans');
} catch {
  /* storage unavailable: nothing to clear */
}

/** The printable plan opens as its own page (?view=plan&region=…&plan=…), so browser translation works on it. */
export default function App() {
  const q = new URLSearchParams(window.location.search);
  if (q.get('view') === 'plan' && q.get('region') && q.get('plan')) {
    return (
      <Suspense fallback={<p className="p-8 text-stone-600">Preparing your plan…</p>}>
        <PlanDocument regionId={q.get('region')!} planId={q.get('plan')!} goal={(q.get('goal') as PlanGoal | null) ?? null} autoPrint={q.get('print') === '1'} />
      </Suspense>
    );
  }
  return <MainApp />;
}

function MainApp() {
  const [step, setStep] = useState<PageId>(pageFromUrl);
  const [menuOpen, setMenuOpen] = useState(false);
  const [planGoal, setPlanGoal] = useState<PlanGoal>('balanced');
  const { regions, cropsMap, selectedRegionId, setSelectedRegionId, regionDetail, loadingInit, loadingRegion, error, retry } = useSowcastData();

  useEffect(() => {
    const TITLES: Record<PageId, string> = {
      home: 'Sowcast: crop rotations from satellite data',
      skill: 'Sowcast advisor for Claude',
      map: 'Pick your field | Sowcast',
      brief: 'Satellite brief | Sowcast',
      rotations: 'Compare rotations | Sowcast',
      crops: 'Best crops | Sowcast',
      build: 'Build your own rotation | Sowcast',
      methods: 'How the data was analysed | Sowcast',
    };
    document.title = TITLES[step];
  }, [step]);

  // Pages live in the browser history, so the Back button / back gesture returns to the previous page.
  const stepRef = useRef(step);
  stepRef.current = step;
  const goTo = useCallback((next: PageId) => {
    if (stepRef.current !== next) window.history.pushState({ step: next }, '', `?step=${next}`);
    setStep(next);
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    window.history.replaceState({ step: pageFromUrl() }, '', window.location.search || '?step=home');
    const onPop = () => setStep(pageFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // "Download PDF": the plan document opens in a new tab and brings up the print dialog (Save as PDF).
  const downloadPlan = (planId: string) => {
    const url = `?view=plan&region=${encodeURIComponent(selectedRegionId)}&plan=${encodeURIComponent(planId)}&goal=${planGoal}&print=1`;
    window.open(url, '_blank', 'noopener');
  };

  const regionLabel = regionDetail ? `${regionDetail.region.name}, ${regionDetail.region.country}` : null;

  // Landing and skill pages have their own full-width layout (no app header or footer)
  if (step === 'home' || step === 'skill') {
    const nav = { onHome: () => goTo('home'), onOpenApp: () => goTo('map') };
    return (
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<div className="min-h-dvh bg-stone-50" />}>
          {step === 'home' ? <LandingPage {...nav} onSkill={() => goTo('skill')} /> : <SkillPage {...nav} />}
        </Suspense>
      </MotionConfig>
    );
  }
  const detail = !loadingRegion ? regionDetail : null;
  const skeleton = <PageSkeleton variant={step === 'build' ? 'rotations' : step === 'methods' ? 'crops' : step} />;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh flex flex-col bg-stone-50 text-stone-900">
        <AppHeader step={step} onStepChange={goTo} onHome={() => goTo('home')} regionLabel={regionLabel} onOpenMenu={() => setMenuOpen(true)} />

        <CropProvider cropsMap={cropsMap} cropFit={detail?.crop_fit ?? null} place={detail?.region.place ?? null}>
          <main className="flex-1 max-w-6xl w-full mx-auto px-[max(1rem,env(safe-area-inset-left))] py-6 sm:py-8">
            {error && (
              <div role="alert" className="mb-6 bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 flex flex-wrap items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm font-medium flex-1 min-w-[16rem]">{error}</p>
                <Button variant="secondary" size="sm" onClick={retry}>
                  Try again
                </Button>
              </div>
            )}

            {loadingInit ? (
              skeleton
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                {/* Keyed by page only: regions change on the map step, and re-keying there would rebuild the map. */}
                <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={FADE}>
                  <Suspense fallback={skeleton}>
                    {step === 'map' && (
                      <FieldMap regions={regions} selectedRegionId={selectedRegionId} onSelectRegion={setSelectedRegionId} onContinue={() => goTo('brief')} onOpenSearch={() => setMenuOpen(true)} />
                    )}
                    {step !== 'map' && step !== 'methods' && loadingRegion && skeleton}
                    {step === 'brief' && detail && (
                      <FieldBrief data={detail} cropsMap={cropsMap} onContinue={() => goTo('rotations')} onOpenMethods={() => goTo('methods')} />
                    )}
                    {step === 'rotations' && detail && regionLabel && (
                      <RotationCompare
                        regionName={regionLabel}
                        detail={detail}
                        goal={planGoal}
                        onGoalChange={setPlanGoal}
                        onDownload={downloadPlan}
                        onBuildOwn={() => goTo('build')}
                        onContinue={() => goTo('crops')}
                      />
                    )}
                    {step === 'crops' && detail && regionLabel && <CropFitList regionName={regionLabel} cropFit={detail.crop_fit} cropsMap={cropsMap} />}
                    {step === 'build' && detail && regionLabel && <RotationBuilder regionName={regionLabel} detail={detail} onBack={() => goTo('rotations')} />}
                    {step === 'methods' && <MethodsPage onBack={() => window.history.back()} />}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </CropProvider>

        <footer className="border-t border-stone-200 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-stone-600">
          <p className="mx-auto max-w-[70ch] text-pretty">
            Sowcast suggests options from satellite patterns. It doesn't replace an agronomist, so check with a local agricultural expert before you change your rotation.
          </p>
          <button type="button" onClick={() => goTo('methods')} className="mt-2 inline-flex min-h-10 items-center rounded-lg px-2 font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-950">
            How the data was analysed: methods and sources
          </button>
        </footer>

        <CommandMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          regions={regions}
          currentRegionId={selectedRegionId}
          onSelectRegion={setSelectedRegionId}
          onSelectStep={goTo}
        />
      </div>
    </MotionConfig>
  );
}
