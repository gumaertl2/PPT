// 16.03.2026 17:45 - REFACTOR: Removed dangerous Regex name parsing. Implemented 'Comma-Diet' (Street + City) for highly robust OSM Nominatim queries.
// 16.03.2026 16:45 - FEAT: Implemented Multi-Step Fallback Strategy (Claude Idea 2).
// src/services/GeocodingService.ts

import type { Place } from '../core/types/models';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

// Wartet eine bestimmte Zeit (für Rate Limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
}

export const GeocodingService = {
  /**
   * Holt exakte Koordinaten für einen Suchbegriff.
   * Nutzt OpenStreetMap Nominatim.
   */
  async getCoordinates(query: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = new URL(NOMINATIM_BASE_URL);
      url.searchParams.append('q', query);
      url.searchParams.append('format', 'json');
      url.searchParams.append('limit', '1');
      url.searchParams.append('addressdetails', '1');

      // WICHTIG: Rate Limiting beachten (OSM Policy)
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept-Language': 'de,en', 
          'User-Agent': 'Papatours-App/1.0 (internal-dev-build)' 
        }
      });

      if (!response.ok) {
        console.warn(`Geocoding failed for "${query}": ${response.statusText}`);
        return null;
      }

      const data = await response.json() as NominatimResult[];

      if (data && data.length > 0) {
        const bestMatch = data[0];
        return {
          lat: parseFloat(bestMatch.lat),
          lng: parseFloat(bestMatch.lon)
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  },

  /**
   * Korrigiert eine Liste von Places nacheinander (Batch-Processing).
   * Nutzt eine intelligente Multi-Step Fallback Strategie, die auf OSM Nominatim optimiert ist.
   */
  async enrichPlacesWithCoordinates(
      places: Place[], 
      onProgress?: (processed: number, total: number) => void
  ): Promise<{ updatedPlaces: Place[], hasChanges: boolean }> {
      
    const updatedPlaces = [...places];
    let hasChanges = false;
    let requestCount = 0; 

    const totalToProcess = updatedPlaces.filter(p => !p.coordinatesValidated).length;
    let processedCount = 0;

    if (totalToProcess === 0) {
        return { updatedPlaces, hasChanges: false };
    }

    console.log(`[Geo] Starting smart validation for ${totalToProcess} places...`);

    for (let i = 0; i < updatedPlaces.length; i++) {
      const place = updatedPlaces[i];
      
      if (place.coordinatesValidated) continue;

      let coords: {lat: number, lng: number} | null = null;
      
      const name = place.name || '';
      const officialName = place.official_name || '';
      const city = place.city || '';
      const address = place.address && !place.address.toLowerCase().includes('unknown') ? place.address : '';

      const queriesToTry: string[] = [];

      // OSM HACK: Die "Komma-Diät"
      // Aus "C. Almirante Lallermand, 30, 35600 Puerto del Rosario, Fuerteventura"
      // machen wir "C. Almirante Lallermand, 30, Puerto del Rosario"
      if (address && city) {
          const addressParts = address.split(',');
          // Nimmt den ersten Teil (meist Straße + Nr) und hängt die Stadt an
          const streetPart = addressParts[0].trim();
          if (streetPart && !streetPart.includes(city)) {
              queriesToTry.push(`${streetPart}, ${city}`);
          }
      }

      // Versuch 2: Die komplette, rohe Adresse
      if (address) {
          queriesToTry.push(address);
      }

      // Versuch 3: Offizieller Name + Stadt (besser als der generierte KI-Name)
      if (officialName && city) {
          queriesToTry.push(`${officialName}, ${city}`);
      }

      // Versuch 4: Name + Stadt
      if (name && city) {
          queriesToTry.push(`${name}, ${city}`);
      }

      // Leere oder zu kurze Queries filtern & Duplikate entfernen
      const uniqueQueries = [...new Set(queriesToTry)].filter(q => q.length > 3);

      for (const query of uniqueQueries) {
          if (requestCount > 0) await delay(1100); // 1.1s Pause für Nominatim Policy
          
          console.log(`[Geo] Testing query: "${query}"`);
          coords = await this.getCoordinates(query);
          requestCount++;
          
          if (coords) {
              console.log(`[Geo] Success! Found match for "${name}" using query: "${query}"`);
              break; 
          }
      }
      
      if (coords) {
          // Bessere Koordinaten gefunden -> Überschreiben
          updatedPlaces[i] = {
            ...place,
            location: coords, 
            coordinatesValidated: true 
          };
          hasChanges = true;
      } else {
          // Nichts gefunden -> WICHTIG: Wir behalten die alten (KI) Koordinaten!
          // Wir setzen nur das Flag auf true, damit wir es nicht bei jedem Start neu versuchen.
          updatedPlaces[i] = {
              ...place,
              coordinatesValidated: true 
          };
          hasChanges = true; 
          console.log(`[Geo] Failed: No OSM result for "${name}" after ${uniqueQueries.length} attempts. Keeping original coordinates.`);
      }
      
      processedCount++;
      if (onProgress) onProgress(processedCount, totalToProcess);
    }

    return { updatedPlaces, hasChanges };
  }
};
// --- END OF FILE 137 Zeilen ---