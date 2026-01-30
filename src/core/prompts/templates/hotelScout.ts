// 01.02.2026 23:05 - FIX: Replaced invalid SelfCheck type 'safety' with 'research'.
// src/core/prompts/templates/hotelScout.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildHotelScoutPrompt = (payload: any): string => {
  const { context } = payload;
  
  // 1. CAMPER DETECTION
  const isCamper = ['camper', 'rv', 'wohnmobil', 'mobile_home'].includes(context.logistics_type?.toLowerCase());
  
  // Dynamic Terminology
  const accommodationTerm = isCamper ? "CAMPSITES / RV PARKS (Stellplätze)" : "HOTELS / APARTMENTS";
  const strategyContext = context.is_roundtrip 
    ? "STRATEGY: ROUNDTRIP STOP. Find a convenient rest stop near the route." 
    : "STRATEGY: STATIONARY BASE. Find a central 'Base Camp' for day-trips.";

  const contextData = {
    search_hub: context.search_hub,
    duration: context.stay_duration,
    travelers: context.travelers,
    budget_level: context.budget, 
    vehicle: isCamper ? "Large Vehicle (Camper/RV)" : "Car",
    trip_mode: strategyContext
  };

  const role = `You are the **Strategic Accommodation Scout**. 
  Your mission is not just to find a bed, but to find the perfect **Logistical Base** for the user's trip type.
  You are searching for: **${accommodationTerm}**.`;

  const instructions = `# PHASE 1: CONSTRAINT ANALYSIS
Check the "Vehicle" and "Budget" constraints immediately.
1. **VEHICLE CHECK:** User drives a **${isCamper ? "CAMPER" : "CAR"}**.
   - ${isCamper ? "CRITICAL: You MUST ONLY suggest legal Campsites or RV Parks. ABSOLUTELY NO HOTELS." : "Ensure parking is available."}
2. **BUDGET CHECK:** User budget is **"${context.budget}"**.
   - Do not suggest luxury resorts if budget is 'low'. Do not suggest hostels if budget is 'high'.

# PHASE 2: SOURCING STRATEGY
Target Location: **"${context.search_hub}"**.
Context: ${context.location_reasoning}

**Your Selection Criteria:**
1. **Proximity:** The place must be logically close to the target hub to minimize driving.
2. **Social Proof:** Look for high rating counts (>100 reviews) to ensure reliability.
3. **Vibe:** Match the traveler group (e.g. playground for kids, quiet for couples).
4. **Pets:** ${context.travelers.pets ? "MUST allow pets (Dog friendly)." : "Pet policy is irrelevant."}

# PHASE 3: OUTPUT GENERATION
- Provide 2-3 top candidates.
- **Coordinates:** You MUST provide accurate Latitude/Longitude for the Map View.
- **Reasoning:** In 'location_match', explain specifically WHY this fits the strategy.`;

  const outputSchema = {
    "_thought_process": "String (Step 1: Analyze constraints. Step 2: Check proximity & ratings...)",
    "candidates": [
      {
        "name": "String (Official Name)",
        "address": "String (Full Address)",
        "location": {
            "lat": "Number (e.g. 48.1351)",
            "lng": "Number (e.g. 11.5820)"
        },
        "location_match": "String (Strategic reasoning: Why here?)",
        "description": "String (Facilities & Vibe, max 2 sentences)",
        "price_estimate": "String (e.g. '€€' or 'approx 50€/night')",
        "bookingUrl": "String | null",
        "pros": ["String (Highlight 1)", "String (Highlight 2)"],
        "rating": "Number (4.0 - 5.0)",
        "user_ratings_total": "Number (Count of reviews, e.g. 1250)" 
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "LOGISTICS DATA")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['research']) // FIX: 'safety' -> 'research'
    .build();
};
// --- END OF FILE 87 Zeilen ---