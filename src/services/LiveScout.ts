// 09.02.2026 18:00 - FIX: Smart Travel-Date Aware Checks (Green/Orange/Red).
// 09.02.2026 17:15 - FEAT: LiveScout Service for Google Grounding Verification.
// src/services/LiveScout.ts

import { GeminiService } from './gemini';
import { useTripStore } from '../store/useTripStore';
import type { Place, LiveStatus } from '../core/types/models';

export const LiveScout = {
  
  /**
   * Prüft einen Ort live via Google Search Grounding.
   * Berücksichtigt Reisedatum und prüft auf Daten-Übereinstimmung.
   */
  async verifyPlace(placeId: string): Promise<void> {
    const store = useTripStore.getState();
    const place = store.project.data.places[placeId];
    const { dates } = store.project.userInputs;

    if (!place) {
      console.error(`[LiveScout] Place not found: ${placeId}`);
      return;
    }

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
        // Fallback logic if AI is lazy
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

        // Update Store
        store.updatePlace(placeId, { liveStatus });
        console.log(`[LiveScout] Verified ${place.name}: ${finalStatus}`);
      }

    } catch (error) {
      console.error(`[LiveScout] Error verifying ${place.name}:`, error);
    }
  }
};
// --- END OF FILE 79 Zeilen ---