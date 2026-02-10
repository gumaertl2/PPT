// 10.02.2026 14:40 - FIX: Runtime Error 'undefined context.candidates'. Aligned with Preparer output.
// 10.02.2026 14:10 - FIX: Renamed export to 'buildFoodScoutPrompt' to match PayloadBuilder import.
// 10.02.2026 13:30 - FIX: Live Research Mode. Added Guide Check & Live Ratings.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

// FIX: Export name changed from foodScoutTemplate to buildFoodScoutPrompt
export const buildFoodScoutPrompt = (project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  // FIX: Access the correct fields provided by prepareFoodScoutPayload
  // The Preparer sends: location_name (string), town_list (string[]), country (string)
  
  // Prioritize the specific town from the list if available (Sequential Loop Mode)
  let searchArea = "the region";
  
  if (context.town_list && context.town_list.length > 0) {
      searchArea = `${context.town_list[0]}, ${context.country || ''}`;
  } else if (context.location_name) {
      searchArea = context.location_name;
  } else if (context.destination) {
      searchArea = context.destination;
  }

  const validGuides = context.guides || ["Michelin", "Gault&Millau", "Feinschmecker", "Varta Führer"];

  builder.withOS();

  builder.withRole(`
    You are the 'Gourmet Scout' with DIRECT INTERNET ACCESS.
    Your job is to find the BEST culinary spots in ${searchArea} by searching the web in REAL-TIME.
    
    CRITICAL MISSION:
    1. Find restaurants that are currently OPEN and highly rated.
    2. VERIFY if they are listed in prestigious guides: ${validGuides.join(', ')}.
    3. REJECT any closed places or tourist traps.
  `);

  builder.withContext({
    searchArea: searchArea,
    validGuides: validGuides,
    excluded: ["Fast Food", "Large Chains", "Tourist Traps"],
  });

  builder.withInstruction(`
    PERFORM A LIVE GOOGLE SEARCH for "Best restaurants in ${searchArea} ${validGuides[0]}".
    
    FOR EACH CANDIDATE FOUND:
    1. **Name & Cuisine:** precise name and style.
    2. **Guide Check:** Is it mentioned in ${validGuides.join(' or ')}? 
       - If YES: Add the guide name to 'awards'.
       - If NO but rating > 4.5: Keep it but leave 'awards' empty.
       - If NO and rating < 4.5: DISCARD.
    3. **Live Status:** Check if it is marked as 'Permanently Closed'. If yes, DISCARD.
    4. **Rating:** Extract the Google Maps Rating (1.0-5.0).
    
    OUTPUT REQUIREMENTS:
    - Provide a curated list of 5-10 top candidates.
    - 'awards' MUST be a string like "Michelin Star", "Bib Gourmand", "Gault&Millau 15pts" or empty.
    - 'reason': Short text why this place is special.
  `);

  builder.withOutputSchema({
    candidates: [
      {
        name: "Restaurant Name",
        cuisine: "French / Nordic / ...",
        awards: "Michelin 1 Star (Optional)",
        rating: 4.8,
        reason: "Innovative tasting menu..."
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 68 Zeilen ---