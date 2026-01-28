// 29.01.2026 18:05 - FEAT: Created HotelScout Preparer (Logistics Handover).
// src/core/prompts/preparers/prepareHotelScoutPayload.ts

import type { TripProject } from '../../types';

export const prepareHotelScoutPayload = (
  project: TripProject, 
  feedback?: string
) => {
  const { userInputs, analysis } = project;
  
  // 1. DETERMINE SEARCH HUB (The "Golden Location")
  // Priority A: Result from GeoAnalyst (The Strategy)
  const geoRecommendation = analysis.geoAnalyst?.recommended_hubs?.[0];
  
  // Priority B: User Input (Fallback)
  const userDestination = userInputs.logistics.stationary.destination || 
                          userInputs.logistics.roundtrip.stops?.[0]?.location || 
                          "Destination";

  // LOGIC: Use the specific recommended district if available, otherwise city level.
  const searchLocation = geoRecommendation ? geoRecommendation.hub_name : userDestination;
  const locationReasoning = geoRecommendation ? `Strategic Recommendation: ${geoRecommendation.suitable_for}` : "User Preference";

  // 2. DATES
  const checkIn = userInputs.dates.start;
  const checkOut = userInputs.dates.end; // Simplified for stationary. For roundtrip, orchestrator needs loop logic.

  return {
    context: {
      location_name: searchLocation,
      location_reasoning: locationReasoning,
      check_in: checkIn,
      check_out: checkOut,
      travelers: userInputs.travelers,
      budget: userInputs.budget,
      logistics_type: userInputs.logistics.arrival.type || 'flight' // car vs flight
    },
    instructions: {
      role: "You are the Logistics Optimizer. Find hotels strictly in the defined area."
    }
  };
};
// --- END OF FILE 42 Zeilen ---