import { useMemo } from 'react';

/**
 * The hero background: farm parcels seen from above, coloured like NASA greenness (NDVI) maps.
 * A satellite scan line sweeps across; each parcel greens up as it passes and fades back to soil,
 * so the background plays one growing season on a loop. Pure CSS animation of opacity/transform
 * (compositor-only); frozen mid-season when the visitor prefers reduced motion.
 */

const CYCLE = 16; // seconds for one season (one scan across the field)

// Deterministic pseudo-random so the field looks the same on every load (no layout shift between renders)
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// NDVI-like palette: soil tones for bare ground, greens for growing crops
const SOILS = ['#b9936b', '#c8a77c', '#a98260', '#d2b48a', '#bf9a70'];
const CROPS = ['#5d9c34', '#3f8a2c', '#7bb342', '#2f6f25', '#8fc153', '#1f5c22'];

interface Parcel {
  left: number;
  width: number;
  top: number;
  height: number;
  soil: string;
  crop: string;
  delay: number;
  kind: 'field' | 'forest' | 'water';
}

function buildParcels(): Parcel[] {
  const r = rng(42);
  const out: Parcel[] = [];
  const rows = 16;
  for (let row = 0; row < rows; row++) {
    const top = (row / rows) * 100;
    const height = 100 / rows;
    let x = 0;
    while (x < 100) {
      const w = Math.min(100 - x, 3 + r() * 9);
      const roll = r();
      const kind: Parcel['kind'] = roll < 0.03 ? 'water' : roll < 0.13 ? 'forest' : 'field';
      out.push({
        left: x,
        width: w,
        top,
        height,
        soil: SOILS[Math.floor(r() * SOILS.length)],
        crop: CROPS[Math.floor(r() * CROPS.length)],
        // Parcels green up as the scan line reaches them (left to right), with a little jitter per field
        // phase-locked to the scan: it reaches x at (x/100)·CYCLE; greening starts ~10% of a cycle before (negative = already running)
        delay: (x / 100) * CYCLE - 0.12 * CYCLE - CYCLE + r() * 0.8,
        kind,
      });
      x += w;
    }
  }
  return out;
}

export function FieldMosaic({ className }: { className?: string }) {
  const parcels = useMemo(buildParcels, []);
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#8d6b4c] ${className ?? ''}`} aria-hidden="true">
      {/* The field layer is tilted and oversized so its edges never show */}
      {/* Slow drift, like watching the fields pass under a satellite */}
      <div className="field-drift absolute inset-0">
      <div className="absolute left-1/2 top-1/2 h-[170%] w-[170%] -translate-x-1/2 -translate-y-1/2 -rotate-[14deg]">
        {parcels.map((p, i) => (
          <div
            key={i}
            className="absolute p-[3px]"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` }}
          >
            {p.kind === 'water' ? (
              <div className="h-full w-full rounded-[3px] bg-[#6f8f86]" />
            ) : p.kind === 'forest' ? (
              <div className="h-full w-full rounded-[3px] bg-[#1d4a22]" />
            ) : (
              <div className="relative h-full w-full overflow-hidden rounded-[3px]" style={{ background: p.soil }}>
                {/* furrows */}
                <div className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(90deg,transparent_0_5px,rgba(60,40,20,0.5)_5px_6px)]" />
                <div
                  className="field-grow absolute inset-0"
                  style={{ background: p.crop, animationDelay: `${p.delay.toFixed(2)}s`, animationDuration: `${CYCLE}s` }}
                />
              </div>
            )}
          </div>
        ))}
        {/* Satellite scan line */}
        <div className="field-scan absolute inset-0" style={{ animationDuration: `${CYCLE}s` }}>
          <div className="absolute inset-y-0 left-0 w-[10%] -translate-x-full">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-white/35" />
            <div className="absolute inset-y-0 right-0 w-[2px] bg-white/80 shadow-[0_0_24px_6px_rgba(255,255,255,0.45)]" />
          </div>
        </div>
      </div>
      </div>
      {/* Film grain and a soft vignette so text panels read clearly */}
      <div className="absolute inset-0 opacity-[0.12] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_45%,rgba(12,26,14,0.05),rgba(12,26,14,0.55))]" />
    </div>
  );
}
