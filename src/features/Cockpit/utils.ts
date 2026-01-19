// src/features/Cockpit/utils.ts
// 19.01.2026 16:30 - FIX: Corrected Google Maps URL format (Universal Cross-Platform).
// 15.01.2026 17:45 - NEW: Shared utility functions for Cockpit views (V30 Parity).

/**
 * Generiert eine Google Maps Routen-URL basierend auf einer Liste von Orten.
 * Die Orte können Adressen oder Namen sein.
 * * @param locations Array von Strings (z.B. ["München", "Salzburg", "Wien"])
 * @param travelMode Optional: 'driving' (default), 'walking', 'bicycling', 'transit'
 * @returns Die URL oder null, wenn zu wenige Orte (weniger als 2)
 */
export const generateGoogleMapsRouteUrl = (
  locations: (string | null | undefined)[],
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
): string | null => {
  // 1. Bereinigen: Leere Einträge entfernen
  const cleanLocations = locations.filter((loc): loc is string => !!loc && loc.trim().length > 0);

  if (cleanLocations.length < 2) {
    return null;
  }

  // 2. Start und Ziel extrahieren
  const origin = encodeURIComponent(cleanLocations[0]);
  const destination = encodeURIComponent(cleanLocations[cleanLocations.length - 1]);

  // 3. Waypoints (alles dazwischen)
  let waypointsParam = '';
  if (cleanLocations.length > 2) {
    const waypoints = cleanLocations.slice(1, -1).map(loc => encodeURIComponent(loc));
    waypointsParam = `&waypoints=${waypoints.join('|')}`;
  }

  // 4. URL bauen (Universal Cross-Platform)
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=${travelMode}`;
};
// --- END OF FILE 36 Zeilen ---