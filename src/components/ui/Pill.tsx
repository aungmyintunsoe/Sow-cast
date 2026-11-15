import type { ReactNode } from 'react';
import { cn } from '../../lib/format';

const TONES = {
  neutral: 'bg-stone-100 text-stone-600',
  brand: 'bg-brand-100 text-brand-800',
  info: 'bg-blue-50 text-nasa-blue',
  warn: 'bg-amber-50 text-amber-900 border border-amber-200',
} as const;

/** Small label chip (season, "Grown here", evidence, limits). */
export function Pill({ tone = 'neutral', className, children }: { tone?: keyof typeof TONES; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', TONES[tone], className)}>
      {children}
    </span>
  );
}
