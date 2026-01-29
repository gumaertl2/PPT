// 31.01.2026 17:30 - FEAT: Camper Awareness. Switches to Campsites if logistics_type is camper.
// src/core/prompts/templates/hotelScout.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildHotelScoutPrompt = (payload: any): string => {
  const { context } = payload;
  
  // 1. CAMPER DETECTION
  const isCamper = ['camper', 'rv', 'wohnmobil', 'mobile_home'].includes(context.logistics_type?.toLowerCase());
  
  const accommodationTerm = isCamper ? "Campsites / RV Parks (Stellplätze)" : "Hotels / Apartments";
  const parkingRule = isCamper ? "MUST be suitable for large vehicles (Camper)." : "MUST have parking.";

  const contextData = {
    search_hub: context.search_hub,
    duration: context.stay_duration,
    travelers: context.travelers,
    budget_level: context.budget, 
    vehicle: isCamper ? "Camper / RV" : "Car",
    trip_type: context.is_roundtrip ? "Roundtrip Stop" : "Stationary Base"
  };

  const role = `You are the "Accommodation Scout". 
  Your User travels by **${isCamper ? "CAMPER (Wohnmobil)" : "Car"}**.
  Find the best ${accommodationTerm} in the area.`;

  const instructions = `# TASK
Find 2-3 concrete **${accommodationTerm}** in or near **"${context.search_hub}"**.
Context: ${context.location_reasoning}

# STRICT RULES
1.  **Location:** Must be convenient for "${context.search_hub}".
2.  **Budget:** Adhere to "${context.budget}".
3.  **Requirements:**
    * **Pets:** ${context.travelers.pets ? "MUST allow pets." : "Irrelevant."}
    * **Vehicle:** ${parkingRule}
4.  **Rating:** Google Rating > 4.0 preferred.

# OUTPUT REQUIREMENTS
Explain the **"Location Match"**: Why is this ${isCamper ? "campsite" : "hotel"} perfect for the user's plan?`;

  const outputSchema = {
    "_thought_process": "String (Filter check: Budget, Pets, Vehicle, Location)",
    "candidates": [
      {
        "name": "String (Official Name)",
        "address": "String (Address)",
        "location_match": "String (Why good for this stop?)",
        "description": "String (Facilities & Vibe)",
        "price_estimate": "String",
        "bookingUrl": "String",
        "pros": ["String"],
        "rating": "Number"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "SEARCH PARAMETERS")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['research'])
    .build();
};
// --- END OF FILE 66 Zeilen ---