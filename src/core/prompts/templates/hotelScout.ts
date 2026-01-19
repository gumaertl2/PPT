// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/hotelScout.ts
// 19.01.2026 19:55 - FIX: Corrected Export Signature & PromptBuilder Pattern.
// 19.01.2026 13:10 - FIX: Restored V30 Legacy Schema (hotel_vorschlaege, beschreibung) for SSOT compliance.
// 17.01.2026 15:30 - UPDATE: Added 'Geo-Hub' Logic for strategic location search.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildHotelScoutPrompt = (
    project: TripProject,
    locationName: string,
    checkInDate: string,
    checkOutDate: string
): string => {
  const { userInputs, analysis } = project;
  const { travelers, budget, logistics } = userInputs;

  // 1. CHEF PLANER DATA (V40 English Keys)
  const chefPlaner = analysis.chefPlaner;
  
  // Access strategic briefing (supporting both new and legacy keys for runtime safety)
  const strategicBriefing = (chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                            (chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                            "";
  
  // Access validated hotels
  const rawHotels = (chefPlaner as any)?.validated_hotels || (chefPlaner as any)?.validierte_hotels || [];
  
  const validierteHotels = rawHotels
    .filter((h: any) => h.station.toLowerCase().includes(locationName.toLowerCase()) || locationName.toLowerCase().includes(h.station.toLowerCase()));

  // 2. Context for AI
  const contextData = {
    destination: locationName,
    dates: { check_in: checkInDate, check_out: checkOutDate },
    travelers: {
        adults: travelers.adults,
        children: travelers.children,
        pets: travelers.pets // Important for filter!
    },
    budget_level: budget, // 'low', 'medium', 'high', 'luxury'
    transport_needs: (logistics as any).arrivalType === 'car' ? 'Parking required' : 'Public transport proximity'
  };

  const role = `You are the "Hotel Scout". Your task is to find the perfect accommodation for a given destination and travel dates.
  You search live for **available** options that match the budget and traveler profile.`;

  const instructions = `# TASK
Find 3 concrete accommodation options in or very close to **"${locationName}"**.

# STRATEGY & FILTERS
1.  **Location (Hub Strategy):** The accommodation must be strategically well-located to explore the surroundings.
2.  **Budget:** Strictly adhere to the budget level: ${budget}.
3.  **Logistics:**
    * If traveling by car: Parking is MANDATORY.
    * If pets are included: "Pets allowed" is MANDATORY.
4.  **Quality:** Only accommodations with Google Rating > 4.0.

# OPTION MIX
1.  **Option A (Value Winner):** Best balance.
2.  **Option B (Location Highlight):** Best view or center proximity.
3.  **Option C (Hidden Gem):** Small boutique hotel or charming apartment.

# OUTPUT SCHEMA
Fill the schema exactly for each option.
IMPORTANT: Research a real, working booking URL (Booking.com, Airbnb, or Direct).`;

  // FIX: Schema converted to V40 English keys
  const outputSchema = {
    "candidates": [
      {
        "name": "String (Official Name)",
        "address": "String (Address)",
        "description": "String (Why this choice? 1-2 sentences)",
        "price": "String (Estimated price per night)",
        "bookingUrl": "String (URL for booking or homepage)",
        "pros": ["String (Advantage 1)", "String (Advantage 2)"],
        "rating": "Number (Google Rating)"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "BOOKING REQUEST")
    .withContext(strategicBriefing, "STRATEGIC GUIDELINE")
    .withContext(validierteHotels, "VALIDATED HOTELS (FROM ARCHITECT)")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'research'])
    .build();
};
// --- END OF FILE 95 Zeilen ---