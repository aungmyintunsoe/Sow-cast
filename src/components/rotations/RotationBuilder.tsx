import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Eraser, FlaskConical, GripVertical, Paintbrush, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import type { RegionDetail } from '../../types';
import { MONTHS_SHORT, cn } from '../../lib/format';
import { FADE, SPRING } from '../../lib/motion';
import { CropIcon } from '../../lib/cropIcons';
import { Button, PrimaryButton } from '../ui/Button';
import { Card, PageHeader } from '../ui/Card';
import { cropLabel, useCrops } from '../crops/CropContext';
import { CropPeek } from '../crops/CropPeek';
import { CropCalendar, cropColors } from './CropCalendar';

type Grid = (string | null)[][]; // years × 12 months, each a crop id or null (bare)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MAX_YEARS = 4;
const emptyYear = () => Array<string | null>(12).fill(null);

const inWet = (m: number, start: number | null, end: number | null) =>
  start !== null && end !== null && (start <= end ? m >= start && m <= end : m >= start || m <= end);

/** Blocks of the same crop in a row, for the summary ("Rice, May–Aug"). */
function blocks(row: (string | null)[]) {
  const out: { crop: string; from: number; to: number }[] = [];
  row.forEach((c, i) => {
    if (!c) return;
    const last = out.at(-1);
    if (last && last.crop === c && last.to === i - 1) last.to = i;
    else out.push({ crop: c, from: i, to: i });
  });
  return out;
}

interface RotationBuilderProps {
  regionName: string;
  detail: RegionDetail;
  onBack: () => void;
}

/**
 * Lay out your own rotation month by month: drag a crop onto a month (it fills its usual season length),
 * or pick a crop and tap/drag across months to paint exactly the period you want.
 * "Analyze" leads to a preview page; the analysis itself is not built yet.
 */
