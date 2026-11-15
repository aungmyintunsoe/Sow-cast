import { useState } from 'react';
import { ImageOff, Satellite } from 'lucide-react';
import type { MonthlyClimate } from '../../types';
import { cn } from '../../lib/format';
import { Card } from '../ui/Card';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const W = 480, H = 400;

/** One NASA GIBS map image (public domain) for a box around the region. */
function gibs(layer: string, time: string, lat: number, lon: number) {
  const dLat = 0.32, dLon = dLat * (W / H) / Math.cos((lat * Math.PI) / 180);
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((v) => v.toFixed(4)).join(',');
  return `${WMS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&SRS=EPSG:4326&LAYERS=${layer}&BBOX=${bbox}&WIDTH=${W}&HEIGHT=${H}&FORMAT=image/jpeg&TIME=${time}`;
}

function Shot({ src, title, caption }: { src: string; title: string; caption: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  return (
    <figure className="min-w-0">
      <div className="relative aspect-[6/5] overflow-hidden rounded-xl border border-stone-300 bg-stone-100">
        {state === 'loading' && <div className="absolute inset-0 motion-safe:animate-pulse bg-stone-200" aria-hidden="true" />}
        {state === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center text-sm text-stone-500">
            <ImageOff className="h-5 w-5" aria-hidden="true" />
            Image not available right now
          </div>
        ) : (
          <img
            src={src}
            alt={`${title}: ${caption}`}
            width={W}
            height={H}
            loading="lazy"
            onLoad={() => setState('ok')}
            onError={() => setState('error')}
            className={cn('h-full w-full object-cover transition-opacity duration-300', state === 'ok' ? 'opacity-100' : 'opacity-0')}
          />
        )}
        {/* Centre marker: the reference town */}
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(28,25,23,0.6)]" aria-hidden="true" />
      </div>
      <figcaption className="mt-2">
        <span className="block text-sm font-bold text-stone-900">{title}</span>
        <span className="block text-xs text-stone-600">{caption}</span>
      </figcaption>
    </figure>
  );
}

/**
 * The region from space: a true-colour image and NASA greenness (NDVI) in the barest and the greenest month,
 * so the farming calendar is visible in the land itself. Images load live from NASA GIBS.
 */
export function SatelliteView({ lat, lon, place, monthly, wetEnd }: { lat: number; lon: number; place: string; monthly: MonthlyClimate[]; wetEnd: number | null }) {
  const nd = monthly.filter((m) => m.ndvi !== null);
  const low = nd.length === 12 ? nd.reduce((a, b) => (b.ndvi! < a.ndvi! ? b : a)).month : wetEnd ? ((wetEnd + 3 - 1) % 12) + 1 : 3;
  const high = nd.length === 12 ? nd.reduce((a, b) => (b.ndvi! > a.ndvi! ? b : a)).month : wetEnd ? ((wetEnd + 10) % 12) + 1 : 9;
  // True colour from the middle of the dry season: fewer clouds than the rains, less smoke than the burning season
  const clear = wetEnd ? ((wetEnd + 3 - 1) % 12) + 1 : low;
  const mm = (m: number) => String(m).padStart(2, '0');
  const year = 2023;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-stone-900">
            <Satellite className="h-5 w-5 text-nasa-blue" aria-hidden="true" />
            {place} from space
          </h3>
          <p className="mt-1 max-w-[70ch] text-sm text-stone-600">
            About 70 km across, centred on {place}. Brown is bare or dry land; green is growing plants. The difference between the two greenness images is the farming season.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Shot
          src={gibs('VIIRS_SNPP_CorrectedReflectance_TrueColor', `${year}-${mm(clear)}-15`, lat, lon)}
          title="True colour"
          caption={`${MONTHS[clear - 1]} ${year}, NASA VIIRS (clouds possible)`}
        />
        <Shot src={gibs('MODIS_Terra_L3_NDVI_Monthly', `${year}-${mm(low)}-01`, lat, lon)} title={`Greenness in ${MONTHS[low - 1]}`} caption="Barest month here, NASA MODIS NDVI" />
        <Shot src={gibs('MODIS_Terra_L3_NDVI_Monthly', `${year}-${mm(high)}-01`, lat, lon)} title={`Greenness in ${MONTHS[high - 1]}`} caption="Greenest month here, NASA MODIS NDVI" />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
        <span className="inline-flex items-center gap-2">
          <span>Bare</span>
          <span className="h-2.5 w-40 rounded-full bg-[linear-gradient(90deg,#a1785c,#d6c79a,#a7d26b,#4f9a2e,#0d5b13)]" aria-hidden="true" />
          <span>Dense crops</span>
        </span>
        <span>Imagery: NASA GIBS / EOSDIS (public domain)</span>
      </div>
    </Card>
  );
}
