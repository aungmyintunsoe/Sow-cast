import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BookOpenText, CloudRain, Layers, Map, Mountain, Satellite, Sprout, Terminal, Thermometer, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/format';
import { SPRING } from '../../lib/motion';
import { ClawdGarden } from './ClawdGarden';
import { FieldMosaic } from './FieldMosaic';
import { CopyBlock, GlassShot, SiteNav } from './shared';

interface LandingPageProps {
  onOpenApp: () => void;
  onSkill: () => void;
  onHome: () => void;
}

const STEPS = [
  { n: 1, title: 'Pick your field', body: 'Choose one of 31 farming regions in Myanmar, Thailand, Vietnam, Cambodia and Malaysia, or tap the map.', img: '/landing/map.jpg', alt: 'Map of Southeast Asia coloured by plant greenness, with farming regions marked' },
  { n: 2, title: 'Read the satellite brief', body: 'Rain month by month, hot days, downpours and dry spells since 2001, with where each is heading by 2035.', img: '/landing/trends.jpg', alt: 'Charts of rain against crop water need and a yearly trend with a dashed projection to 2035' },
  { n: 3, title: 'Compare rotations', body: 'What farmers do now next to the best rotations for your goal, each with a month-by-month calendar. Or build your own.', img: '/landing/rotations.jpg', alt: 'Rotation cards with crop calendars and scores against current practice' },
  { n: 4, title: 'Take the plan to the field', body: 'A printable plan: the rotation, each crop, how to grow it, notes on your area and a season checklist.', img: '/landing/plan.jpg', alt: 'A printable crop rotation plan document' },
];

const SOURCES = [
  { Icon: CloudRain, name: 'CHIRPS rain', what: 'Daily rain from satellites and gauges, about 5 km' },
  { Icon: Thermometer, name: 'NASA POWER and ERA5', what: 'Daily temperature and crop water demand' },
  { Icon: Satellite, name: 'NASA MODIS and VIIRS', what: 'Monthly plant greenness and satellite images' },
  { Icon: Layers, name: 'ISRIC SoilGrids', what: 'Soil texture, organic matter and water holding' },
  { Icon: Mountain, name: 'NASA SRTM', what: 'Elevation and slope, 30 m' },
  { Icon: BookOpenText, name: 'Field studies', what: 'Crop traits, calendars and rotations from the literature' },
];

const rise = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };

