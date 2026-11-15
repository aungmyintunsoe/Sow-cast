import { useEffect, useMemo, useState } from 'react';
import { CropIcon } from '../../lib/cropIcons';
import { ArrowLeft, ArrowRight, Languages, Printer } from 'lucide-react';
import type { Crop, PlanGoal, RegionDetail, RotationPlan } from '../../types';
import { MONTHS_SHORT, capitalize } from '../../lib/format';
import { Button } from '../ui/Button';
import { CropProvider, cropLabel } from '../crops/CropContext';
import { CropCalendar } from '../rotations/CropCalendar';
import { SCORE_ROWS } from '../rotations/RotationCard';
import { PLAN_GOALS } from '../rotations/RotationCompare';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LEVEL = ['', 'very low', 'low', 'medium', 'high', 'very high'];
const level = (v: number | null) => (v ? LEVEL[v] : 'unknown');
const RISK = ['none', 'low', 'medium', 'high'];

function findPlan(d: RegionDetail, id: string, goal: PlanGoal | null): RotationPlan | null {
  if (d.plans.current?.id === id) return d.plans.current;
  if (goal) {
    const hit = d.plans.by_goal[goal]?.find((p) => p.id === id);
    if (hit) return hit;
  }
  for (const list of Object.values(d.plans.by_goal)) {
    const hit = list.find((p) => p.id === id);
    if (hit) return hit;
  }
  return null;
}

/** Month-by-month to-do list built from the plan calendar and each crop's season length. */
function buildChecklist(plan: RotationPlan, d: RegionDetail, cropsMap: Record<string, Crop>) {
  const items: { month: number; year: string; text: string }[] = [];
  for (const row of plan.calendar?.rows ?? []) {
    const cells = row.cells;
    for (let m = 0; m < 12; m++) {
      const id = cells[m];
      const prev = cells[(m + 11) % 12];
      if (!id || id === prev || id === 'perennial_tree' || !cropsMap[id]) continue;
      const crop = cropsMap[id];
      const name = cropLabel(id, cropsMap);
      const prep = (m + 11) % 12;
      items.push({ month: prep, year: row.label, text: `Get ${name} seed ready${crop.nitrogen_fixing ? ' (with rhizobium inoculant if the field is new to it)' : ''}; prepare the land.` });
      items.push({ month: m, year: row.label, text: `Sow ${name}${d.crop_fit.find((f) => f.crop === id)?.planting_window ? ` (window: ${d.crop_fit.find((f) => f.crop === id)?.planting_window})` : ''}.` });
      let end = m;
      while (cells[(end + 1) % 12] === id && (end + 1) % 12 !== m) end = (end + 1) % 12;
      items.push({ month: end, year: row.label, text: `Harvest ${name}${crop.nitrogen_fixing ? '; leave the roots and stems in the soil to feed the next crop' : ''}.` });
    }
  }
  const order = (y: string) => (y.startsWith('Year') ? Number(y.slice(5)) : 0);
  return items.sort((a, b) => order(a.year) - order(b.year) || a.month - b.month);
}

function Section({ n, title, children, newPage = false }: { n: number; title: string; children: React.ReactNode; newPage?: boolean }) {
  return (
    <section className={`doc-section ${newPage ? 'print:break-before-page' : ''} pt-8`}>
      <h2 className="mb-4 flex items-baseline gap-3 border-b-2 border-stone-900 pb-2 text-2xl font-bold text-stone-900 print:break-after-avoid">
        <span className="font-display text-brand-700 tabular-nums">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b border-stone-200 py-1.5 text-[15px] last:border-0 print:text-[11pt]">
      <dt className="font-semibold text-stone-600">{label}</dt>
      <dd className="text-stone-900">{children}</dd>
    </div>
  );
}

/**
 * The printable plan: a one-stop document for the farmer, in this order:
 * 1 the rotation, 2 the crops, 3 how to grow each crop, 4 notes on the area, 5 season checklist.
 * Plain HTML text throughout so browser translation (e.g. Google Translate in Chrome) works before printing.
 */
