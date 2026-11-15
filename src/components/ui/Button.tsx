import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/format';

/** The green call-to-action button. */
export function PrimaryButton({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 shrink-0 rounded-xl px-5 py-3 text-base font-semibold text-white shadow-sm transition',
        'bg-brand-600 hover:bg-brand-700 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
