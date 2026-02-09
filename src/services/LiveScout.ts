// 09.02.2026 19:50 - FEAT: Added 'onProgress' callback to verifyBatch for UI feedback.
// 09.02.2026 19:15 - FEAT: Added 'verifyBatch' for optimized chunk processing (5 items/call).
// 09.02.2026 18:00 - FIX: Smart Travel-Date Aware Checks (Green/Orange/Red).
// src/services/LiveScout.ts

import { GeminiService } from './gemini';
import { useTripStore } from '../store/useTripStore';
import type { Place, LiveStatus } from '../core/types/models';

export const LiveScout = {
  
  /**
   * Prüft einen einzelnen Ort.
   */
  async verifyPlace(placeId: string): Promise<void> {
     return this.verifyBatch([placeId]);
  },

  /**
   * Prüft mehrere Orte in Chunks (Optimiert für Quota & Performance).
   * @param placeIds Liste der zu prüfenden IDs
   * @param onProgress Callback (completed, total) für UI Feedback
   */
  async verifyBatch(
      placeIds: string[], 
      onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const store = useTripStore.getState();
    const { dates } = store.project.userInputs;
    
    // Chunk Size: 5 parallel requests seems safe for Free Tier + Search
    const CHUNK_SIZE = 5; 
    let completedCount = 0;
    
    // Helper to process one item
    const processItem = async (placeId: string) => {
        const place = store.project.data.places[placeId];
        if (!place) return;

        const travelPeriod = dates?.start && dates?.end 
            ? `${dates.start} to ${dates.end}` 
            : "Coming weeks";

        const storedHours = place.openingHours 
            ? (Array.isArray(place.openingHours) ? place.openingHours.join(', ') : place.openingHours) 
            : "No hours stored";

        const prompt = `
          TASK: Verify this place for a traveler visiting from ${travelPeriod}.
          Use Google Search Grounding to check REAL-TIME status.

          PLACE: "${place.name}"
          ADDRESS: "${place.address || place.vicinity || 'Unknown'}"
          STORED_DATA_HOURS: "${storedHours}"
          
          ANALYSIS STEPS:
          1. Is it PERMANENTLY CLOSED?
          2. Is it open during the travel period (${travelPeriod})? Check for seasonal closures or renovation.
          3. Compare REAL opening hours with STORED_DATA_HOURS. 
             - Are they roughly the same? (Ignore minor format diffs) -> MATCH
             - Are they significantly different? -> MISMATCH
          
          OUTPUT JSON (LiveStatus):
          {
            "status": "open" | "corrected" | "closed" | "permanently_closed",
            "operational": boolean,
            "openingHoursToday": "e.g. '09:00 - 18:00' or 'Closed now'",
            "note": "Short reason (e.g. 'Data confirmed', 'Hours changed: Closed Mon', 'Seasonal closure until April')",
            "rating": number (Google Rating)
          }

          RULES FOR STATUS:
          - 'open': Open during trip AND Stored Data was correct (Match).
          - 'corrected': Open during trip BUT Stored Data was wrong/outdated (Mismatch).
          - 'closed': Closed during trip (Seasonal/Renovation).
          - 'permanently_closed': Gone forever.
        `;

        try {
          const result = await GeminiService.call<Partial<LiveStatus>>(
            prompt, 
            'durationEstimator', // Light model
            undefined, 
            undefined,
            undefined,
            true // ENABLE GOOGLE SEARCH
          );

          if (result) {
            let finalStatus = result.status || 'unknown';
            if (result.operational === false) finalStatus = 'closed';
            
            const liveStatus: LiveStatus = {
              lastChecked: new Date().toISOString(),
              status: finalStatus as any,
              operational: result.operational ?? true,
              openingHoursToday: result.openingHoursToday,
              nextOpen: result.nextOpen,
              note: result.note,
              rating: result.rating
            };

            // Update Store immediately for UI feedback
            store.updatePlace(placeId, { liveStatus });
            console.log(`[LiveScout] Verified ${place.name}: ${finalStatus}`);
          }
        } catch (error) {
          console.error(`[LiveScout] Error verifying ${place.name}:`, error);
        }
    };

    // Process Chunks
    for (let i = 0; i < placeIds.length; i += CHUNK_SIZE) {
        const chunk = placeIds.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(id => processItem(id)));
        
        completedCount += chunk.length;
        if (completedCount > placeIds.length) completedCount = placeIds.length;

        // Notify Progress
        if (onProgress) onProgress(completedCount, placeIds.length);
        
        // Small delay between chunks to be nice to the API
        if (i + CHUNK_SIZE < placeIds.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
  }
};
// --- END OF FILE 124 Zeilen ---