// 10.02.2026 13:00 - FIX: Smart Rating Merge & Booking.com Filter.
// 11.02.2026 19:30 - FIX: Strict Type Compliance (LiveCheckResult & WorkflowStepId).
// src/services/LiveScout.ts

import { GeminiService } from './gemini'; 
import { useTripStore } from '../store/useTripStore';
import type { Place, LiveStatus } from '../core/types/models';

// FIX TS2430: Decoupled from Partial<LiveStatus> to allow loose JSON types (string) from AI
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
          4. Extract current GOOGLE MAPS RATING (1.0 - 5.0) and REVIEW COUNT.
             IMPORTANT: Ignore Booking.com or TripAdvisor scores (scale 1-10). ONLY use Google Maps 5-star scale.
          
          OUTPUT JSON (LiveStatus):
          {
            "status": "open" | "corrected" | "closed" | "permanently_closed",
            "operational": boolean,
            "openingHoursToday": "e.g. '09:00 - 18:00' or 'Closed now'",
            "note": "Short reason (e.g. 'Data confirmed', 'Hours changed: Closed Mon', 'Seasonal closure until April')",
            "rating": number (Google Rating 1.0-5.0),
            "user_ratings_total": number (Total count of reviews),
            "business_status": "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY"
          }

          RULES FOR STATUS:
          - 'open': Open during trip AND Stored Data was correct (Match).
          - 'corrected': Open during trip BUT Stored Data was wrong/outdated (Mismatch).
          - 'closed': Closed during trip (Seasonal/Renovation).
          - 'permanently_closed': Gone forever.
        `;

        try {
          // FIX TS2345: Use 'foodScout' as a valid WorkflowStepId (since 'duration' doesn't exist).
          // This is safe because it's just a key for logging/config, not logic.
          const result = await GeminiService.call<LiveCheckResult>(
            prompt, 
            'foodScout', 
            undefined,  // modelIdOverride
            undefined,  // onRetryDelay
            undefined,  // signal
            true        // enableGoogleSearch = true
          );

          if (result) {
            let finalStatus = result.status || 'unknown';
            if (result.operational === false) finalStatus = 'closed';
            
            // 1. Construct the LiveStatus Object
            const liveStatus: LiveStatus = {
              lastChecked: new Date().toISOString(),
              // Safe cast because we map logic, but strict typing wants exact literals.
              // We assume Gemini returns valid strings, but fallback to 'unknown' if needed in a real mapper.
              status: (['open', 'closed', 'permanently_closed', 'corrected'].includes(finalStatus) ? finalStatus : 'unknown') as any,
              operational: result.operational ?? true,
              openingHoursToday: result.openingHoursToday,
              nextOpen: result.nextOpen,
              note: result.note,
              rating: result.rating // Keep raw result in history
            };

            // 2. SMART MERGE: Prepare the root update object
            const updates: Partial<Place> = { liveStatus };

            // Rating Guard: Only accept 1.0 - 5.0. 
            if (
                typeof result.rating === 'number' && 
                result.rating > 0 && 
                result.rating <= 5.0
            ) {
                updates.rating = result.rating;
            }

            // Count Guard: Only accept positive numbers
            if (
                typeof result.user_ratings_total === 'number' && 
                result.user_ratings_total > 0
            ) {
                updates.user_ratings_total = result.user_ratings_total;
            }

            // Business Status: Always take if present
            // Cast to any because business_status might not be in the strict Place type yet
            if (result.business_status) {
                (updates as any).business_status = result.business_status;
            }

            // 3. Commit to Store
            store.updatePlace(placeId, updates);
            
            console.log(`[LiveScout] Verified ${place.name}: ${finalStatus} (Rating: ${result.rating ?? 'N/A'})`);
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
// --- END OF FILE 165 Zeilen ---