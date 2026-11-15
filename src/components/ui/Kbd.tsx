import type { ReactNode } from 'react';
import { cn } from '../../lib/format';

/** Keyboard shortcut hint, e.g. <Kbd>Ctrl K</Kbd>. Hidden on touch-only screens where it means nothing. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'hidden [@media(hover:hover)]:inline-flex items-center rounded-md border border-stone-300 bg-white px-1.5 py-0.5',
        'whitespace-nowrap font-sans text-xs font-semibold text-stone-500 tabular-nums',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** "⌘" on Apple devices, "Ctrl" elsewhere. */
export const MOD_KEY = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
