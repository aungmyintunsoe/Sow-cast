import { useEffect, useMemo, useRef } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CornerDownLeft, MapPin, Search } from 'lucide-react';
import type { RegionSummary } from '../../types';
import { prefetchRegion } from '../../hooks/useSowcastData';
import { SPRING } from '../../lib/motion';
import { STEPS, type StepId } from './AppHeader';
import { Kbd, MOD_KEY } from '../ui/Kbd';

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regions: RegionSummary[];
  currentRegionId: string;
  onSelectRegion: (id: string) => void;
  onSelectStep: (step: StepId) => void;
}

const itemClass =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-stone-800 data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-900';

/** Ctrl/⌘ K: search the 23 regions by name, town or country, or jump to a step. */
export function CommandMenu({ open, onOpenChange, regions, currentRegionId, onSelectRegion, onSelectStep }: CommandMenuProps) {
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Return focus to whatever opened the menu, so keyboard users don't lose their place.
  useEffect(() => {
    if (open) returnFocus.current = document.activeElement as HTMLElement;
    else returnFocus.current?.focus?.();
  }, [open]);

  const byCountry = useMemo(() => {
    const groups: Record<string, RegionSummary[]> = {};
    for (const r of regions) (groups[r.country] ??= []).push(r);
    return Object.entries(groups);
  }, [regions]);

  const close = () => onOpenChange(false);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[max(10vh,env(safe-area-inset-top))]">
          <motion.div
            className="absolute inset-0 bg-stone-900/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search regions and steps"
            className="relative w-full max-w-lg origin-top overflow-hidden rounded-2xl border-[1.5px] border-stone-900 bg-white shadow-xl"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={SPRING}
          >
            <Command loop label="Search regions and steps">
              <div className="flex items-center gap-2 border-b border-stone-200 px-4">
                <Search className="h-4 w-4 shrink-0 text-stone-500" />
                <Command.Input
                  autoFocus
                  placeholder="Search a region, town or country…"
                  className="h-12 w-full bg-transparent text-base text-stone-900 outline-none placeholder:text-stone-400"
                />
                <Kbd>Esc</Kbd>
              </div>
              <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-stone-600">
                  No region matches. Try a town (e.g. Khon Kaen) or a country.
                </Command.Empty>

                <Command.Group heading="Go to step" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-stone-500">
                  {STEPS.map((s, i) => (
                    <Command.Item
                      key={s.id}
                      value={`step ${s.label}`}
                      onSelect={() => {
                        onSelectStep(s.id);
                        close();
                      }}
                      className={itemClass}
                    >
                      <span className="text-stone-500">{s.icon}</span>
                      <span className="flex-1">{s.label.replace(/^\d\. /, '')}</span>
                      <Kbd>{i + 1}</Kbd>
                    </Command.Item>
                  ))}
                </Command.Group>

                {byCountry.map(([country, list]) => (
                  <Command.Group
                    key={country}
                    heading={country}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-stone-500"
                  >
                    {list.map((r) => (
                      <Command.Item
                        key={r.id}
                        value={`${r.name} ${r.place} ${r.country}`}
                        onSelect={() => {
                          onSelectRegion(r.id);
                          close();
                        }}
                        onPointerEnter={() => prefetchRegion(r.id)}
                        className={itemClass}
                      >
                        <MapPin className="h-4 w-4 shrink-0 text-stone-400" />
                        <span className="flex-1 min-w-0">
                          <span className="font-semibold">{r.name}</span>
                          <span className="ml-2 text-stone-500">{r.place}</span>
                        </span>
                        {r.id === currentRegionId && <Check className="h-4 w-4 text-brand-600" aria-label="Current region" />}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
              <div className="flex items-center justify-between gap-3 border-t border-stone-200 px-4 py-2 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <CornerDownLeft className="h-3.5 w-3.5" /> to open
                </span>
                <span>
                  <Kbd>{MOD_KEY} K</Kbd> to toggle
                </span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
