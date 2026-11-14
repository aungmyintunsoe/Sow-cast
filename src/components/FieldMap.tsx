import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ChevronDown, Compass, Layers, MapPin, Navigation } from 'lucide-react';
import type { RegionSummary } from '../types';
import { BORDERS_URL, MAP_LAYERS, PLACE_NAMES_URL } from './mapLayers';

const OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const pin = (size: number, color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
const regionIcon = pin(14, '#2c8742');
const selectedIcon = pin(22, '#0B3D91');

function MapFlyController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1 });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface FieldMapProps {
  regions: RegionSummary[];
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  onContinue: () => void;
}

export const FieldMap: React.FC<FieldMapProps> = ({ regions, selectedRegionId, onSelectRegion, onContinue }) => {
  const [customPin, setCustomPin] = useState<{ lat: number; lon: number; nearest: RegionSummary; km: number } | null>(null);
  const [layerId, setLayerId] = useState(MAP_LAYERS[0].id);
  const [showPlaceNames, setShowPlaceNames] = useState(true);
  const layer = MAP_LAYERS.find((l) => l.id === layerId) ?? MAP_LAYERS[0];
  const selected = regions.find((r) => r.id === selectedRegionId) ?? regions[0];

  const byCountry = useMemo(() => {
    const groups: Record<string, RegionSummary[]> = {};
    for (const r of regions) (groups[r.country] ??= []).push(r);
    return Object.entries(groups);
  }, [regions]);
  const [openCountry, setOpenCountry] = useState<string | null>(selected?.country ?? null);
  useEffect(() => {
    if (selected) setOpenCountry((c) => c ?? selected.country);
  }, [selected]);

  const center: [number, number] = customPin ? [customPin.lat, customPin.lon] : selected ? [selected.lat, selected.lon] : [15, 102];

  const pick = (id: string) => {
    setCustomPin(null);
    onSelectRegion(id);
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (!regions.length) return;
    let nearest = regions[0];
    let km = Infinity;
    for (const r of regions) {
      const d = haversineKm(lat, lon, r.lat, r.lon);
      if (d < km) [nearest, km] = [r, d];
    }
    setCustomPin({ lat, lon, nearest, km });
    setOpenCountry(nearest.country);
    onSelectRegion(nearest.id);
  };

  return (
    <div className="space-y-4">
      <div className="card-surface bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">1. Pick your area</h2>
          <p className="text-stone-600 text-sm sm:text-base mt-1">
            Choose a farming region, or tap the map and we will use the nearest one.
          </p>
        </div>
        <button
          onClick={onContinue}
          disabled={!selected}
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition shrink-0 text-base"
        >
          <span>Open satellite brief</span>
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_1fr] gap-4">
        {/* Region accordion, grouped by country */}
        <div className="card-surface bg-white rounded-2xl border border-stone-200 overflow-hidden self-start">
          {byCountry.map(([country, list]) => {
            const open = openCountry === country;
            const panelId = `regions-${country.toLowerCase()}`;
            return (
              <div key={country} className="border-b border-stone-200 last:border-b-0">
                <button
                  onClick={() => setOpenCountry(open ? null : country)}
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
                      const isSel = r.id === selected?.id;
                      return (
                        <li key={r.id}>
                          <button
                            onClick={() => pick(r.id)}
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
        </div>

        {/* Plant greenness map */}
        <div className="card-surface relative rounded-2xl overflow-hidden border border-stone-300 h-[420px] lg:h-[560px] bg-stone-200">
          {/* Layer picker + legend */}
          <div className="absolute top-3 right-3 z-[400] bg-white/95 border border-stone-300 rounded-xl px-3 py-2.5 text-xs shadow-sm w-60 max-w-[calc(100%-4.5rem)]">
            <label htmlFor="map-layer" className="flex items-center gap-1.5 font-bold text-stone-900">
              <Layers className="w-3.5 h-3.5 text-brand-600" />
              Map layer
            </label>
            <select
              id="map-layer"
              value={layer.id}
              onChange={(e) => setLayerId(e.target.value)}
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
                <input type="checkbox" checked={showPlaceNames} onChange={(e) => setShowPlaceNames(e.target.checked)} className="accent-brand-600" />
                Show place names and borders
              </label>
            )}
          </div>

          {customPin && (
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 border border-stone-300 rounded-xl px-3.5 py-2.5 shadow-sm max-w-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-nasa-blue">
                <Compass className="w-4 h-4" />
                <span>
                  Your pin ({customPin.lat.toFixed(2)}°, {customPin.lon.toFixed(2)}°)
                </span>
              </div>
              <p className="text-xs text-stone-700 mt-0.5">
                Using the nearest region, <strong>{customPin.nearest.name}</strong> ({Math.round(customPin.km)} km away).
              </p>
            </div>
          )}

          <MapContainer center={center} zoom={6} minZoom={3} maxZoom={12} scrollWheelZoom className="w-full h-full">
            <MapFlyController center={center} zoom={customPin ? 8 : 6} />
            <MapClickHandler onMapClick={handleMapClick} />
            {layer.streetBase && <TileLayer key="base" attribution="&copy; OpenStreetMap contributors" url={OSM} />}
            <TileLayer
              key={layer.id}
              attribution={layer.attribution}
              url={layer.url}
              maxNativeZoom={layer.maxNativeZoom}
              maxZoom={12}
              opacity={layer.opacity}
            />
            {layer.placeNames && showPlaceNames && (
              <>
                <TileLayer key={`borders-${layer.id}`} url={BORDERS_URL} maxNativeZoom={9} maxZoom={12} attribution="NASA GIBS reference (OpenStreetMap)" />
                <TileLayer key={`names-${layer.id}`} url={PLACE_NAMES_URL} maxNativeZoom={9} maxZoom={12} />
              </>
            )}
            {regions.map((r) => (
              <Marker
                key={r.id}
                position={[r.lat, r.lon]}
                icon={r.id === selected?.id && !customPin ? selectedIcon : regionIcon}
                eventHandlers={{ click: () => { setOpenCountry(r.country); pick(r.id); } }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold text-stone-900">{r.name}</div>
                    <div className="text-stone-600 text-xs">{r.place}, {r.country}</div>
                    <button
                      onClick={onContinue}
                      className="mt-2 w-full bg-brand-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                    >
                      Open satellite brief
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
            {customPin && <Marker position={[customPin.lat, customPin.lon]} icon={selectedIcon} />}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
