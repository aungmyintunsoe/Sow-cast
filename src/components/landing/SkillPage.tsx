import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ClipboardCheck, Download, FileCode2, Globe2, Hammer, MessagesSquare, Monitor, Sprout, Terminal, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/format';
import { SPRING } from '../../lib/motion';
import { SeedGarden } from './SeedGarden';
import { CopyBlock, SiteNav } from './shared';

const REPO = 'https://github.com/aungmyintunsoe/Sow-cast';
const ZIP = `${REPO}/raw/main/skill/dist/sowcast-advisor.zip`;

const DOES: { Icon: LucideIcon; title: string; body: string }[] = [
  { Icon: Globe2, title: 'Explains your area', body: 'Rain month by month, the rainy season, hot days, dry spells, soil, and what is changing, with 2035 projections labelled as projections.' },
  { Icon: ClipboardCheck, title: 'Checks your own rotation', body: 'Tell it what you plant and when. It checks every crop against local rain, heat and soil, and the sequence for repeats, legumes and bare soil.' },
  { Icon: Sprout, title: 'Recommends rotations', body: 'Ranked options for your goal (soil health, income, saving water, low risk, low cost), each with months, reasons and what to check.' },
  { Icon: Hammer, title: 'Helps you switch', body: 'A trial plot, a season plan, inputs to buy, when to sow, where to sell, and which local office to ask.' },
];

const PROMPTS = [
  'I grow cassava every year near Khon Kaen and yields keep dropping. What should I rotate with?',
  'My farm is at 15.12, 105.80 in southern Laos. When should I plant maize, and is the rain enough?',
  'Check my rotation in Magway: groundnut in June, then chilli in October. I have a small well.',
  'Is it getting hotter or drier around Battambang? What does that mean for rice?',
  'What can I grow after rice in the dry season near Alor Setar without irrigation?',
  'Explain my soil at 20.15, 94.93 and what it means for groundnut.',
];

const TABS = [
  { id: 'code', label: 'Claude Code', Icon: Terminal },
  { id: 'app', label: 'Claude apps', Icon: Monitor },
  { id: 'clone', label: 'From the repo', Icon: FileCode2 },
] as const;

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-display text-sm font-bold text-white tabular-nums">{n}</span>
      <div className="min-w-0 flex-1 space-y-2 pt-1 text-stone-800">{children}</div>
    </li>
  );
}

