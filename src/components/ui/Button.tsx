import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/format';

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-stone-100 text-stone-800 border border-stone-200 hover:bg-stone-200 active:bg-stone-300',
  ghost: 'text-stone-700 hover:bg-stone-100 active:bg-stone-200',
} as const;

const SIZES = {
  md: 'min-h-11 px-5 py-2.5 text-base',
  sm: 'min-h-10 px-3.5 py-2 text-sm',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

/** The app's button. Every size keeps at least a 40–44 px touch target. */
export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

/** The green call-to-action button used at the top of each step. */
export const PrimaryButton = (props: Omit<ButtonProps, 'variant'>) => <Button variant="primary" {...props} />;