export function RotationBuilder({ regionName, detail, onBack }: RotationBuilderProps) {
  const { cropsMap } = useCrops();
  const [grid, setGrid] = useState<Grid>(() => [emptyYear(), emptyYear()]);
  const [brush, setBrush] = useState<string | null>(null);
  const [tool, setTool] = useState<'paint' | 'erase'>('paint');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [water, setWater] = useState('rain');
  const [size, setSize] = useState('');
  const [hover, setHover] = useState<string | null>(null); // "y-m" drop target
  const [phase, setPhase] = useState<'edit' | 'review'>('edit');
  const painting = useRef(false);
  const dragged = useRef<string | null>(null); // crop being dragged (some browsers hide dataTransfer until drop)
  const { wet_start, wet_end } = detail.calendar;

  useEffect(() => {
    const stop = () => (painting.current = false);
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, []);

  const palette = useMemo(() => {
    const q = query.trim().toLowerCase();
    return detail.crop_fit
      .filter((f) => cropsMap[f.crop] && (!q || cropsMap[f.crop].name.toLowerCase().includes(q)))
      .map((f) => ({ id: f.crop, fit: f.fit, days: cropsMap[f.crop].season_days, window: f.planting_window }));
  }, [detail.crop_fit, cropsMap, query]);

  const colors = useMemo(() => cropColors(grid.map((cells, i) => ({ label: `${i}`, cells }))), [grid]);
  const filled = grid.flat().filter(Boolean).length;

  const setCell = (y: number, m: number, value: string | null) =>
    setGrid((g) => (g[y][m] === value ? g : g.map((row, yi) => (yi === y ? row.map((c, mi) => (mi === m ? value : c)) : row))));

  /** Drop: the crop fills its usual season from this month, running into the next year if needed. */
  const place = (y: number, m: number, id: string) => {
    const n = Math.max(1, Math.min(12, Math.round((cropsMap[id]?.season_days ?? 90) / 30)));
    setGrid((g) => {
      const next = g.map((r) => [...r]);
      for (let i = 0; i < n; i++) {
        const yy = y + Math.floor((m + i) / 12);
        if (yy >= MAX_YEARS) break;
        while (next.length <= yy) next.push(emptyYear());
        next[yy][(m + i) % 12] = id;
      }
      return next;
    });
  };

  const paint = (y: number, m: number) => setCell(y, m, tool === 'erase' ? null : brush);

  if (phase === 'review') {
    const rows = grid.map((cells, i) => ({ label: `Year ${i + 1}`, cells }));
    return (
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={FADE}>
        <PageHeader title={name.trim() || 'Your rotation'} description={`For ${regionName}. Here is what you laid out.`} />
        <Card className="p-5">
          <CropCalendar rows={rows} wetStart={wet_start} wetEnd={wet_end} />
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-stone-500">Water source</dt>
              <dd className="font-semibold">{water === 'rain' ? 'Rain only' : water === 'some' ? 'Some irrigation' : 'Full irrigation'}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Field size</dt>
              <dd className="font-semibold">{size ? `${size} ha` : 'Not given'}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Bare months</dt>
              <dd className="font-semibold tabular-nums">{grid.length * 12 - filled} of {grid.length * 12}</dd>
            </div>
          </dl>
        </Card>
        <Card className="flex flex-col items-center gap-4 border-dashed px-6 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-800">
            <FlaskConical className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-xl font-bold text-stone-900">Rotation analysis is coming soon</h3>
            <p className="mx-auto mt-1 max-w-[60ch] text-sm text-stone-600 text-pretty">
              Your rotation is laid out, but checking it is not built yet. When it is, Sowcast will score it the same way it scores the recommended rotations.
            </p>
          </div>
          <ul className="grid max-w-2xl gap-2 text-left text-sm text-stone-700 sm:grid-cols-2">
            {[
              'Does rain cover each crop in the months you chose?',
              'Will flowering hit the hottest weeks?',
              'Does a legume put nitrogen back for the next crop?',
              'Is the soil bare during the heaviest rain?',
              'Does it break pest cycles between crops?',
              'How does it compare with the top picks for this area?',
            ].map((t) => (
              <li key={t} className="flex gap-2 rounded-lg bg-stone-50 px-3 py-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => setPhase('edit')}>
              <ArrowLeft className="h-4 w-4" />
              Edit rotation
            </Button>
            <PrimaryButton onClick={onBack}>See recommended rotations</PrimaryButton>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Build your own rotation for ${regionName}`}
        description="Drag a crop onto the month you would sow it: it fills its usual season. Or pick a crop and tap or drag across months to set the exact period."
        action={
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Recommended rotations
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Crop palette */}
        <Card className="flex max-h-[38rem] min-w-0 flex-col p-4 lg:sticky lg:top-40">
          <h3 className="text-base font-bold text-stone-900">Crops</h3>
          <p className="mb-3 text-xs text-stone-600">Sorted by how well they fit here.</p>
          <label className="relative mb-3 block">
            <span className="sr-only">Find a crop</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a crop"
              className="min-h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-600"
            />
          </label>
          <ul className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1" aria-label="Crops to place">
            {palette.map((c) => {
              const active = brush === c.id && tool === 'paint';
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      dragged.current = c.id;
                      e.dataTransfer.setData('text/plain', c.id);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onDragEnd={() => {
                      dragged.current = null;
                      setHover(null);
                    }}
                    onClick={() => {
                      setBrush(active ? null : c.id);
                      setTool('paint');
                    }}
                    aria-pressed={active}
                    className={cn(
                      'group flex min-h-11 w-full cursor-grab items-center gap-2.5 rounded-xl border px-2.5 text-left text-sm transition-colors active:cursor-grabbing',
                      active ? 'border-brand-700 bg-brand-50' : 'border-transparent hover:border-stone-300 hover:bg-stone-50',
                    )}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-stone-300 group-hover:text-stone-500" aria-hidden="true" />
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: colors[c.id] ?? '#57534e' }}>
                      <CropIcon id={c.id} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-stone-900">{cropLabel(c.id, cropsMap)}</span>
                      <span className="block text-xs text-stone-500 tabular-nums">~{Math.round(c.days / 30)} months, fit {c.fit}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {!palette.length && <li className="px-2 py-4 text-sm text-stone-500">No crop matches "{query}".</li>}
          </ul>
        </Card>

        {/* Month grid */}
        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div role="radiogroup" aria-label="Tool" className="flex gap-1 rounded-xl bg-stone-100 p-1 text-sm font-semibold">
                {(
                  [
                    ['paint', 'Paint', Paintbrush],
                    ['erase', 'Erase', Eraser],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={tool === id}
                    onClick={() => setTool(id)}
                    className={cn('relative isolate inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3', tool === id ? 'text-stone-900' : 'text-stone-600 hover:text-stone-900')}
                  >
                    {tool === id && <motion.span layoutId="builder-tool" transition={SPRING} className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm" />}
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="flex-1 text-sm text-stone-600" aria-live="polite">
                {tool === 'erase' ? 'Tap or drag across months to clear them.' : brush ? (
                  <>
                    Painting <strong className="text-stone-900">{cropLabel(brush, cropsMap)}</strong>: tap or drag across months.
                  </>
                ) : (
                  'Pick a crop on the left, or drag one onto a month.'
                )}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setGrid([emptyYear(), emptyYear()])} disabled={!filled}>
                <RotateCcw className="h-4 w-4" />
                Start over
              </Button>
            </div>

            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-1 select-none text-xs">
                <thead>
                  <tr>
                    <th scope="col" className="w-20" />
                    {MONTHS_SHORT.map((m, i) => (
                      <th key={m} scope="col" className="pb-1 font-semibold text-stone-500">
                        {m}
                        <span className={cn('mx-auto mt-1 block h-1 rounded-full', inWet(i + 1, wet_start, wet_end) ? 'bg-blue-500' : 'bg-transparent')} aria-hidden="true" />
                      </th>
                    ))}
                    <th scope="col" className="w-12">
                      <span className="sr-only">Remove year</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {grid.map((row, y) => (
                      <motion.tr key={y} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE}>
                        <th scope="row" className="whitespace-nowrap pr-2 text-left text-sm font-bold text-stone-700">
                          Year {y + 1}
                        </th>
                        {row.map((c, m) => {
                          const start = c && row[m - 1] !== c;
                          const key = `${y}-${m}`;
                          return (
                            <td key={m} className="p-0">
                              <button
                                type="button"
                                aria-label={`Year ${y + 1}, ${MONTHS[m]}: ${c ? cropLabel(c, cropsMap) : 'bare'}`}
                                onPointerDown={(e) => {
                                  if (tool === 'paint' && !brush) return;
                                  e.preventDefault();
                                  painting.current = true;
                                  paint(y, m);
                                }}
                                onPointerEnter={() => painting.current && paint(y, m)}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                  setHover(key);
                                }}
                                onDragLeave={() => setHover((h) => (h === key ? null : h))}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setHover(null);
                                  const id = e.dataTransfer.getData('text/plain') || dragged.current;
                                  dragged.current = null;
                                  if (id && cropsMap[id]) place(y, m, id);
                                }}
                                onKeyDown={(e) => {
                                  if ((e.key === 'Enter' || e.key === ' ') && (brush || tool === 'erase')) {
                                    e.preventDefault();
                                    paint(y, m);
                                  }
                                  if (e.key === 'Delete' || e.key === 'Backspace') setCell(y, m, null);
                                }}
                                style={c ? { background: colors[c] } : undefined}
                                className={cn(
                                  'flex h-14 w-full touch-none items-center justify-center overflow-hidden rounded-lg border-2 text-white transition-[border-color,transform] duration-100',
                                  c ? 'border-transparent' : 'border-dashed border-stone-300 bg-stone-50 hover:border-stone-500',
                                  hover === key && 'scale-[1.04] border-solid border-brand-600',
                                  (brush || tool === 'erase') && 'cursor-crosshair',
                                )}
                              >
                                {start && <CropIcon id={c!} className="pointer-events-none h-4 w-4" />}
                                {!c && <Plus className={cn('pointer-events-none h-3.5 w-3.5 text-stone-300', hover === key && 'opacity-0')} aria-hidden="true" />}
                              </button>
                            </td>
                          );
                        })}
                        <td className="p-0 text-center">
                          <button
                            type="button"
                            onClick={() => setGrid((g) => (g.length > 1 ? g.filter((_, i) => i !== y) : [emptyYear()]))}
                            aria-label={`Remove year ${y + 1}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Button variant="secondary" size="sm" onClick={() => setGrid((g) => [...g, emptyYear()])} disabled={grid.length >= MAX_YEARS}>
                <Plus className="h-4 w-4" />
                Add a year
              </Button>
              <span className="inline-flex items-center gap-1.5 text-xs text-stone-600">
                <span className="h-1 w-4 rounded-full bg-blue-500" aria-hidden="true" />
                Rainy season here
              </span>
            </div>
          </Card>

          {/* Summary of what is laid out */}
          <Card className="p-5">
            <h3 className="text-base font-bold text-stone-900">Your rotation so far</h3>
            {filled === 0 ? (
              <p className="mt-1 text-sm text-stone-600">Nothing placed yet. Start with the crop you grow in the rainy season.</p>
            ) : (
              <ol className="mt-2 space-y-1.5 text-sm">
                {grid.map((row, y) => {
                  const b = blocks(row);
                  return (
                    <li key={y} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="w-16 font-semibold text-stone-600">Year {y + 1}</span>
                      {b.length ? (
                        b.map((x, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2 py-0.5">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[x.crop] }} aria-hidden="true" />
                            <CropPeek id={x.crop} className="font-semibold" />
                            <span className="text-stone-500">
                              {MONTHS_SHORT[x.from]}
                              {x.to > x.from ? `–${MONTHS_SHORT[x.to]}` : ''}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-stone-500">Bare all year</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          {/* Optional details (not used yet) */}
          <Card className="p-5">
            <h3 className="text-base font-bold text-stone-900">About your field (optional)</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="font-semibold text-stone-700">Name this rotation</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. North field 2026"
                  className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 outline-none focus:border-brand-600"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-stone-700">Field size (hectares)</span>
                <input
                  value={size}
                  onChange={(e) => setSize(e.target.value.replace(/[^0-9.]/g, ''))}
                  inputMode="decimal"
                  placeholder="e.g. 1.5"
                  className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 tabular-nums outline-none focus:border-brand-600"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-stone-700">Water for the field</span>
                <select value={water} onChange={(e) => setWater(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 outline-none focus:border-brand-600">
                  <option value="rain">Rain only</option>
                  <option value="some">Some irrigation (well or pump)</option>
                  <option value="full">Full irrigation</option>
                </select>
              </label>
            </div>
          </Card>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            {!filled && <p className="text-sm text-stone-500 sm:mr-auto">Place at least one crop to continue.</p>}
            <PrimaryButton onClick={() => setPhase('review')} disabled={!filled}>
              <FlaskConical className="h-4 w-4" />
              Analyze my rotation
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
