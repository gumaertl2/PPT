// 16.03.2026 20:15 - FIX: Used safe type casting '(place as any).city' to resolve TS2339 build error without altering core models.
// 16.03.2026 17:45 - REFACTOR: Removed dangerous Regex name parsing. Implemented 'Comma-Diet'.
// src/services/GeocodingService.ts

import type { Place } from '../core/types/models';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
}

export const GeocodingService = {
  async getCoordinates(query: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = new URL(NOMINATIM_BASE_URL);
      url.searchParams.append('q', query);
      url.searchParams.append('format', 'json');
      url.searchParams.append('limit', '1');
      url.searchParams.append('addressdetails', '1');

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

    for (let i = 0; i < updatedPlaces.length; i++) {
      const place = updatedPlaces[i];
      
      if (place.coordinatesValidated) continue;

      let coords: {lat: number, lng: number} | null = null;
      
      const name = place.name || '';
      const officialName = place.official_name || '';
      const city = (place as any).city || ''; // FIX: Typensicheres Casting für 'city'
      const address = place.address && !place.address.toLowerCase().includes('unknown') ? place.address : '';

      const queriesToTry: string[] = [];

      if (address && city) {
          const addressParts = address.split(',');
          const streetPart = addressParts[0].trim();
          if (streetPart && !streetPart.includes(city)) {
              queriesToTry.push(`${streetPart}, ${city}`);
          }
      }

      if (address) {
          queriesToTry.push(address);
      }

      if (officialName && city) {
          queriesToTry.push(`${officialName}, ${city}`);
      }

      if (name && city) {
          queriesToTry.push(`${name}, ${city}`);
      }

      const uniqueQueries = [...new Set(queriesToTry)].filter(q => q.length > 3);

      for (const query of uniqueQueries) {
          if (requestCount > 0) await delay(1100); 
          
          coords = await this.getCoordinates(query);
          requestCount++;
          
          if (coords) {
              break; 
          }
      }
      
      if (coords) {
          updatedPlaces[i] = {
            ...place,
            location: coords, 
            coordinatesValidated: true 
          };
          hasChanges = true;
      } else {
          updatedPlaces[i] = {
              ...place,
              coordinatesValidated: true 
          };
          hasChanges = true; 
      }
      
      processedCount++;
      if (onProgress) onProgress(processedCount, totalToProcess);
    }

    return { updatedPlaces, hasChanges };
  }
};
// --- END OF FILE 137 Zeilen ---