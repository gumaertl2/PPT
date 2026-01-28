// 29.01.2026 17:45 - FEAT: HotelScout Refactor (Logistics Optimizer & Strict Budget).
// 23.01.2026 15:25 - FIX: Synchronized Schema with CoT Instruction (added _thought_process).
// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/hotelScout.ts

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildHotelScoutPrompt = (
    project: TripProject,
    locationName: string, // This is now the specific HUB/DISTRICT from GeoAnalyst
    checkInDate: string,
    checkOutDate: string
): string => {
  const { userInputs, analysis } = project;
  const { travelers, budget, logistics } = userInputs;

  // 1. CHEF PLANER DATA
  const chefPlaner = analysis.chefPlaner;
  const strategicBriefing = (chefPlaner as any)?.strategic_briefing?.sammler_briefing || "";
  
  // 2. CONTEXT
  const contextData = {
    search_hub: locationName,
    dates: { check_in: checkInDate, check_out: checkOutDate },
    travelers: {
        adults: travelers.adults,
        children: travelers.children,
        pets: travelers.pets 
    },
    budget_level: budget, 
    logistics_mode: (logistics as any).arrivalType === 'car' ? 'Car (Parking Mandatory)' : 'Public Transport (Walking Distance Mandatory)'
  };

  const role = `You are the "Hotel Scout", a Logistics Optimizer and Accommodation Expert.
  Your goal is NOT just finding a bed, but minimizing travel stress and maximizing value.`;

  const instructions = `# TASK
Find 2-3 concrete accommodation options in **"${locationName}"**.

# STRICT RULES (GATEKEEPER)
1.  **Logistics Priority:** The hotel MUST be in the requested hub/district to ensure short travel times.
2.  **Budget Compliance:** Strictly adhere to "${budget}". Do not suggest luxury if budget is low.
    * Low: Hostel/Budget Hotel
    * Medium: 3-4 Star Standard
    * High/Luxury: 5 Star / Boutique
3.  **Mandatory Filters:**
    * **Pets:** ${travelers.pets ? "MUST allow pets." : "Irrelevant."}
    * **Car:** ${logistics.logistics.arrival.type === 'car' ? "MUST have parking (verify availability)." : "Near public transport."}
4.  **Rating:** Google Rating > 4.0 is mandatory.

# OUTPUT REQUIREMENTS
For each option, explain the **"Location Match"**: Why is this specific location perfect for the user's plan? (e.g. "Only 5 min walk to the main sight").`;

  const outputSchema = {
    "_thought_process": "String (Filter check: Budget, Pets, Parking, Location)",
    "candidates": [
      {
        "name": "String (Official Name)",
        "address": "String (Address)",
        "location_match": "String (Logistics reasoning: 'Perfect because...')",
        "description": "String (Vibe & Room description)",
        "price_estimate": "String (e.g. 'ca. 120€/Night')",
        "bookingUrl": "String (Real Booking Link)",
        "pros": ["String"],
        "rating": "Number (Google Rating)"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "SEARCH PARAMETERS")
    .withContext(strategicBriefing, "STRATEGIC GUIDELINE")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['research'])
    .build();
};
// --- END OF FILE 86 Zeilen ---