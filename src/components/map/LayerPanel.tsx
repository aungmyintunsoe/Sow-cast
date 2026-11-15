import { Layers } from 'lucide-react';
import { MAP_LAYERS, type MapLayer } from './mapLayers';

interface LayerPanelProps {
  layer: MapLayer;
  onLayerChange: (id: string) => void;
  showPlaceNames: boolean;
  onShowPlaceNamesChange: (show: boolean) => void;
}

/** Floating map control: layer dropdown, NASA legend and the place-name overlay toggle. */
export function LayerPanel({ layer, onLayerChange, showPlaceNames, onShowPlaceNamesChange }: LayerPanelProps) {
  return (
    <div className="absolute top-3 right-3 z-[400] bg-white/95 border border-stone-300 rounded-xl px-3 py-2.5 text-xs shadow-sm w-60 max-w-[calc(100%-4.5rem)]">
      <label htmlFor="map-layer" className="flex items-center gap-1.5 font-bold text-stone-900">
        <Layers className="w-3.5 h-3.5 text-brand-600" />
        Map layer
      </label>
      <select
        id="map-layer"
        value={layer.id}
        onChange={(e) => onLayerChange(e.target.value)}
        className="mt-1 w-full bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-semibold text-stone-900"
      >
        {MAP_LAYERS.map((l) => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
      <p className="text-stone-600 mt-1.5 leading-snug">{layer.description}</p>
      {layer.legendUrl && (
        <img src={layer.legendUrl} alt={`Legend for ${layer.label}`} className="mt-1.5 w-full h-auto bg-white rounded" loading="lazy" />
      )}
      {layer.placeNames && (
        <label className="mt-2 flex items-center gap-2 text-stone-700 font-medium cursor-pointer">
          <input type="checkbox" checked={showPlaceNames} onChange={(e) => onShowPlaceNamesChange(e.target.checked)} className="accent-brand-600" />
          Show place names and borders
        </label>
      )}
    </div>
  );
}
