// 02.02.2026 15:30 - FIX: GOOGLE MAPS ROUTING API.
// - Uses official cross-platform URL syntax (https://www.google.com/maps/dir/?api=1).
// - Dynamic 'countryContext': Only appends country if provided (no defaults).
// src/features/Cockpit/utils.ts

/**
 * Generiert eine Google Maps Routen-URL basierend auf einer Liste von Orten.
 * @param locations Array von Strings (z.B. ["München", "Salzburg", "Wien"])
 * @param travelMode Optional: 'driving' (default), 'walking', 'bicycling', 'transit'
 * @param countryContext Optional: Land für Disambiguierung (z.B. "Italien"). Falls leer, wird nichts angehängt.
 */
export const generateGoogleMapsRouteUrl = (
  locations: (string | null | undefined)[],
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
  countryContext?: string 
): string | null => {
  // 1. Bereinigen
  const cleanLocations = locations.filter((loc): loc is string => !!loc && loc.trim().length > 0);

  if (cleanLocations.length < 2) {
    return null;
  }

  // Helper: Kontext anhängen (z.B. "Neustadt" -> "Neustadt, Deutschland")
  // Aber NUR, wenn countryContext auch wirklich existiert.
  const formatLoc = (loc: string) => {
      const cleanLoc = loc.trim();
      if (countryContext && !cleanLoc.toLowerCase().includes(countryContext.toLowerCase())) {
          return `${cleanLoc}, ${countryContext}`;
      }
      return cleanLoc;
  };

  // 2. Encoding für URL
  const origin = encodeURIComponent(formatLoc(cleanLocations[0]));
  const destination = encodeURIComponent(formatLoc(cleanLocations[cleanLocations.length - 1]));

  // 3. Waypoints
  let waypointsParam = '';
  if (cleanLocations.length > 2) {
    const waypoints = cleanLocations.slice(1, -1).map(loc => encodeURIComponent(formatLoc(loc)));
    waypointsParam = `&waypoints=${waypoints.join('|')}`;
  }

  // 4. Offizielle API URL (https://developers.google.com/maps/documentation/urls/get-started)
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=${travelMode}`;
};
// --- END OF FILE 48 Lines ---