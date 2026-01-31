// 03.02.2026 12:30 - FIX: Replaced broken Google Maps URL with official API (dir/?api=1).
// Added 'countryContext' support to disambiguate locations (e.g. "Galle" -> "Galle, Sri Lanka").
// src/features/Cockpit/utils.ts

/**
 * Generiert eine Google Maps Routen-URL basierend auf einer Liste von Orten.
 * Die Orte können Adressen oder Namen sein.
 * @param locations Array von Strings (z.B. ["München", "Salzburg", "Wien"])
 * @param travelMode Optional: 'driving' (default), 'walking', 'bicycling', 'transit'
 * @param countryContext Optional: Land, das angehängt wird, falls der Ort mehrdeutig ist (z.B. "Sri Lanka")
 * @returns Die URL oder null, wenn zu wenige Orte (weniger als 2)
 */
export const generateGoogleMapsRouteUrl = (
  locations: (string | null | undefined)[],
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
  countryContext?: string
): string | null => {
  // 1. Bereinigen: Leere Einträge entfernen
  const cleanLocations = locations.filter((loc): loc is string => !!loc && loc.trim().length > 0);

  if (cleanLocations.length < 2) {
    return null;
  }

  // Helper: Kontext anhängen, wenn nötig (Fix für "Axel Galle-Röd" statt "Galle, Sri Lanka")
  const formatLoc = (loc: string) => {
      // Wenn wir ein Land haben und es noch NICHT im String steht, hängen wir es an.
      if (countryContext && !loc.toLowerCase().includes(countryContext.toLowerCase())) {
          return `${loc}, ${countryContext}`;
      }
      return loc;
  };

  // 2. Start und Ziel extrahieren
  const origin = encodeURIComponent(formatLoc(cleanLocations[0]));
  const destination = encodeURIComponent(formatLoc(cleanLocations[cleanLocations.length - 1]));

  // 3. Waypoints (alles dazwischen)
  let waypointsParam = '';
  if (cleanLocations.length > 2) {
    const waypoints = cleanLocations.slice(1, -1).map(loc => encodeURIComponent(formatLoc(loc)));
    waypointsParam = `&waypoints=${waypoints.join('|')}`;
  }

  // 4. URL bauen (Official Google Maps Directions API)
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=${travelMode}`;
};
// --- END OF FILE 48 Zeilen ---