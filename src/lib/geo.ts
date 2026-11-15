/** Great-circle distance in kilometres. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** The place closest to a point, with its distance. Returns null for an empty list. */
export function nearestPlace<T extends { lat: number; lon: number }>(lat: number, lon: number, places: T[]) {
  let best: { place: T; km: number } | null = null;
  for (const place of places) {
    const km = haversineKm(lat, lon, place.lat, place.lon);
    if (!best || km < best.km) best = { place, km };
  }
  return best;
}
