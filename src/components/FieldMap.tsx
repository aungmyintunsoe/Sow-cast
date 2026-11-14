import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Layers, Compass, Navigation } from 'lucide-react';
import type { RegionSummary } from '../types';

// Fix default Leaflet marker icon paths in Vite
const defaultIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="width:28px;height:28px;border-radius:9999px;background:#16a34a;border:3px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">🌱</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const selectedIcon = L.divIcon({
  className: 'custom-pin-selected',
  html: `<div style="width:36px;height:36px;border-radius:9999px;background:#0B3D91;border:3px solid #ffffff;box-shadow:0 4px 14px rgba(11,61,145,0.55);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

function MapFlyController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.1 });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface FieldMapProps {
  regions: RegionSummary[];
  selectedRegionId: string;
  onSelectRegion: (id: string, customCoords?: { lat: number; lon: number }) => void;
  onContinue: () => void;
}

export const FieldMap: React.FC<FieldMapProps> = ({
  regions,
  selectedRegionId,
  onSelectRegion,
  onContinue,
}) => {
  const [layerMode, setLayerMode] = useState<'satellite' | 'vegetation'>('satellite');
  const [showLabels, setShowLabels] = useState(true);
  const [customPin, setCustomPin] = useState<{ lat: number; lon: number; nearestName: string } | null>(null);

  const selectedRegion = regions.find((r) => r.id === selectedRegionId) || regions[0];
  const mapCenter: [number, number] = customPin
    ? [customPin.lat, customPin.lon]
    : selectedRegion
    ? [selectedRegion.lat, selectedRegion.lon]
    : [20, 0];

  const handleMapClick = (lat: number, lon: number) => {
    if (!regions.length) return;
    let nearest = regions[0];
    let minDist = Infinity;
    for (const r of regions) {
      const d = haversineKm(lat, lon, r.lat, r.lon);
      if (d < minDist) {
        minDist = d;
        nearest = r;
      }
    }
    setCustomPin({ lat, lon, nearestName: `${nearest.name}, ${nearest.place}` });
    onSelectRegion(nearest.id, { lat, lon });
  };

  const handleQuickPick = (id: string) => {
    setCustomPin(null);
    onSelectRegion(id);
  };

  return (
    <div className="space-y-4">
      {/* Plain-language prompt */}
      <div className="card-surface bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            1. Pick your field on the map
          </h2>
          <p className="text-stone-600 text-sm sm:text-base mt-1">
            Tap any pilot farm region below or click anywhere on the NASA satellite map to inspect 20+ years of weather, soil, and crop history.
          </p>
        </div>
        <button
          onClick={onContinue}
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition shrink-0 text-base"
        >
          <span>See What Satellites Say</span>
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Region Buttons (Farmer-friendly big touch targets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {regions.map((reg) => {
          const isSelected = reg.id === selectedRegionId && !customPin;
          return (
            <button
              key={reg.id}
              onClick={() => handleQuickPick(reg.id)}
              className={`card-surface text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-nasa-blue bg-blue-50/70 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-brand-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-stone-900 text-base">{reg.name}</div>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    {reg.place}
                  </div>
                </div>
                <MapPin
                  className={`w-5 h-5 shrink-0 ${
                    isSelected ? 'text-nasa-blue' : 'text-brand-600'
                  }`}
                />
              </div>
              {reg.tagline && (
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">{reg.tagline}</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Interactive Map */}
      <div className="card-surface relative rounded-2xl overflow-hidden border border-stone-300 shadow-sm h-[380px] sm:h-[460px] bg-stone-200">
        {/* Layer Controls */}
        <div className="absolute top-3 right-3 z-[400] flex flex-wrap gap-2">
          <div className="bg-white/95 backdrop-blur border border-stone-300 rounded-xl p-1 shadow flex items-center gap-1 text-xs font-semibold">
            <Layers className="w-4 h-4 text-nasa-blue ml-1.5" />
            <button
              onClick={() => setLayerMode('satellite')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                layerMode === 'satellite'
                  ? 'bg-nasa-blue text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              NASA True Color
            </button>
            <button
              onClick={() => setLayerMode('vegetation')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                layerMode === 'vegetation'
                  ? 'bg-brand-600 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              Plant Greenness
            </button>
          </div>
          <button
            onClick={() => setShowLabels((v) => !v)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold shadow transition ${
              showLabels
                ? 'bg-white text-stone-900 border-stone-300'
                : 'bg-stone-800 text-white border-stone-700'
            }`}
          >
            {showLabels ? 'Labels: ON' : 'Labels: OFF'}
          </button>
        </div>

        {/* Custom Pin Toast */}
        {customPin && (
          <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur border border-stone-300 rounded-xl px-3.5 py-2.5 shadow-md max-w-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-nasa-blue">
              <Compass className="w-4 h-4" />
              <span>
                Custom Pin ({customPin.lat.toFixed(2)}°, {customPin.lon.toFixed(2)}°)
              </span>
            </div>
            <p className="text-xs text-stone-700 mt-0.5">
              Matched to closest regional climate profile: <strong>{customPin.nearestName}</strong>
            </p>
          </div>
        )}

        <MapContainer
          center={mapCenter}
          zoom={7}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <MapFlyController center={mapCenter} zoom={customPin ? 8 : 7} />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* OpenStreetMap Base Fallback */}
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* NASA GIBS Satellite Layer (MODIS Terra True Color or VIIRS / NDVI) */}
          {layerMode === 'satellite' ? (
            <TileLayer
              attribution="NASA GIBS MODIS Terra"
              url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-06-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"
              maxNativeZoom={9}
              maxZoom={15}
              opacity={0.92}
            />
          ) : (
            <TileLayer
              attribution="NASA GIBS MODIS NDVI"
              url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/2024-06-17/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png"
              maxNativeZoom={9}
              maxZoom={15}
              opacity={0.85}
            />
          )}

          {/* OpenStreetMap / Carto Labels Overlay */}
          {showLabels && (
            <TileLayer
              attribution="Map labels"
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
              opacity={0.95}
            />
          )}

          {/* Region Markers */}
          {regions.map((r) => (
            <Marker
              key={r.id}
              position={[r.lat, r.lon]}
              icon={r.id === selectedRegionId && !customPin ? selectedIcon : defaultIcon}
              eventHandlers={{
                click: () => handleQuickPick(r.id),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-bold text-stone-900">{r.name}</div>
                  <div className="text-stone-600 text-xs">{r.place}</div>
                  <button
                    onClick={onContinue}
                    className="mt-2 w-full bg-brand-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                  >
                    Open Field Report →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Custom Clicked Pin */}
          {customPin && (
            <Marker position={[customPin.lat, customPin.lon]} icon={selectedIcon}>
              <Popup>
                <div className="text-xs">
                  <strong>Selected Field Location</strong>
                  <div>
                    {customPin.lat.toFixed(3)}°, {customPin.lon.toFixed(3)}°
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};
