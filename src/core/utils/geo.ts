// 30.01.2026 01:15 - FIX: Serial Geocoding (Throttle) to prevent API blocks. Added 'cleanLocationName'.
// 29.01.2026 15:00 - FEAT: Added Geocoding & Adaptive Radius Logic for Food Scout Phase 2.
// 16.01.2026 18:40 - FEAT: Implemented Haversine formula & Radius Filter for V30 parity (Food Logic).
// src/core/utils/geo.ts

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

/**
 * FIX: Cleans location names for better Geocoding success.
 * "Region Stuttgart" -> "Stuttgart"
 * "Region Freiburg / Südschwarzwald" -> "Freiburg"
 */
function cleanLocationName(rawName: string): string {
    if (!rawName) return "";
    let clean = rawName;
    
    // Remove "Region " prefix
    clean = clean.replace(/^Region\s+/i, '');
    
    // Remove everything after "/" or "("
    clean = clean.split('/')[0];
    clean = clean.split('(')[0];
    
    return clean.trim();
}

/**
 * PHASE 2: GEO-FILTER & GEOCODING
 * Ermittelt Koordinaten via OpenStreetMap (Nominatim)
 */
export async function geocodeLocation(query: string): Promise<GeoPoint | null> {
    try {
        // FIX: Clean the name before asking OSM
        const cleanQuery = cleanLocationName(query);
        if (!cleanQuery) return null;

        // Nutzung der öffentlichen Nominatim API (Bitte User-Agent beachten!)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=1`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Papatours-AI-Client/4.0' }
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (error) {
        console.warn(`Geocoding failed for "${query}":`, error);
        return null;
    }
}

/**
 * PHASE 2: ADAPTIVE LOGIK
 * Filtert Kandidaten basierend auf Kontext (Stadt vs. Region)
 * Eskaliert Radius wenn zu wenige Treffer.
 * UPGRADE: Supports Array of Centers (Multi-Stop) & Serial Execution.
 */
export async function applyAdaptiveGeoFilter(
    candidates: any[],
    centerLocation: string | string[], 
    contextType: 'district' | 'region' | 'adhoc'
): Promise<any[]> {
    
    // 1. Zentren ermitteln (SERIALISIERT für API-Schutz)
    const locationsToCode = Array.isArray(centerLocation) ? centerLocation : [centerLocation];
    const validCenters: Array<{ name: string, pt: GeoPoint }> = [];

    for (const locName of locationsToCode) {
        if (!locName || locName === "Unknown") continue;
        
        const geo = await geocodeLocation(locName);
        if (geo) {
            validCenters.push({ name: locName, pt: geo });
        } else {
            console.warn(`Geo-Filter: Could not resolve coordinates for "${locName}" (cleaned: "${cleanLocationName(locName)}")`);
        }

        // THROTTLE: 1 Sekunde Pause zwischen Requests, wenn mehr als 1 Ort
        if (locationsToCode.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    if (validCenters.length === 0) {
        console.warn("Geo-Filter skipped: No valid centers found via Geocoding.");
        return candidates; // Fallback: Alles durchlassen
    }

    console.log(`Geo-Filter active with ${validCenters.length} centers: ${validCenters.map(c => c.name).join(', ')}`);

    // 2. Kandidaten vervollständigen (Falls Lat/Lng fehlt)
    const validCandidates = [];
    for (const cand of candidates) {
        let loc = cand.location;
        // Wenn keine Location im Objekt, versuche Geocoding über Adresse/Stadt
        if (!loc || !loc.lat) {
            const query = `${cand.name} ${cand.address || ''} ${cand.city || ''}`;
            const geo = await geocodeLocation(query);
            // Auch hier: Kurze Pause, falls wir viele Kandidaten geocodieren müssen? 
            // Kandidaten-Geocoding ist riskant in der Masse. 
            // Vorerst ohne Throttle hier, da meistens Lat/Lng vom Scout kommt.
            if (geo) {
                cand.location = geo;
                loc = geo;
            }
        }
        
        if (loc && loc.lat && loc.lng) {
            validCandidates.push(cand);
        }
    }

    // 3. Adaptiver Radius
    let radius = 15.0; // Default Region
    if (contextType === 'district') radius = 2.0; // Strict City limit
    if (contextType === 'adhoc') radius = 20.0;

    // 4. Multi-Center Filter Logic
    // Ein Kandidat bleibt, wenn er nah an IRGENDEINEM Zentrum ist.
    let filtered = validCandidates.map(cand => {
        const candLoc = cand.location;
        let bestDist = Infinity;
        let bestCenter = "";

        // Finde das nächstgelegene Zentrum
        for (const center of validCenters) {
            const dist = calculateDistance(center.pt.lat, center.pt.lng, candLoc.lat, candLoc.lng);
            if (dist < bestDist) {
                bestDist = dist;
                bestCenter = center.name;
            }
        }

        if (bestDist <= radius) {
            return { ...cand, distance: bestDist, nearest_hub: bestCenter };
        }
        return null;
    }).filter((item): item is any => item !== null);

    // 5. Eskalation (nur bei Region/Adhoc, nicht bei striktem District)
    if (filtered.length < 2 && contextType !== 'district') {
        const expandedRadius = 50.0;
        console.log(`Geo-Filter: Extending radius from ${radius}km to ${expandedRadius}km due to low results.`);
        
        filtered = validCandidates.map(cand => {
            const candLoc = cand.location;
            let bestDist = Infinity;
            for (const center of validCenters) {
                const dist = calculateDistance(center.pt.lat, center.pt.lng, candLoc.lat, candLoc.lng);
                if (dist < bestDist) bestDist = dist;
            }
            if (bestDist <= expandedRadius) {
                return { ...cand, distance: bestDist };
            }
            return null;
        }).filter((item): item is any => item !== null);
    }

    return filtered.sort((a, b) => (a?.distance || 0) - (b?.distance || 0));
}
// --- END OF FILE 190 Zeilen ---