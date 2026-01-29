// 31.01.2026 20:30 - FIX: Added 'mobil' mode support (Camper Roundtrip).
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

  // 1. DETERMINE SEARCH TARGET (Roundtrip OR Mobil/Camper)
  // FIX: Treat 'mobil' as a roundtrip if stops are defined
  const isRoundtripMode = logistics.mode === 'roundtrip' || logistics.mode === 'mobil';

  if (isRoundtripMode) {
      const stops = logistics.roundtrip?.stops || [];
      const stopIndex = chunkIndex - 1; // 1-based to 0-based
      
      if (stops[stopIndex]) {
          searchLocation = stops[stopIndex].location;
          locationReasoning = `Stop ${chunkIndex} of Roundtrip: ${searchLocation}`;
          if (stops[stopIndex].duration) {
              stayDuration = `${stops[stopIndex].duration} nights`;
          }
      } else {
          // Fallback if index out of bounds (Safety)
          searchLocation = stops[0]?.location || (logistics.roundtrip?.startLocation ?? "Unknown Stop");
          locationReasoning = "Fallback Stop (Index Error)";
      }

      // GEO-ANALYST OVERRIDE (Granularity)
      if (analysis.geoAnalyst?.recommended_hubs) {
          // Try to find a hub recommendation that matches the current stop city
          const refinedHub = analysis.geoAnalyst.recommended_hubs.find((h: any) => 
              h.hub_name.toLowerCase().includes(searchLocation.toLowerCase())
          );
          if (refinedHub) {
              searchLocation = refinedHub.hub_name; 
              locationReasoning += ` (Refined by Strategist: ${refinedHub.suitable_for})`;
          }
      }

  } else {
      // STATIONARY LOGIC
      const geoRecommendation = analysis.geoAnalyst?.recommended_hubs?.[0];
      searchLocation = geoRecommendation ? geoRecommendation.hub_name : (logistics.stationary.destination || "Destination");
      locationReasoning = geoRecommendation ? `Strategic Base: ${geoRecommendation.suitable_for}` : "User Preference";
      stayDuration = `${dates.duration} nights`;
  }

  // 2. LOGISTICS MODE (Camper Check!)
  // Wir prüfen hier explizit auf 'camper', 'rv', 'mobil' oder ob der Modus selbst 'mobil' ist
  const arrivalType = dates.arrival?.type || 'car';
  const isCamper = arrivalType.toLowerCase().includes('camper') || logistics.mode === 'mobil';

  return {
    context: {
      search_hub: searchLocation,
      location_reasoning: locationReasoning,
      stay_duration: stayDuration,
      travelers: travelers,
      budget: budget,
      logistics_type: isCamper ? 'camper' : 'car', // Explicitly set camper type
      is_roundtrip: isRoundtripMode
    },
    instructions: {
      role: "Logistics Optimizer"
    }
  };
};
// Lines: 75