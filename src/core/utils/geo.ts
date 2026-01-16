// src/core/utils/geo.ts
// 16.01.2026 18:40 - FEAT: Implemented Haversine formula & Radius Filter for V30 parity (Food Logic).

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Berechnet die Distanz zwischen zwei Koordinaten in Kilometern.
 * Nutzt die Haversine-Formel für Kugeloberflächen.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Erdradius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distanz in km
  
  return Number(d.toFixed(3)); // 3 Nachkommastellen genau
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Helper für die V30 Eskalations-Logik.
 * Filtert Items, die im Radius liegen, und sortiert sie nach Nähe.
 * @param items Die Liste der Kandidaten (z.B. Restaurants aus der DB)
 * @param center Der Standort des Users (Hotel oder Sight)
 * @param radiusKm Der maximale Radius (z.B. 0.5, 2.0, 10.0)
 * @param getLocation Funktion, um lat/lng aus einem Item zu extrahieren
 */
export function filterByRadius<T>(
  items: T[],
  center: GeoPoint,
  radiusKm: number,
  getLocation: (item: T) => GeoPoint | undefined
): Array<T & { distance: number }> {
    
    if (!center || !center.lat || !center.lng) return [];

    const results = items.map(item => {
        const loc = getLocation(item);
        
        // Items ohne saubere Geodaten ignorieren wir
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;

        const dist = calculateDistance(center.lat, center.lng, loc.lat, loc.lng);
        
        if (dist <= radiusKm) {
            // Wir hängen die Distanz direkt an das Objekt dran für den Prompt später
            return { ...item, distance: dist };
        }
        return null;
    }).filter((item): item is T & { distance: number } => item !== null);

    // Sortierung: Das Nächste zuerst
    return results.sort((a, b) => a.distance - b.distance);
}
// --- END OF FILE 72 Zeilen ---