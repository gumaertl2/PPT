// 16.03.2026 18:15 - FIX: Added 'city' to payload and strictly enforced 'Location Match' rule to prevent AI from hallucinating same-name places in wrong cities.
// 16.03.2026 17:15 - FIX: Added aggressive API throttling (2.5s) and strict Error throwing for UI alerts.
// 16.03.2026 16:45 - FEAT: Added verified_address/city extraction and auto-trigger for Geo-Validation.
// src/services/LiveScout.ts

import { GeminiService } from './gemini'; 
import { useTripStore } from '../store/useTripStore';
import type { Place, LiveStatus } from '../core/types/models';

interface LiveCheckResult {
  status?: string;
  operational?: boolean;
  openingHoursToday?: string;
  nextOpen?: string;
  note?: string;
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  verified_address?: string;
  verified_city?: string;
}

export const LiveScout = {
  
  async verifyPlace(placeId: string): Promise<void> {
      return this.verifyBatch([placeId]);
  },

  async verifyBatch(
      placeIds: string[], 
      onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const store = useTripStore.getState();
    const { dates } = store.project.userInputs;
    
    const BATCH_SIZE = 10; 
    let completedCount = 0;
    
    const travelPeriod = dates?.start && dates?.end 
            ? `${dates.start} to ${dates.end}` 
            : "Coming weeks";

    const processChunk = async (chunkIds: string[]) => {
        const placesData = chunkIds.map(id => {
            const p = store.project.data.places[id];
            return p ? {
                id: p.id,
                name: p.name,
                city: p.city || 'Unknown City', // FIX: Explizit die Stadt übergeben!
                address: p.address || p.vicinity || 'Address unknown',
                stored_hours: p.openingHours ? (Array.isArray(p.openingHours) ? p.openingHours.join(', ') : p.openingHours) : "N/A"
            } : null;
        }).filter(Boolean);

        if (placesData.length === 0) return;

        const prompt = `
          TASK: Verify the status of the following ${placesData.length} places for a traveler visiting: ${travelPeriod}.
          Use Google Search Grounding to check REAL-TIME status.

          ### INPUT LIST:
          ${JSON.stringify(placesData, null, 2)}
          
          ### ANALYSIS RULES:
          0. **Location Match (CRITICAL):** You MUST verify the place in the EXACT 'city' and 'address' provided. Do NOT return data for a place with the same name in a different city or country. If the place cannot be found in the specified city, set status to 'unknown'.
          1. **Status Check:** Is it OPEN, CLOSED (Seasonal/Renovation), or PERMANENTLY CLOSED?
          2. **Hours:** What are the opening hours TODAY?
          3. **Rating:** Extract current GOOGLE MAPS Rating (1.0-5.0) and Count.
             **CRITICAL:** Ignore Booking.com, TripAdvisor, or Facebook scores. ONLY use the Google 5-star scale.
          4. **Address Validation:** Extract the EXACT, official street address and city from the Google profile to fix our map.
          
          ### OUTPUT FORMAT:
          Return a JSON OBJECT where the keys are the IDs from the input list.
          Example:
          {
            "place_id_1": { "status": "open", "rating": 4.5, "note": "Confirmed", "verified_address": "Main St 1", "verified_city": "London" }
          }

          REQUIRED FIELDS PER ITEM:
          - status: "open" | "closed" | "permanently_closed" | "corrected" | "unknown"
          - operational: boolean
          - openingHoursToday: string (e.g. "09:00 - 18:00" or "Closed")
          - note: Short info (e.g. "Open daily", "Closed for winter")
          - rating: number (Google Scale)
          - user_ratings_total: number
          - verified_address: string
          - verified_city: string
        `;

        try {
          const rawResult = await GeminiService.call<Record<string, LiveCheckResult>>(
            prompt, 
            'foodScout', 
            undefined, 
            undefined, 
            undefined, 
            true 
          );

          if (rawResult) {
            Object.keys(rawResult).forEach(id => {
                const result = rawResult[id];
                if (!result) return;

                const currentPlace = store.project.data.places[id];
                if (!currentPlace) return;

                let finalStatus = result.status || 'unknown';
                if (result.operational === false) finalStatus = 'closed';

                const liveStatus: LiveStatus = {
                    lastChecked: new Date().toISOString(),
                    status: (['open', 'closed', 'permanently_closed', 'corrected'].includes(finalStatus) ? finalStatus : 'unknown') as any,
                    operational: result.operational ?? true,
                    openingHoursToday: result.openingHoursToday,
                    nextOpen: result.nextOpen,
                    note: result.note,
                    rating: result.rating
                };

                const updates: Partial<Place> = { liveStatus };

                if (typeof result.rating === 'number' && result.rating > 0 && result.rating <= 5.0) {
                    updates.rating = result.rating;
                }
                if (typeof result.user_ratings_total === 'number' && result.user_ratings_total > 0) {
                    updates.user_ratings_total = result.user_ratings_total;
                }

                if (result.business_status) {
                    (updates as any).business_status = result.business_status;
                }

                // Apply verified address if it looks better than current
                if (result.verified_address && result.verified_address.length > 5 && result.verified_address !== currentPlace.address) {
                    updates.address = result.verified_address;
                    if (result.verified_city) updates.city = result.verified_city;
                    updates.coordinatesValidated = false; 
                    console.log(`[LiveScout] Better address found for ${currentPlace.name}. Geo-Validation triggered!`);
                }

                store.updatePlace(id, updates);
                console.log(`[LiveScout] Batch Verified ${id}: ${finalStatus}`);
            });
          }
        } catch (error) {
          console.error(`[LiveScout] Chunk Error:`, error);
          throw error; 
        }
    };

    for (let i = 0; i < placeIds.length; i += BATCH_SIZE) {
        const chunk = placeIds.slice(i, i + BATCH_SIZE);
        await processChunk(chunk);
        
        completedCount += chunk.length;
        if (completedCount > placeIds.length) completedCount = placeIds.length;

        if (onProgress) onProgress(completedCount, placeIds.length);
        
        if (i + BATCH_SIZE < placeIds.length) {
            await new Promise(resolve => setTimeout(resolve, 2500));
        }
    }
  }
};
// --- END OF FILE 164 Zeilen ---