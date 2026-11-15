import type { ReactNode } from 'react';
import { cn } from '../../lib/format';

/** A small boxed fact: a quiet label above a bold value. */
export function LabelValue({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-stone-200 bg-white p-3', className)}>
      <div className="text-xs font-medium text-stone-500">{label}</div>
      <div className="mt-0.5 font-bold text-stone-900">{value}</div>
    </div>
  );
}
