import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Compass, Navigation } from 'lucide-react';
import type { RegionSummary } from '../../types';
import { nearestPlace } from '../../lib/geo';
import { PrimaryButton } from '../ui/Button';
import { Card, PageHeader } from '../ui/Card';
import { LayerPanel } from './LayerPanel';
import { BORDERS_URL, MAP_LAYERS, OSM_URL, PLACE_NAMES_URL } from './mapLayers';
import { RegionAccordion } from './RegionAccordion';

const dot = (size: number, color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
const REGION_ICON = dot(14, '#2c8742'); // brand-600
const SELECTED_ICON = dot(22, '#0B3D91'); // nasa-blue

function FlyTo({ lat, lon, zoom }: { lat: number; lon: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], zoom, { duration: 1 });
  }, [lat, lon, zoom, map]);
  return null;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

interface CustomPin {
  lat: number;
  lon: number;
  nearest: RegionSummary;
  km: number;
}

interface FieldMapProps {
  regions: RegionSummary[];
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  onContinue: () => void;
}

/** Step 1: pick a region from the country list or by tapping the map (the nearest region is used). */
export function FieldMap({ regions, selectedRegionId, onSelectRegion, onContinue }: FieldMapProps) {
  const selected = regions.find((r) => r.id === selectedRegionId) ?? regions[0];
  const [customPin, setCustomPin] = useState<CustomPin | null>(null);
  const [layerId, setLayerId] = useState(MAP_LAYERS[0].id);
  const [showPlaceNames, setShowPlaceNames] = useState(true);
  const [openCountry, setOpenCountry] = useState<string | null>(selected?.country ?? null);
  const layer = useMemo(() => MAP_LAYERS.find((l) => l.id === layerId) ?? MAP_LAYERS[0], [layerId]);

  // Open the selected region's country once the region list has loaded.
  useEffect(() => {
    if (selected) setOpenCountry((c) => c ?? selected.country);
  }, [selected]);

  const pick = (id: string) => {
    setCustomPin(null);
    onSelectRegion(id);
  };

  const handleMapClick = (lat: number, lon: number) => {
    const near = nearestPlace(lat, lon, regions);
    if (!near) return;
    setCustomPin({ lat, lon, nearest: near.place, km: near.km });
    setOpenCountry(near.place.country);
    onSelectRegion(near.place.id);
  };

  const focus = customPin ?? selected ?? { lat: 15, lon: 102 };

  return (
    <div className="space-y-4">
      <PageHeader
        title="1. Pick your area"
        description="Choose a farming region, or tap the map and we will use the nearest one."
        action={
          <PrimaryButton onClick={onContinue} disabled={!selected}>
            <span>Open satellite brief</span>
            <Navigation className="w-4 h-4" />
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_1fr] gap-4">
        <RegionAccordion
          regions={regions}
          selectedId={selected?.id}
          openCountry={openCountry}
          onToggleCountry={(country) => setOpenCountry((cur) => (cur === country ? null : country))}
          onPick={pick}
        />

        <Card className="relative overflow-hidden h-[420px] lg:h-[560px] bg-stone-200">
          <LayerPanel layer={layer} onLayerChange={setLayerId} showPlaceNames={showPlaceNames} onShowPlaceNamesChange={setShowPlaceNames} />

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

          <MapContainer center={[focus.lat, focus.lon]} zoom={6} minZoom={3} maxZoom={12} scrollWheelZoom className="w-full h-full">
            <FlyTo lat={focus.lat} lon={focus.lon} zoom={customPin ? 8 : 6} />
            <ClickHandler onClick={handleMapClick} />
            {layer.streetBase && <TileLayer key="base" attribution="&copy; OpenStreetMap contributors" url={OSM_URL} />}
            <TileLayer key={layer.id} attribution={layer.attribution} url={layer.url} maxNativeZoom={layer.maxNativeZoom} maxZoom={12} opacity={layer.opacity} />
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
                icon={r.id === selected?.id && !customPin ? SELECTED_ICON : REGION_ICON}
                eventHandlers={{
                  click: () => {
                    setOpenCountry(r.country);
                    pick(r.id);
                  },
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold text-stone-900">{r.name}</div>
                    <div className="text-stone-600 text-xs">{r.place}, {r.country}</div>
                    <button type="button" onClick={onContinue} className="mt-2 w-full bg-brand-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg">
                      Open satellite brief
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
            {customPin && <Marker position={[customPin.lat, customPin.lon]} icon={SELECTED_ICON} />}
          </MapContainer>
        </Card>
      </div>
    </div>
  );
}
