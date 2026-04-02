// 22.03.2026 10:00 - FIX: Removed erroneous 'mobil' check for 'isCamper'. Camper mode is now strictly determined by the chosen arrival or local mobility vehicle.
// 19.03.2026 16:30 - FEAT: Inject persona directive for scout.
// src/core/prompts/preparers/prepareHotelScoutPayload.ts

import type { TripProject } from '../../types';
import { buildPersonaDirective } from '../PersonaInjector';

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
  // FIX: Only check actual vehicle choices (arrival or localMobility), not the generic trip mode 'mobil'.
  const arrivalType = dates.arrival?.type || 'car';
  const localMobility = logistics.localMobility || 'car';
  const isCamper = arrivalType.toLowerCase().includes('camper') || localMobility.toLowerCase().includes('camper');

  return {
    context: {
      search_hub: searchLocation,
      location_reasoning: locationReasoning,
      stay_duration: stayDuration,
      travelers: travelers,
      budget: budget,
      logistics_type: isCamper ? 'camper' : 'car', 
      is_roundtrip: isRoundtripMode,
      persona_directive: buildPersonaDirective(project.userInputs, 'scout')
    },
    instructions: {
      role: "Logistics Optimizer"
    }
  };
};
// --- END OF FILE 76 Zeilen ---