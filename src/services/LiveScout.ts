// 12.02.2026 16:00 - FEAT: BULK PROCESSING (10 items per Call) to save API Quota.
// 12.02.2026 16:45 - FIX: Added strict Booking.com filter from previous version.
// src/services/LiveScout.ts

import { GeminiService } from './gemini'; 
import { useTripStore } from '../store/useTripStore';
import type { Place, LiveStatus } from '../core/types/models';

// Decoupled interface for raw AI response
interface LiveCheckResult {
  status?: string;
  operational?: boolean;
  openingHoursToday?: string;
  nextOpen?: string;
  note?: string;
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
}

export const LiveScout = {
  
  /**
   * Prüft einen einzelnen Ort (Wrapper für Batch).
   */
  async verifyPlace(placeId: string): Promise<void> {
      return this.verifyBatch([placeId]);
  },

  /**
   * Prüft mehrere Orte in ECHTEN BULK-REQUESTS (1 Call = N Places).
   * Spart massiv API-Calls (Faktor 10).
   */
  async verifyBatch(
      placeIds: string[], 
      onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const store = useTripStore.getState();
    const { dates } = store.project.userInputs;
    
    // OPTIMIZATION: Process 10 items in ONE API Call.
    const BATCH_SIZE = 10; 
    let completedCount = 0;
    
    const travelPeriod = dates?.start && dates?.end 
            ? `${dates.start} to ${dates.end}` 
            : "Coming weeks";

    // Helper to process a chunk
    const processChunk = async (chunkIds: string[]) => {
        // 1. Prepare Data for Prompt
        const placesData = chunkIds.map(id => {
            const p = store.project.data.places[id];
            return p ? {
                id: p.id,
                name: p.name,
                address: p.address || p.vicinity || 'Address unknown',
                stored_hours: p.openingHours ? (Array.isArray(p.openingHours) ? p.openingHours.join(', ') : p.openingHours) : "N/A"
            } : null;
        }).filter(Boolean);

        if (placesData.length === 0) return;

        // 2. Build BULK Prompt
        const prompt = `
          TASK: Verify the status of the following ${placesData.length} places for a traveler visiting: ${travelPeriod}.
          Use Google Search Grounding to check REAL-TIME status.

          ### INPUT LIST:
          ${JSON.stringify(placesData, null, 2)}
          
          ### ANALYSIS RULES:
          1. **Status Check:** Is it OPEN, CLOSED (Seasonal/Renovation), or PERMANENTLY CLOSED?
          2. **Hours:** What are the opening hours TODAY?
          3. **Rating:** Extract current GOOGLE MAPS Rating (1.0-5.0) and Count.
             **CRITICAL:** Ignore Booking.com, TripAdvisor, or Facebook scores. ONLY use the Google 5-star scale.
          
          ### OUTPUT FORMAT:
          Return a JSON OBJECT where the keys are the IDs from the input list.
          Example:
          {
            "place_id_1": { "status": "open", "rating": 4.5, "note": "Confirmed" },
            "place_id_2": { "status": "closed", "note": "Renovation" }
          }

          REQUIRED FIELDS PER ITEM:
          - status: "open" | "closed" | "permanently_closed" | "corrected" | "unknown"
          - operational: boolean
          - openingHoursToday: string (e.g. "09:00 - 18:00" or "Closed")
          - note: Short info (e.g. "Open daily", "Closed for winter")
          - rating: number (Google Scale)
          - user_ratings_total: number
        `;

        try {
          // Use 'foodScout' as key to utilize existing configs
          const rawResult = await GeminiService.call<Record<string, LiveCheckResult>>(
            prompt, 
            'foodScout', 
            undefined, 
            undefined, 
            undefined, 
            true // Enable Search
          );

          if (rawResult) {
            // 3. Process Results & Update Store
            Object.keys(rawResult).forEach(id => {
                const result = rawResult[id];
                if (!result) return;

                let finalStatus = result.status || 'unknown';
                if (result.operational === false) finalStatus = 'closed';

                // Construct LiveStatus
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

                // Update Ratings if valid (Guard against hallucinations)
                if (typeof result.rating === 'number' && result.rating > 0 && result.rating <= 5.0) {
                    updates.rating = result.rating;
                }
                if (typeof result.user_ratings_total === 'number' && result.user_ratings_total > 0) {
                    updates.user_ratings_total = result.user_ratings_total;
                }

                // Business Status
                if (result.business_status) {
                    (updates as any).business_status = result.business_status;
                }

                // Commit Update
                store.updatePlace(id, updates);
                console.log(`[LiveScout] Batch Verified ${id}: ${finalStatus}`);
            });
          }
        } catch (error) {
          console.error(`[LiveScout] Batch Error:`, error);
        }
    };

    // Process Chunks Sequentially
    for (let i = 0; i < placeIds.length; i += BATCH_SIZE) {
        const chunk = placeIds.slice(i, i + BATCH_SIZE);
        await processChunk(chunk);
        
        completedCount += chunk.length;
        if (completedCount > placeIds.length) completedCount = placeIds.length;

        if (onProgress) onProgress(completedCount, placeIds.length);
        
        // Small breathing room between batches
        if (i + BATCH_SIZE < placeIds.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
  }
};
// --- END OF FILE 145 Zeilen ---