export function PlanDocument({ regionId, planId, goal, autoPrint = false }: { regionId: string; planId: string; goal: PlanGoal | null; autoPrint?: boolean }) {
  const [detail, setDetail] = useState<RegionDetail | null>(null);
  const [cropsMap, setCropsMap] = useState<Record<string, Crop>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch(`/data/regions/${regionId}.json`).then((r) => r.json()), fetch('/data/crops.json').then((r) => r.json())])
      .then(([d, crops]: [RegionDetail, Crop[]]) => {
        setDetail(d);
        setCropsMap(Object.fromEntries(crops.map((c) => [c.id, c])));
      })
      .catch(() => setError('Could not load the plan data. Check your connection and reload the page.'));
  }, [regionId]);

  const plan = useMemo(() => (detail ? findPlan(detail, planId, goal) : null), [detail, planId, goal]);
  useEffect(() => {
    if (!detail || !plan) return;
    // The title becomes the PDF's default file name
    document.title = `Sowcast plan - ${plan.name} - ${detail.region.name}`;
    if (!autoPrint) return;
    // "Download PDF": open the print dialog once fonts are ready (choose Save as PDF there)
    let cancelled = false;
    document.fonts.ready.then(() => window.setTimeout(() => !cancelled && window.print(), 400));
    return () => {
      cancelled = true;
    };
  }, [detail, plan, autoPrint]);

  if (error) return <p className="p-8 text-red-800">{error}</p>;
  if (!detail || !Object.keys(cropsMap).length) return <p className="p-8 text-stone-600" role="status">Preparing your plan…</p>;
  if (!plan) return <p className="p-8 text-stone-800">This plan is no longer in the data. Go back and choose a plan again.</p>;

  const cropIds = [...new Set(plan.sequence.flatMap((s) => s.split('+')).filter((id) => cropsMap[id]))];
  const fitOf = (id: string) => detail.crop_fit.find((f) => f.crop === id);
  const goalLabel = PLAN_GOALS.find((g) => g.id === plan.goal)?.label;
  const r = detail.region;
  const wet = detail.calendar;
  const P = detail.priors;
  const S = detail.soil;
  const rain = detail.outlook?.series.precip_mm?.baseline ?? (detail.data_quality.weather === 'ok' ? Math.round(detail.annual.reduce((a, b) => a + b.precip_mm, 0) / Math.max(1, detail.annual.length)) : P.rain_mm);
  const temp = detail.outlook?.series.tmean_c?.baseline ?? P.mean_temp_c;
  const checklist = buildChecklist(plan, detail, cropsMap);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <CropProvider cropsMap={cropsMap} cropFit={detail.crop_fit} place={r.place}>
      <div className="min-h-dvh bg-stone-200/60 print:bg-white">
        {/* Toolbar: on screen only */}
        <div className="sticky top-0 z-10 border-b border-stone-300 bg-white/95 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2 px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => (window.history.length > 1 ? window.history.back() : window.close())}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1" />
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print or save as PDF
            </Button>
          </div>
          <p className="mx-auto flex max-w-[210mm] items-start gap-2 px-4 pb-3 text-sm text-stone-600">
            <Languages className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Need another language? In Chrome or Edge, right-click the page and choose <strong>Translate</strong> (on a phone: browser menu, then Translate). Then print: the PDF keeps the translation.
            </span>
          </p>
        </div>

        <article lang="en" className="plan-doc mx-auto my-6 max-w-[210mm] bg-white px-[14mm] py-[12mm] text-stone-900 shadow-xl print:m-0 print:max-w-none print:p-0 print:shadow-none">
          {/* Cover */}
          <header className="border-b-[3px] border-brand-700 pb-5">
            <p className="text-sm font-semibold text-brand-800">Crop rotation plan</p>
            <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-stone-950">{plan.name}</h1>
            <p className="mt-1 text-lg text-stone-700">
              For farmland around {r.place}, {r.name}, {r.country}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[15px] sm:grid-cols-4 print:grid-cols-4 print:text-[10.5pt]">
              <div>
                <dt className="text-stone-500">Type</dt>
                <dd className="font-semibold">{plan.plan_type}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Chosen for</dt>
                <dd className="font-semibold">{plan.kind === 'current' ? 'Current practice' : goalLabel}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Crops</dt>
                <dd className="font-semibold">{cropIds.map((id) => cropLabel(id, cropsMap)).join(', ')}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Prepared</dt>
                <dd className="font-semibold">{today}</dd>
              </div>
            </dl>
            <p className="mt-4 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
              Contents: 1. Your rotation, 2. The crops, 3. How to grow each crop, 4. About your area, 5. Season checklist
            </p>
          </header>

          <Section n={1} title="Your rotation">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-lg font-semibold">
              {plan.sequence.map((s, i) => (
                <span key={`${s}-${i}`} className="inline-flex items-center gap-2">
                  <span className="rounded-lg border-2 border-stone-900 px-3 py-1">{s.split('+').map((id) => cropLabel(id, cropsMap)).join(' + ')}</span>
                  {i < plan.sequence.length - 1 && <ArrowRight className="h-5 w-5 text-stone-500" aria-label="then" />}
                </span>
              ))}
            </div>
            {plan.calendar && (
              <div className="mb-5 break-inside-avoid">
                <h3 className="mb-2 text-base font-bold">What is in the field each month</h3>
                <CropCalendar rows={plan.calendar.rows} wetStart={wet.wet_start} wetEnd={wet.wet_end} />
                <p className="mt-1 text-sm text-stone-600">Months are approximate; follow the local start of the rains.</p>
              </div>
            )}
            {plan.why.length > 0 && (
              <div className="mb-5 break-inside-avoid">
                <h3 className="mb-1 text-base font-bold">Why this rotation</h3>
                <ul className="list-disc space-y-1 pl-5 text-[15px] print:text-[11pt]">
                  {plan.why.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.scores && (
              <div className="mb-5 break-inside-avoid">
                <h3 className="mb-2 text-base font-bold">How it scores (out of 100)</h3>
                <table className="w-full text-left text-[15px] print:text-[10.5pt]">
                  <thead>
                    <tr className="border-b-2 border-stone-900">
                      <th className="py-1 font-semibold">Measure</th>
                      <th className="py-1 text-right font-semibold">This plan</th>
                      {plan.kind !== 'current' && detail.plans.current?.scores && <th className="py-1 text-right font-semibold">What farmers do now</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {SCORE_ROWS.map(({ key, label }) => (
                      <tr key={key} className="border-b border-stone-200">
                        <td className="py-1">{label}</td>
                        <td className="py-1 text-right font-bold tabular-nums">{plan.scores![key]}</td>
                        {plan.kind !== 'current' && detail.plans.current?.scores && <td className="py-1 text-right tabular-nums text-stone-600">{detail.plans.current.scores[key]}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {plan.cautions.length > 0 && (
              <div className="break-inside-avoid rounded-lg border-2 border-amber-500 bg-amber-50 p-3">
                <h3 className="mb-1 text-base font-bold">Check before you start</h3>
                <ul className="list-disc space-y-1 pl-5 text-[15px] print:text-[11pt]">
                  {plan.cautions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section n={2} title="The crops in this plan" newPage>
            <div className="space-y-5">
              {cropIds.map((id) => {
                const c = cropsMap[id];
                const f = fitOf(id);
                return (
                  <div key={id} className="break-inside-avoid">
                    <h3 className="flex items-center gap-2 text-xl font-bold">
                      <CropIcon id={id} className="h-5 w-5 text-brand-700" />
                      {c.name}
                    </h3>
                    <p className="mb-2 text-[15px] text-stone-700 print:text-[11pt]">{c.plain_description}</p>
                    <dl>
                      {f && (
                        <Row label="Fit here">
                          {f.label ?? ''} ({f.fit}/100){f.why.length ? `: ${f.why.join('; ')}` : ''}
                        </Row>
                      )}
                      {f && f.limits.length > 0 && <Row label="Limits here">{f.limits.join('; ')}</Row>}
                      <Row label="Season">{capitalize(c.season)}, about {c.season_days} days</Row>
                      {c.yield_low !== null && (
                        <Row label="Typical yield">
                          {c.yield_low}–{c.yield_high} {c.yield_unit}
                          {f?.yield_outlook ? ` (expected here: ${f.yield_outlook})` : ''}
                        </Row>
                      )}
                      <Row label="Income">{capitalize(level(c.relative_income))} (rough, compared with other crops)</Row>
                      {c.n_fixed && <Row label="Adds nitrogen">{c.n_fixed.replace(' (rough)', '')}</Row>}
                      <Row label="Role">{capitalize(c.role)}</Row>
                    </dl>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section n={3} title="How to grow each crop" newPage>
            <div className="space-y-6">
              {cropIds.map((id) => {
                const c = cropsMap[id];
                const f = fitOf(id);
                return (
                  <div key={id} className="break-inside-avoid">
                    <h3 className="mb-1 flex items-center gap-2 text-xl font-bold">
                      <CropIcon id={id} className="h-5 w-5 text-brand-700" />
                      {c.name}
                    </h3>
                    <dl>
                      {f?.planting_window && <Row label="When to plant">{f.planting_window}</Row>}
                      {f?.harvest && <Row label="When to harvest">{f.harvest.replace(' (rough)', '').replace('~', 'Around ')}</Row>}
                      <Row label="Water">
                        {capitalize(level(c.water_need))} need; drought tolerance {level(c.drought_tolerance)}, flood tolerance {level(c.flood_tolerance)}
                      </Row>
                      <Row label="Fertiliser">{capitalize(level(c.needs.fertiliser))} need{c.nitrogen_fixing ? '; it makes its own nitrogen, so add phosphorus rather than nitrogen' : ''}</Row>
                      <Row label="Work and costs">
                        Labour {level(c.needs.labour)}, seed cost {level(c.needs.seed_cost)}, storage difficulty {level(c.needs.storage_difficulty)}
                      </Row>
                      <Row label="Pests and problems">
                        {c.pest_notes} (difficulty: {level(c.needs.pest_difficulty)})
                      </Row>
                      {c.good_after.length > 0 && <Row label="Grows well after">{c.good_after.map((x) => cropLabel(x, cropsMap)).join(', ')}</Row>}
                      {c.avoid_after.length > 0 && <Row label="Don't plant right after">{c.avoid_after.map((x) => cropLabel(x, cropsMap)).join(', ')}</Row>}
                      {f?.rotation_tip && <Row label="In a rotation">{f.rotation_tip}</Row>}
                    </dl>
                    {c.farmer_tip && (
                      <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-[15px] print:text-[11pt]">
                        <strong>Tip: </strong>
                        {c.farmer_tip}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section n={4} title={`About your area: ${r.name}`} newPage>
            <dl className="mb-5">
              <Row label="Yearly rain">About {Math.round(rain).toLocaleString()} mm{detail.data_quality.weather === 'ok' ? ' (measured, 2001–2024)' : ' (estimate)'}</Row>
              <Row label="Average temperature">About {temp} °C</Row>
              {wet.wet_start && wet.wet_end && (
                <Row label="Rainy season">
                  Roughly {MONTHS[wet.wet_start - 1]} to {MONTHS[wet.wet_end - 1]}
                </Row>
              )}
              {S && (
                <Row label="Soil">
                  {[S.texture && capitalize(S.texture), S.organic_matter && `${S.organic_matter} organic matter`, S.water_holding && `${S.water_holding} water holding`, S.drainage && `${S.drainage} drainage`]
                    .filter(Boolean)
                    .join('; ')}
                </Row>
              )}
              {S?.slope_pct !== null && S?.slope_pct !== undefined && (
                <Row label="Slope">
                  About {S.slope_pct}%{S.erosion_risk ? `, ${S.erosion_risk} erosion risk` : ''}
                </Row>
              )}
              <Row label="Known risks">
                Flooding {RISK[P.flood_risk] ?? '?'}, salt water {RISK[P.salinity_risk] ?? '?'}, irrigation access {RISK[P.irrigation_access] ?? '?'}
                {P.soil_degraded ? '; soil is degraded in places' : ''}
              </Row>
            </dl>

            {detail.outlook && detail.outlook.consequences.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-1 text-base font-bold">What to expect by {detail.outlook.horizon} (projection)</h3>
                <p className="mb-2 text-sm text-stone-600">If the {detail.outlook.base_period.replace('-', '–')} trends continue. These are projections from measured data, not certainties.</p>
                <ul className="space-y-2">
                  {detail.outlook.consequences.map((c) => (
                    <li key={c.kind} className="break-inside-avoid border-l-4 border-stone-900 pl-3 text-[15px] print:text-[11pt]">
                      <strong>{c.headline}.</strong> {c.detail} <em>What to do:</em> {c.action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.monthly.length === 12 && detail.data_quality.weather === 'ok' && (
              <div className="break-inside-avoid">
                <h3 className="mb-2 text-base font-bold">Rain and crop water need by month (mm, average 2001–2024)</h3>
                <table className="w-full text-center text-sm tabular-nums print:text-[9.5pt]">
                  <thead>
                    <tr className="border-b-2 border-stone-900">
                      <th className="py-1 text-left font-semibold">Month</th>
                      {MONTHS_SHORT.map((m) => (
                        <th key={m} className="py-1 font-semibold">
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-stone-200">
                      <th className="py-1 text-left font-semibold">Rain</th>
                      {detail.monthly.map((m) => (
                        <td key={m.month}>{Math.round(m.precip_mm)}</td>
                      ))}
                    </tr>
                    <tr>
                      <th className="py-1 text-left font-semibold">Crop need</th>
                      {detail.monthly.map((m) => (
                        <td key={m.month}>{Math.round(m.et0_mm)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section n={5} title="Your season checklist" newPage>
            {checklist.length > 0 && (
              <table className="mb-5 w-full text-left text-[15px] print:text-[11pt]">
                <thead>
                  <tr className="border-b-2 border-stone-900">
                    <th className="w-8 py-1" aria-label="Done" />
                    {plan.calendar && plan.calendar.rows.length > 1 && <th className="py-1 pr-3 font-semibold">Year</th>}
                    <th className="py-1 pr-3 font-semibold">Month</th>
                    <th className="py-1 font-semibold">Task</th>
                  </tr>
                </thead>
                <tbody>
                  {checklist.map((it, i) => (
                    <tr key={i} className="break-inside-avoid border-b border-stone-200 align-top">
                      <td className="py-1.5">
                        <span className="inline-block h-4 w-4 rounded-sm border-2 border-stone-700" aria-hidden="true" />
                      </td>
                      {plan.calendar && plan.calendar.rows.length > 1 && <td className="py-1.5 pr-3 whitespace-nowrap">{it.year}</td>}
                      <td className="py-1.5 pr-3 font-semibold whitespace-nowrap">{MONTHS[it.month]}</td>
                      <td className="py-1.5">{it.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="grid gap-5 sm:grid-cols-2 print:grid-cols-2">
              <div className="break-inside-avoid">
                <h3 className="mb-1 text-base font-bold">Before you start</h3>
                <ul className="list-disc space-y-1 pl-5 text-[15px] print:text-[11pt]">
                  <li>Talk to your local agricultural extension officer about this plan and local seed varieties.</li>
                  <li>Find a buyer for each crop before you plant, especially crops that are hard to store.</li>
                  {cropIds.some((id) => cropsMap[id].nitrogen_fixing) && <li>Buy rhizobium inoculant for legumes on fields where they have not grown before.</li>}
                  {detail.outlook?.consequences.slice(0, 2).map((c) => <li key={c.kind}>{c.action}</li>)}
                </ul>
              </div>
              <div className="break-inside-avoid">
                <h3 className="mb-1 text-base font-bold">What to buy</h3>
                <ul className="list-disc space-y-1 pl-5 text-[15px] print:text-[11pt]">
                  {cropIds.map((id) => (
                    <li key={id}>
                      {cropLabel(id, cropsMap)} seed{cropsMap[id].needs.seed_cost && cropsMap[id].needs.seed_cost! >= 4 ? ' (costly: budget for it)' : ''}
                      {cropsMap[id].needs.fertiliser && cropsMap[id].needs.fertiliser! >= 4 ? '; fertiliser (high need)' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <footer className="mt-10 border-t border-stone-300 pt-3 text-xs text-stone-500 print:text-[8.5pt]">
            <p>
              Made with <span translate="no">Sowcast</span> (NASA Space Apps). Sources: {detail.sources.join(', ')}. Rotation scores: {plan.basis}. All scores are rule-based estimates, not
              field trials. Check with a local agricultural expert before changing your rotation.
            </p>
          </footer>
        </article>
      </div>
    </CropProvider>
  );
}
