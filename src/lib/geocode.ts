import "server-only";

/**
 * Best-effort geocoding of city + country → lat/lng via OpenStreetMap
 * Nominatim (no key needed, ~1 req/s politeness). Coordinates only feed
 * the proximity score component; on any failure we return null and the
 * engine falls back to same-city comparison, so this can never block a
 * save.
 */
export async function geocodeCity(
  city: string,
  country: string,
): Promise<{ lat: number; lng: number } | null> {
  const q = `${city.trim()}, ${country.trim()}`;
  if (q.length < 4) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "datematch-agency-console/1.0 (matchmaking internal tool)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { lat?: string; lon?: string }[];
    const hit = json[0];
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
