import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, MapPin, Search } from 'lucide-react';
import type { RegionSummary } from '../../types';
import { prefetchRegion } from '../../hooks/useSowcastData';
import { COLLAPSE } from '../../lib/motion';
import { Card } from '../ui/Card';
import { Kbd, MOD_KEY } from '../ui/Kbd';

interface RegionAccordionProps {
  regions: RegionSummary[];
  selectedId: string | undefined;
  openCountry: string | null;
  onToggleCountry: (country: string) => void;
  onPick: (id: string) => void;
  onOpenSearch: () => void;
}

/** Regions grouped by country; one country open at a time. A search control opens the command menu. */
export function RegionAccordion({ regions, selectedId, openCountry, onToggleCountry, onPick, onOpenSearch }: RegionAccordionProps) {
  const byCountry = useMemo(() => {
    const groups: Record<string, RegionSummary[]> = {};
    for (const r of regions) (groups[r.country] ??= []).push(r);
    return Object.entries(groups);
  }, [regions]);

  return (
    <Card className="overflow-hidden self-start">
      <div className="border-b border-stone-200 p-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 text-left text-sm text-stone-500 transition-colors hover:border-stone-300 hover:bg-white"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1">Find a region or town</span>
          <Kbd>{MOD_KEY} K</Kbd>
        </button>
      </div>

      {byCountry.map(([country, list]) => {
        const open = openCountry === country;
        const panelId = `regions-${country.toLowerCase()}`;
        return (
          <div key={country} className="border-b border-stone-200 last:border-b-0">
            <button
              type="button"
              onClick={() => onToggleCountry(country)}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left transition-colors hover:bg-stone-50"
            >
              <span className="font-bold text-stone-900">{country}</span>
              <span className="flex items-center gap-2 text-sm font-semibold text-stone-500 tabular-nums">
                {list.length} regions
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div id={panelId} key="panel" {...COLLAPSE} className="overflow-hidden">
                  <ul className="space-y-1 px-2 pb-2">
                    {list.map((r) => {
                      const isSel = r.id === selectedId;
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => onPick(r.id)}
                            onPointerEnter={() => prefetchRegion(r.id)}
                            onFocus={() => prefetchRegion(r.id)}
                            aria-pressed={isSel}
                            className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                              isSel ? 'border-brand-600 bg-brand-50' : 'border-transparent hover:bg-stone-50'
                            }`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-stone-900">{r.name}</span>
                              <MapPin className={`h-4 w-4 shrink-0 ${isSel ? 'text-brand-600' : 'text-stone-400'}`} />
                            </span>
                            <span className="block text-sm text-stone-500">{r.place}</span>
                            {r.tagline && <span className="mt-1 block text-sm leading-snug text-stone-600 text-pretty">{r.tagline}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </Card>
  );
}