/** What the Sowcast Claude skill is, what it does, how to install it, and how to use it. */
export function SkillPage({ onHome, onOpenApp }: { onHome: () => void; onOpenApp: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('code');

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SiteNav current="skill" onHome={onHome} onOpenApp={onOpenApp} onSkill={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-stone-200">
        <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:repeating-linear-gradient(-14deg,#e1f6e6_0_2px,transparent_2px_24px)]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-[max(1rem,env(safe-area-inset-left))] py-14 sm:py-20 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
            <SeedGarden className="mb-5 h-auto w-48 sm:w-56" />
            <h1 className="font-display text-[clamp(2.3rem,5vw,3.6rem)] font-bold leading-[1.05] tracking-[-0.03em] text-stone-950">Sowcast advisor for Claude</h1>
            <p className="mt-5 max-w-[54ch] text-lg leading-relaxed text-stone-700">
              A free skill that teaches Claude to read satellite weather and soil for any farm, judge a crop rotation month by month, and explain it in plain words. It carries the
              data for 31 Southeast Asian regions and knows where to look for everything else.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#install" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 font-bold text-white transition-colors hover:bg-brand-700">
                <Terminal className="h-5 w-5" aria-hidden="true" />
                Install it
              </a>
              <a href="#prompts" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-stone-900 bg-white px-5 font-bold text-stone-900 transition-colors hover:bg-stone-100">
                <MessagesSquare className="h-5 w-5" aria-hidden="true" />
                See what to ask
              </a>
            </div>
          </motion.div>

          {/* Example conversation (shortened from a real run of the skill's scripts) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.15 }}
            className="rounded-[26px] border border-white/60 bg-white/60 p-3 shadow-[0_30px_80px_-30px_rgba(20,40,20,0.45)] backdrop-blur-xl"
          >
            <div className="rounded-[20px] border-[1.5px] border-stone-900 bg-white p-5">
              <p className="mb-3 text-xs font-semibold text-stone-500">Example conversation, shortened</p>
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-stone-100 px-4 py-3 text-sm text-stone-900">
                I grow cassava every year near Khon Kaen. Sandy soil, no irrigation. Yields keep dropping. What should I change?
              </div>
              <div className="mt-4 flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white" aria-hidden="true">
                  <Sprout className="h-4 w-4" />
                </span>
                <div className="space-y-2 text-sm leading-relaxed text-stone-800">
                  <p>
                    <strong>Northeast Thailand (data: CHIRPS rain, NASA POWER temperature, 2001–2024).</strong> Cassava on the same sandy field every year is the main problem: it
                    drains nutrients and builds up pests.
                  </p>
                  <p>Rain falls May to October (about 1,270 mm a year), so a short legume fits before or after cassava.</p>
                  <p>
                    Try: <strong>groundnut (May–Aug), then cassava</strong>, or plough in <strong>sunn hemp</strong> at flowering before planting cassava. Start on one plot. The
                    Land Development Department gives out green-manure seed.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- What it does ---------- */}
      <section aria-labelledby="does-title" className="mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))] py-16 sm:py-20">
        <h2 id="does-title" className="font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">What it does</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOES.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border-[1.5px] border-stone-900 bg-white p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-stone-950">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-700">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-[75ch] text-sm text-stone-600">
          It works beyond the 31 bundled regions: for any coordinates it fetches 24 years of weather (ERA5, CHIRPS) and soil (SoilGrids) and runs the same checks. Every number
          comes with its source, and projections are labelled as projections.
        </p>
      </section>

      {/* ---------- Install ---------- */}
      <section id="install" aria-labelledby="install-title" className="scroll-mt-6 border-y border-stone-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-[max(1rem,env(safe-area-inset-left))]">
          <h2 id="install-title" className="font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Install it</h2>
          <p className="mt-3 text-stone-700">Pick where you use Claude. It takes about a minute.</p>
          <div role="tablist" aria-label="Where you use Claude" className="mt-6 flex flex-wrap gap-1 rounded-2xl bg-stone-100 p-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={cn('relative isolate inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold', tab === id ? 'text-stone-950' : 'text-stone-600 hover:text-stone-900')}
              >
                {tab === id && <motion.span layoutId="install-tab" transition={SPRING} className="absolute inset-0 -z-10 rounded-xl bg-white shadow-sm" />}
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div id={`panel-${tab}`} role="tabpanel" className="mt-6">
            {tab === 'code' && (
              <ol className="space-y-6">
                <Step n={1}>
                  <p>Open Claude Code (terminal, VS Code or the desktop app) and add the Sowcast marketplace:</p>
                  <CopyBlock label="add marketplace command" text="/plugin marketplace add aungmyintunsoe/Sow-cast" />
                </Step>
                <Step n={2}>
                  <p>Install the plugin:</p>
                  <CopyBlock label="install command" text="/plugin install sowcast@sowcast" />
                  <p className="text-sm text-stone-600">On Claude Code 2.1.275 or later, one line does both:</p>
                  <CopyBlock label="one-line install" text="/plugin install sowcast --marketplace aungmyintunsoe/Sow-cast" />
                </Step>
                <Step n={3}>
                  <p>Ask about a farm. The skill loads by itself, or call it directly with <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm">/sowcast:sowcast-advisor</code>.</p>
                </Step>
              </ol>
            )}
            {tab === 'app' && (
              <ol className="space-y-6">
                <Step n={1}>
                  <p>Download the skill:</p>
                  <a href={ZIP} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 font-bold text-white transition-colors hover:bg-brand-700">
                    <Download className="h-4 w-4" aria-hidden="true" />
                    sowcast-advisor.zip
                  </a>
                </Step>
                <Step n={2}>
                  <p>In Claude (claude.ai or the desktop app), open <strong>Settings → Capabilities</strong>, make sure code execution is on, then under <strong>Skills</strong> choose <strong>Upload skill</strong> and pick the zip.</p>
                </Step>
                <Step n={3}>
                  <p>Start a new chat and ask about a farm. If live data lookups are blocked there, the skill uses its bundled data and web search instead.</p>
                </Step>
              </ol>
            )}
            {tab === 'clone' && (
              <ol className="space-y-6">
                <Step n={1}>
                  <p>Clone the repository:</p>
                  <CopyBlock label="clone command" text={`git clone ${REPO}.git && cd Sow-cast`} />
                </Step>
                <Step n={2}>
                  <p>Copy the skill into your personal Claude Code skills folder:</p>
                  <CopyBlock label="install script" text="npm run skill:install" />
                </Step>
                <Step n={3}>
                  <p>Or test it straight from the repo without installing: open Claude Code in the folder and run the scripts it describes, e.g.</p>
                  <CopyBlock label="test command" text={'python skill/skills/sowcast-advisor/scripts/critique_rotation.py --region th-isan --plan "cassava@May | groundnut@May"'} />
                </Step>
              </ol>
            )}
          </div>
          <p className="mt-8 text-sm text-stone-600">
            Needs Python 3.9 or later (standard library only, except two optional extras). Live lookups need internet. Source and details:{' '}
            <a href={`${REPO}/tree/main/skill`} className="font-semibold text-brand-800 underline underline-offset-4">skill folder on GitHub</a>.
          </p>
        </div>
      </section>

      {/* ---------- Prompts ---------- */}
      <section id="prompts" aria-labelledby="prompts-title" className="scroll-mt-6 mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))] py-16 sm:py-20">
        <h2 id="prompts-title" className="font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Things to ask</h2>
        <p className="mt-3 max-w-[65ch] text-stone-700">Name a town or give coordinates. Say what you grow and when, and whether you have irrigation. Write in English, Burmese, Thai, Vietnamese, Khmer or Malay.</p>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {PROMPTS.map((p) => (
            <CopyBlock key={p} label="prompt" text={p} />
          ))}
        </div>
      </section>

      {/* ---------- Inside + FAQ ---------- */}
      <section aria-labelledby="inside-title" className="border-t border-stone-200 bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-[max(1rem,env(safe-area-inset-left))] lg:grid-cols-2">
          <div>
            <h2 id="inside-title" className="font-display text-3xl font-bold tracking-tight text-stone-950">How it works inside</h2>
            <ul className="mt-6 space-y-4 text-stone-800">
              {[
                ['Instructions', 'A short guide Claude follows: work out the question, locate the farm, check the data quality, answer in plain words with sources.'],
                ['Live data scripts', 'Fetch 2001–2024 weather and soil for any coordinates, test trends, and project to 2035.'],
                ['Rotation checker', 'Lays a rotation on a month calendar and checks each crop and the sequence, with a reason and a fix for every problem.'],
                ['Reference guides', 'Which sources to trust for what, analysis methods, rotation rules, crop notes, and how to put a plan into practice.'],
                ['Bundled data', 'The app’s data for 31 regions and 25 crops, including the team’s rotation recommender.'],
              ].map(([t, b]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
                  <span>
                    <strong className="text-stone-950">{t}.</strong> {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-stone-950">Questions</h2>
            <div className="mt-6 divide-y divide-stone-200 rounded-2xl border-[1.5px] border-stone-900">
              {[
                ['Do I need to know how to code?', 'No. Install it once, then just chat. Claude runs the scripts for you.'],
                ['Does it cost anything?', 'The skill and the data are free. You need a Claude plan that includes Claude Code or skills.'],
                ['Does it work outside Southeast Asia?', 'Yes for climate and soil (any coordinates). Crop advice is tuned to tropical Southeast Asia, and it says so when it is less sure.'],
                ['Where does my information go?', 'Your chat goes to Claude as usual. The skill’s scripts send only coordinates to the open data services (Open-Meteo, CHIRPS, SoilGrids, NASA).'],
                ['How accurate is it?', 'Weather and soil are measured or modelled from satellites. Crop and rotation scores are rules of thumb, not field trials. It always points you to local experts.'],
              ].map(([q, a]) => (
                <details key={q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-stone-950">
                    {q}
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-[max(1rem,env(safe-area-inset-left))] py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-[28px] bg-brand-950 px-6 py-10 text-white sm:flex-row sm:items-center sm:px-10">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Prefer clicking to chatting?</h2>
            <p className="mt-2 text-brand-100">The Sowcast app shows the same data on a map, with charts and a printable plan.</p>
          </div>
          <button type="button" onClick={onOpenApp} className="group inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-bold text-brand-950 transition-colors hover:bg-brand-50">
            Open Sowcast
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
