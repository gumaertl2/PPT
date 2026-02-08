// 08.02.2026 12:00 - FIX: Direct import from 'models' to avoid Barrel-File binding errors.
// 08.02.2026 11:20 - FEAT: Updated to respect 'coordinatesValidated' flag and optimize API usage.
// src/services/GeocodingService.ts

// FIX: Direct import from models.ts to resolve "Binding name 'Place' is not found"
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
   * Holt exakte Koordinaten für einen Suchbegriff (Name + Stadt/Land).
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
          'Accept-Language': 'de', // Bevorzuge deutsche Ergebnisse
          // OSM verlangt einen User-Agent zur Identifizierung
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
   * Prüft 'coordinatesValidated' flag um unnötige Requests zu vermeiden.
   */
  async enrichPlacesWithCoordinates(
      places: Place[], 
      onProgress?: (processed: number, total: number) => void
  ): Promise<{ updatedPlaces: Place[], hasChanges: boolean }> {
      
    const updatedPlaces = [...places];
    let hasChanges = false;
    let requestCount = 0; // Zähler für echte API Calls

    const totalToProcess = updatedPlaces.filter(p => !p.coordinatesValidated).length;
    let processedCount = 0;

    if (totalToProcess === 0) {
        return { updatedPlaces, hasChanges: false };
    }

    console.log(`[Geo] Starting validation for ${totalToProcess} places...`);

    for (let i = 0; i < updatedPlaces.length; i++) {
      const place = updatedPlaces[i];
      
      // Skip if already validated
      if (place.coordinatesValidated) continue;

      const query = place.address || `${place.name} ${place.vicinity || ''}`;
      
      if (query && query.length > 3) {
        // Mindestens 1.1 Sekunde warten zwischen Calls, wenn wir bereits einen Request gemacht haben
        if (requestCount > 0) await delay(1100); 

        const coords = await this.getCoordinates(query);
        requestCount++;
        
        if (coords) {
          updatedPlaces[i] = {
            ...place,
            location: coords, // Überschreibe Gemini-Schätzung mit echten Daten
            coordinatesValidated: true // Mark as validated
          };
          hasChanges = true;
          console.log(`[Geo] Fixed: ${place.name} -> ${coords.lat}, ${coords.lng}`);
        } else {
            // Auch wenn wir nichts finden, markieren wir es als "versucht/validiert",
            // damit wir nicht endlos anfragen. (Optional: separates Flag 'validationFailed')
            updatedPlaces[i] = {
                ...place,
                coordinatesValidated: true 
            };
            hasChanges = true; // State change even if coords didn't change (flag update)
            console.log(`[Geo] No result for: ${query} (Marked as validated to prevent retry)`);
        }
      }
      
      processedCount++;
      if (onProgress) onProgress(processedCount, totalToProcess);
    }

    return { updatedPlaces, hasChanges };
  }
};
// --- END OF FILE 115 Zeilen ---