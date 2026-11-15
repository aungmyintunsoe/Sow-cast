import type { CalendarRow } from '../../types';
import { MONTHS_SHORT, cn } from '../../lib/format';
import { cropLabel, useCrops } from '../crops/CropContext';

// Distinct, print-safe fills; trees get their own deep green.
const PALETTE = ['#2c8742', '#d97706', '#2563eb', '#9f1239', '#0f766e', '#7c2d12', '#6d28d9'];
const TREE = '#3f6212';

export function cropColors(rows: CalendarRow[]) {
  const ids: string[] = [];
  for (const r of rows) for (const c of r.cells) if (c && !ids.includes(c)) ids.push(c);
  let k = 0;
  return Object.fromEntries(ids.map((id) => [id, id === 'perennial_tree' || id === 'oil_palm' || id === 'rubber' || id === 'cashew' ? TREE : PALETTE[k++ % PALETTE.length]]));
}

const inWet = (m: number, start: number | null, end: number | null) =>
  start !== null && end !== null && (start <= end ? m >= start && m <= end : m >= start || m <= end);

/** Month-by-month calendar of a plan: which crop is in the field each month, and when soil is bare. */
export function CropCalendar({ rows, wetStart, wetEnd, dense = false }: { rows: CalendarRow[]; wetStart: number | null; wetEnd: number | null; dense?: boolean }) {
  const { cropsMap } = useCrops();
  const colors = cropColors(rows);
  const bareMonths = rows.length === 1 ? rows[0].cells.filter((c) => !c).length : null;

  return (
    <figure className="space-y-2">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[300px] border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th scope="col" className="sr-only">Year</th>
              {MONTHS_SHORT.map((m, i) => (
                <th key={m} scope="col" className="font-semibold text-stone-500">
                  <span className="hidden sm:inline">{m}</span>
                  <span className="sm:hidden">{m[0]}</span>
                  {wetStart !== null && (
                    <span
                      className={cn('mx-auto mt-0.5 block h-1 w-full rounded-full', inWet(i + 1, wetStart, wetEnd) ? 'bg-blue-500' : 'bg-transparent')}
                      aria-hidden="true"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="whitespace-nowrap pr-1 text-left font-semibold text-stone-600">
                  {r.label}
                </th>
                {r.cells.map((c, i) => (
                  <td
                    key={i}
                    title={`${MONTHS_SHORT[i]}: ${c ? cropLabel(c, cropsMap) : 'bare soil'}`}
                    className={cn('rounded-[4px] p-0', dense ? 'h-4' : 'h-6', !c && 'bg-stone-100 [background-image:repeating-linear-gradient(135deg,transparent_0_3px,#d6d3d1_3px_4px)]')}
                    style={c ? { background: colors[c] } : undefined}
                  >
                    <span className="sr-only">{c ? cropLabel(c, cropsMap) : 'bare'}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
        {Object.entries(colors).map(([id, color]) => (
          <span key={id} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} aria-hidden="true" />
            {cropLabel(id, cropsMap)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-stone-100 [background-image:repeating-linear-gradient(135deg,transparent_0_2px,#a8a29e_2px_3px)]" aria-hidden="true" />
          Bare soil{bareMonths !== null && bareMonths > 0 ? ` (${bareMonths} months)` : ''}
        </span>
        {wetStart !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-3 rounded-full bg-blue-500" aria-hidden="true" />
            Rainy season
          </span>
        )}
      </figcaption>
    </figure>
  );
}
