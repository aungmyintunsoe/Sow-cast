import { cn } from '../../lib/format';

/** A 1-5 level as five segments, with the number for screen readers and print. */
export function Meter({ value, label, tone = 'stone' }: { value: number | null; label: string; tone?: 'stone' | 'brand' | 'amber' }) {
  const fill = tone === 'brand' ? 'bg-brand-600' : tone === 'amber' ? 'bg-amber-500' : 'bg-stone-700';
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-stone-700">{label}</span>
      <span className="flex items-center gap-2">
        <span className="flex gap-0.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={cn('h-2 w-3.5 rounded-sm', value !== null && i <= value ? fill : 'bg-stone-200')} />
          ))}
        </span>
        <span className="w-8 text-right text-xs font-semibold tabular-nums text-stone-600">{value ?? '–'}/5</span>
      </span>
    </div>
  );
}
