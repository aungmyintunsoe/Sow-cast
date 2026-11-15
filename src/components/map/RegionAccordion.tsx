import { useMemo } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import type { RegionSummary } from '../../types';
import { Card } from '../ui/Card';

interface RegionAccordionProps {
  regions: RegionSummary[];
  selectedId: string | undefined;
  openCountry: string | null;
  onToggleCountry: (country: string) => void;
  onPick: (id: string) => void;
}

/** Regions grouped by country; one country open at a time. */
export function RegionAccordion({ regions, selectedId, openCountry, onToggleCountry, onPick }: RegionAccordionProps) {
  const byCountry = useMemo(() => {
    const groups: Record<string, RegionSummary[]> = {};
    for (const r of regions) (groups[r.country] ??= []).push(r);
    return Object.entries(groups);
  }, [regions]);

  return (
    <Card className="overflow-hidden self-start">
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
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-stone-50 transition"
            >
              <span className="font-bold text-stone-900">{country}</span>
              <span className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                {list.length} regions
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {open && (
              <ul id={panelId} className="px-2 pb-2 space-y-1">
                {list.map((r) => {
                  const isSel = r.id === selectedId;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => onPick(r.id)}
                        aria-pressed={isSel}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition ${
                          isSel ? 'bg-blue-50 border-nasa-blue' : 'border-transparent hover:bg-stone-50'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-stone-900">{r.name}</span>
                          <MapPin className={`w-4 h-4 shrink-0 ${isSel ? 'text-nasa-blue' : 'text-stone-400'}`} />
                        </span>
                        <span className="block text-xs text-stone-500">{r.place}</span>
                        {r.tagline && <span className="block text-xs text-stone-600 mt-1 leading-snug">{r.tagline}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </Card>
  );
}