/** The landing page: what Sowcast is, what it looks like, where its data comes from, and the two ways in (app, Claude skill). */
export function LandingPage({ onOpenApp, onSkill, onHome }: LandingPageProps) {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const step = STEPS[active];

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden">
        <FieldMosaic />
        <SiteNav current="home" overHero onHome={onHome} onOpenApp={onOpenApp} onSkill={onSkill} />
        <div className="relative mx-auto grid min-h-[min(92svh,860px)] max-w-6xl items-center gap-10 px-[max(1rem,env(safe-area-inset-left))] pb-20 pt-28 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.09, delayChildren: 0.1 }}
            className="rounded-[28px] border-[1.5px] border-stone-900 bg-white/80 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-9"
          >
            <motion.p variants={rise} transition={SPRING} className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-600" />
              </span>
              24 years of satellite data, read for your field
            </motion.p>
            <motion.h1 variants={rise} transition={SPRING} className="mt-5 font-display text-[clamp(2.4rem,5.4vw,4.1rem)] font-bold leading-[1.02] tracking-[-0.03em] text-stone-950">
              Know what your land can grow before you plant it.
            </motion.h1>
            <motion.p variants={rise} transition={SPRING} className="mt-5 max-w-[52ch] text-lg leading-relaxed text-stone-700">
              Sowcast turns NASA and open satellite records into a rain calendar, a 2035 outlook and crop rotations for your area, then hands you a plan you can print.
            </motion.p>
            <motion.div variants={rise} transition={SPRING} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onOpenApp}
                className="group inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-base font-bold text-white shadow-[0_10px_30px_-10px_rgba(44,135,66,0.9)] transition-[background-color,transform] hover:bg-brand-700 active:scale-[0.98]"
              >
                <Map className="h-5 w-5" aria-hidden="true" />
                Open Sowcast
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onSkill}
                className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-stone-900 bg-white px-6 text-base font-bold text-stone-900 transition-colors hover:bg-stone-100"
              >
                <Terminal className="h-5 w-5" aria-hidden="true" />
                Use it in Claude
              </button>
            </motion.div>
            <motion.dl variants={rise} transition={SPRING} className="mt-8 grid grid-cols-3 gap-4 border-t border-stone-200 pt-5">
              {[
                ['31', 'farming regions'],
                ['25', 'crops scored'],
                ['24 yrs', 'daily data, 2001–2024'],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-2xl font-bold tabular-nums text-stone-950">{v}</dd>
                  <dd className="text-sm text-stone-600">{l}</dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          <motion.div
            className="hidden lg:block"
            initial={reduce ? false : { opacity: 0, x: 40, rotateY: -16 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ ...SPRING, delay: 0.35 }}
          >
            <GlassShot priority src="/landing/outlook.jpg" alt="Sowcast satellite brief: what the trends mean for a farm by 2035" tilt={-8} className="translate-x-6" />
          </motion.div>
        </div>
      </section>

      {/* ---------- Showcase ---------- */}
      <section aria-labelledby="see-title" className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute -left-40 top-10 h-[28rem] w-[28rem] rounded-full bg-brand-300/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-soil-300/50 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))]">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={SPRING} className="max-w-2xl">
            <h2 id="see-title" className="font-display text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl">From orbit to the furrow.</h2>
            <p className="mt-4 text-lg text-stone-700">
              Every screen answers one farmer question: what is the weather really like here, what is changing, and what should I plant next.
            </p>
          </motion.div>
          <div className="mt-12 grid gap-8 lg:grid-cols-12">
            <GlassShot className="lg:col-span-7" src="/landing/satellite.jpg" alt="Satellite images of the area in its barest and greenest months" caption="Your area from space: bare in the dry season, green at the peak." />
            <div className="grid gap-8 lg:col-span-5">
              <GlassShot src="/landing/builder.jpg" alt="Rotation builder with crops placed on a month grid" caption="Lay out your own rotation, month by month." />
              <GlassShot src="/landing/crops.jpg" alt="Crops ranked for saving water" caption="Rank crops for what matters to you." />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works (a real sequence: the app's four steps) ---------- */}
      <section aria-labelledby="how-title" className="border-y border-stone-200 bg-white py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-[max(1rem,env(safe-area-inset-left))] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <h2 id="how-title" className="font-display text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl">Four steps, one field.</h2>
            <p className="mt-4 text-lg text-stone-700">No account, no setup. Pick a place and Sowcast does the reading.</p>
            <ol className="mt-8 space-y-2" role="tablist" aria-label="Steps">
              {STEPS.map((s, i) => (
                <li key={s.n}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active === i}
                    onClick={() => setActive(i)}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)}
                    className={cn('relative isolate flex w-full gap-4 rounded-2xl p-4 text-left transition-colors', active === i ? 'text-stone-950' : 'text-stone-600 hover:text-stone-900')}
                  >
                    {active === i && <motion.span layoutId="how-active" transition={SPRING} className="absolute inset-0 -z-10 rounded-2xl border-[1.5px] border-stone-900 bg-brand-50" />}
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display font-bold tabular-nums', active === i ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-600')}>
                      {s.n}
                    </span>
                    <span>
                      <span className="block text-lg font-bold">{s.title}</span>
                      <span className="mt-0.5 block text-sm leading-relaxed">{s.body}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <button type="button" onClick={onOpenApp} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-900 px-5 font-bold text-white transition-colors hover:bg-stone-800">
              Start with step 1
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="relative rounded-[28px] bg-[linear-gradient(135deg,#c5eccf,#eed9ce)] p-4 sm:p-8" role="tabpanel" aria-label={step.title}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step.img} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <GlassShot src={step.img} alt={step.alt} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ---------- Data ---------- */}
      <section aria-labelledby="data-title" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <h2 id="data-title" className="font-display text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl">Every number has a source.</h2>
              <p className="mt-4 text-lg text-stone-700">
                Open data, checked for known faults, with projections marked as projections. The methods page shows exactly how each figure is made.
              </p>
            </div>
            <TrendingUp className="hidden h-16 w-16 text-brand-600 sm:block" aria-hidden="true" />
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCES.map(({ Icon, name, what }, i) => (
              <motion.li
                key={name}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ ...SPRING, delay: i * 0.05 }}
                className="flex gap-4 rounded-2xl border-[1.5px] border-stone-900 bg-white p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-bold text-stone-950">{name}</span>
                  <span className="block text-sm text-stone-600">{what}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Claude skill ---------- */}
      <section aria-labelledby="skill-title" className="px-[max(1rem,env(safe-area-inset-left))] pb-20 sm:pb-28">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-brand-950 px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-14deg,#fff_0_2px,transparent_2px_26px)]" aria-hidden="true" />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <ClawdGarden className="mb-6 h-auto w-56 [image-rendering:pixelated] sm:w-64" />
              <h2 id="skill-title" className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Ask Claude about your farm.</h2>
              <p className="mt-4 max-w-[52ch] text-lg text-brand-100">
                The Sowcast advisor skill gives Claude the same data and methods, plus live lookups for any location. It explains your climate, checks your own rotation month by month, and helps you put a new one into practice.
              </p>
              <button
                type="button"
                onClick={onSkill}
                className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-bold text-brand-950 transition-colors hover:bg-brand-50"
              >
                How to install and use it
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur sm:p-5">
              <p className="text-sm font-semibold text-brand-200">In Claude Code</p>
              <CopyBlock dark label="add marketplace command" text="/plugin marketplace add aungmyintunsoe/Sow-cast" />
              <CopyBlock dark label="install command" text="/plugin install sowcast@sowcast" />
              <p className="pt-2 text-sm font-semibold text-brand-200">Then ask</p>
              <CopyBlock dark label="example prompt" text="I grow cassava every year near Khon Kaen and yields keep dropping. What should I rotate with?" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Final call to action ---------- */}
      <section className="relative isolate overflow-hidden">
        <FieldMosaic />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-[max(1rem,env(safe-area-inset-left))] py-24 sm:py-32">
          <div className="max-w-xl rounded-[28px] border-[1.5px] border-stone-900 bg-white/85 p-7 backdrop-blur-xl sm:p-9">
            <h2 className="font-display text-4xl font-bold tracking-tight text-stone-950">Your next season starts with a map.</h2>
            <p className="mt-3 text-lg text-stone-700">Pick your area and see what the satellites have been saying about it.</p>
            <button
              type="button"
              onClick={onOpenApp}
              className="group mt-7 inline-flex min-h-[3.25rem] items-center gap-2 rounded-2xl bg-brand-600 px-6 text-base font-bold text-white transition-colors hover:bg-brand-700"
            >
              <Sprout className="h-5 w-5" aria-hidden="true" />
              Open Sowcast
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-sm text-stone-600">
        <p className="mx-auto max-w-[72ch] text-pretty">
          Built for the NASA Space Apps Challenge with open data from NASA, CHIRPS, ECMWF ERA5 and ISRIC. Sowcast suggests options; check with a local agricultural expert before changing your rotation.
        </p>
      </footer>
    </div>
  );
}
