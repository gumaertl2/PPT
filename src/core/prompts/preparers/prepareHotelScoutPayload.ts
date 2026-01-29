// 31.01.2026 17:30 - FEAT: Roundtrip Logic & Camper Detection (Fixed).
// src/core/prompts/preparers/prepareHotelScoutPayload.ts

import type { TripProject } from '../../types';

export const prepareHotelScoutPayload = (
  project: TripProject, 
  chunkIndex: number = 1
) => {
  const { userInputs, analysis } = project;
  const { logistics, dates, travelers, budget } = userInputs;
  
  let searchLocation = "";
  let locationReasoning = "";
  let stayDuration = "2-3 nights"; 

  // 1. DETERMINE SEARCH TARGET (Roundtrip vs. Stationary)
  if (logistics.mode === 'roundtrip') {
      const stops = logistics.roundtrip.stops || [];
      const stopIndex = chunkIndex - 1; // 1-based to 0-based
      
      if (stops[stopIndex]) {
          searchLocation = stops[stopIndex].location;
          locationReasoning = `Stop ${chunkIndex} of Roundtrip: ${searchLocation}`;
          if (stops[stopIndex].duration) {
              stayDuration = `${stops[stopIndex].duration} nights`;
          }
      } else {
          searchLocation = stops[0]?.location || "Unknown Stop";
          locationReasoning = "Fallback Stop";
      }

      // Geo-Analyst Refinement (z.B. Stadtteil)
      if (analysis.geoAnalyst?.recommended_hubs) {
          const refinedHub = analysis.geoAnalyst.recommended_hubs.find((h: any) => 
              h.hub_name.toLowerCase().includes(searchLocation.toLowerCase())
          );
          if (refinedHub) {
              searchLocation = refinedHub.hub_name; 
              locationReasoning += ` (Refined: ${refinedHub.suitable_for})`;
          }
      }

  } else {
      // STATIONARY
      const geoRecommendation = analysis.geoAnalyst?.recommended_hubs?.[0];
      searchLocation = geoRecommendation ? geoRecommendation.hub_name : (logistics.stationary.destination || "Destination");
      locationReasoning = geoRecommendation ? `Strategic Base: ${geoRecommendation.suitable_for}` : "User Preference";
      stayDuration = `${dates.duration} nights`;
  }

  // 2. LOGISTICS MODE (Camper Check!)
  // Wir prüfen hier explizit auf 'camper', 'rv' oder 'mobil' im Arrival-Type
  const arrivalType = dates.arrival?.type || 'car';
  
  return {
    context: {
      search_hub: searchLocation,
      location_reasoning: locationReasoning,
      stay_duration: stayDuration,
      travelers: travelers,
      budget: budget,
      logistics_type: arrivalType,
      is_roundtrip: logistics.mode === 'roundtrip'
    },
    instructions: {
      role: "Logistics Optimizer"
    }
  };
};
// --- END OF FILE 68 Zeilen ---