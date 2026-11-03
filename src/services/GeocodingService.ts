// [2026-11-03] [18:14] - FIX: Enforced generic target-country anchoring on all Nominatim queries and added ISO/DisplayNames country guard to prevent cross-continent geocoding.
// [2026-11-03] [14:59] - FIX: Prioritized POI name + address/addressCity before bare street address in Nominatim lookup to prevent ambiguous village street collisions.
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
  address?: {
    country?: string;
    country_code?: string;
  };
}

function doesResultMatchCountry(item: NominatimResult, expectedCountries?: string[]): boolean {
  if (!expectedCountries || expectedCountries.length === 0) return true;
  const expected = expectedCountries.map(c => c.trim().toLowerCase()).filter(Boolean);
  if (expected.length === 0) return true;

  const candidates = new Set<string>();
  if (item.address?.country) {
    candidates.add(item.address.country.trim().toLowerCase());
  }

  const cc = item.address?.country_code?.trim().toUpperCase();
  if (cc) {
    candidates.add(cc.toLowerCase());
    if (cc === 'US') candidates.add('usa');
    if (cc === 'GB') candidates.add('uk');
    const DisplayNamesCtor = (Intl as unknown as {
      DisplayNames?: new (locales: string[], options: { type: 'region' }) => { of: (code: string) => string | undefined };
    }).DisplayNames;
    if (DisplayNamesCtor) {
      for (const lang of ['de', 'en', cc.toLowerCase()]) {
        try {
          const displayName = new DisplayNamesCtor([lang], { type: 'region' }).of(cc);
          if (displayName) candidates.add(displayName.trim().toLowerCase());
        } catch {
          // Ignore unsupported locale codes
        }
      }
    }
  }

  const displayTail = item.display_name?.split(',').pop()?.trim().toLowerCase();
  if (displayTail) {
    candidates.add(displayTail);
  }

  if (candidates.size === 0) return true;
  return expected.some(exp => candidates.has(exp));
}

export const GeocodingService = {
  async getCoordinates(query: string, expectedCountries?: string[]): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = new URL(NOMINATIM_BASE_URL);
      url.searchParams.append('q', query);
      url.searchParams.append('format', 'json');
      url.searchParams.append('limit', '3');
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
        const validMatch = data.find(item => doesResultMatchCountry(item, expectedCountries));
        if (validMatch) {
          return {
            lat: parseFloat(validMatch.lat),
            lng: parseFloat(validMatch.lon)
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  },

  async enrichPlacesWithCoordinates(
      places: Place[], 
      onProgress?: (processed: number, total: number) => void,
      targetCountries?: string[]
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
      const addressParts = address ? address.split(',').map(p => p.trim()).filter(Boolean) : [];
      const streetPart = addressParts[0] || '';
      const addressCity = addressParts.length > 1 ? addressParts.slice(1).join(', ') : city;
      const addressCountry = (addressParts.length >= 3 && !/\d/.test(addressParts[addressParts.length - 1]))
          ? addressParts[addressParts.length - 1]
          : '';

      const expectedCountries = Array.from(new Set(
          [addressCountry, ...(targetCountries || [])].map(c => c.trim()).filter(Boolean)
      ));
      const primaryCountry = expectedCountries[0] || '';
      const withCountry = (q: string): string => {
          if (!primaryCountry) return q;
          const qLower = q.toLowerCase();
          if (expectedCountries.some(c => qLower.includes(c.toLowerCase()))) return q;
          return `${q}, ${primaryCountry}`;
      };

      if (name && address) {
          queriesToTry.push(withCountry(`${name}, ${address}`));
      }

      if (officialName && addressCity) {
          queriesToTry.push(withCountry(`${officialName}, ${addressCity}`));
      }

      if (name && addressCity) {
          queriesToTry.push(withCountry(`${name}, ${addressCity}`));
      }

      if (address) {
          queriesToTry.push(withCountry(address));
      }

      if (streetPart && city && !streetPart.toLowerCase().includes(city.toLowerCase())) {
          queriesToTry.push(withCountry(`${streetPart}, ${city}`));
          const bareStreet = streetPart.replace(/\s+\d+[a-zA-Z/-]*$/, '').replace(/^\d+[a-zA-Z/-]*\s+/, '').trim();
          if (bareStreet && bareStreet !== streetPart) {
              queriesToTry.push(withCountry(`${bareStreet}, ${city}`));
          }
      }

      if (name && city && city !== addressCity) {
          queriesToTry.push(withCountry(`${name}, ${city}`));
      }

      const uniqueQueries = [...new Set(queriesToTry)].filter(q => q.length > 3);

      for (const query of uniqueQueries) {
          if (requestCount > 0) await delay(1100); 
          
          coords = await this.getCoordinates(query, expectedCountries);
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
// --- END OF FILE 216 Zeilen ---