// 10.02.2026 18:45 - FIX: Final "Zero Hallucination" Doctrine. Strict Geo-Fencing & Schema Fix.
// 10.02.2026 17:45 - FIX: Final Template Logic. Dynamic Guides & Strict Geo-Fencing.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildFoodScoutPrompt = (project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  // DEFENSIVE GUARD: Ensure context exists
  const safeContext = context || {};
  
  // Prioritize the specific town from the list if available (Sequential Loop Mode)
  let searchArea = "the region";
  let targetCity = "";
  
  if (safeContext.town_list && Array.isArray(safeContext.town_list) && safeContext.town_list.length > 0) {
      targetCity = safeContext.town_list[0];
      // Search context includes country to prevent ambiguous matches (e.g. "Paris, Texas")
      searchArea = `${targetCity}, ${safeContext.country || ''}`;
  } else if (safeContext.location_name) {
      targetCity = safeContext.location_name.split(',')[0]; 
      searchArea = safeContext.location_name;
  } else if (safeContext.destination) {
      targetCity = safeContext.destination;
      searchArea = safeContext.destination;
  }

  // Use Dynamic Guides from Context (SSOT) or fallback to generic major ones
  const validGuides = safeContext.guides || ["Michelin", "Gault&Millau", "Feinschmecker", "Varta Führer", "Slow Food", "Falstaff"];

  builder.withOS();

  builder.withRole(`
    You are the 'Gourmet Scout' with DIRECT INTERNET ACCESS.
    Your mission is to find the best dining spots in ${searchArea}.
    
    ### PRIME DIRECTIVE (READ CAREFULLY):
    It is **FAR WORSE** to hallucinate a restaurant that doesn't exist (or is permanently closed) than to overlook a good one.
    **Zero Results is an acceptable and expected outcome** for small towns.
    
    You must execute a TWO-STAGE PROCESS:
    1. SEARCH BROADLY to find candidates.
    2. VERIFY STRICTLY against the target location and prestigious guides (${validGuides.join(', ')}).
  `);

  builder.withContext({
    searchArea: searchArea,
    targetCity: targetCity,
    validGuides: validGuides,
    excluded: ["Fast Food", "Large Chains", "Tourist Traps", "Closed Places"],
  });

  builder.withInstruction(`
    EXECUTE THE FOLLOWING STEPS SEQUENTIALLY:

    ### STEP 1: DISCOVERY (Broad Search)
    Search for "Best restaurants in ${searchArea}" and "Restaurants in ${searchArea} recommended".
    Generate a list of potential candidates.

    ### STEP 2: VERIFICATION & FILTERING (The Audit)
    For EACH candidate from Step 1, perform a specific check:
    
    A. **LOCATION CHECK (The "Zip Code Guard"):**
       Check the real address found in the search result. 
       Is it physically in **${targetCity}** or immediate surroundings (< 5km)?
       - IF NO (e.g. restaurant is in Munich, Berlin, or >10km away): **DISCARD IMMEDIATELY.**
       - IF YES: Proceed to B.

    B. **GUIDE CROSS-REFERENCE:**
       Search if the restaurant is mentioned in: ${validGuides.join(', ')}.
       - IF YES: Keep it. Add the guide name to 'awards' list.
       - IF NO: Check Google Rating. 
         - Rating > 4.6? -> Keep it (Local Gem).
         - Rating < 4.6? -> DISCARD.

    C. **STATUS CHECK:**
       Is it 'Permanently Closed'? -> DISCARD.

    ### STEP 3: OUTPUT GENERATION
    Return ONLY the candidates that survived ALL checks in Step 2.
    - 'awards': Must be an ARRAY of strings (e.g. ["Michelin Bib Gourmand", "Slow Food"]).
    - 'verification_status': Set to "verified".
    - 'liveStatus': Create a status object based on your findings to prevent re-checking.

    **FINAL WARNING:** If no restaurant survives the audit in ${targetCity}, return an EMPTY list ([]). DO NOT invent entries to fill the list.
  `);

  builder.withOutputSchema({
    candidates: [
      {
        name: "Restaurant Name",
        cuisine: "Regional / Modern / ...",
        awards: ["Michelin 1 Star", "Gault&Millau 16 Pkt"], 
        rating: 4.8,
        user_ratings_total: 150,
        reason: "Innovative tasting menu...",
        verification_status: "verified",
        liveStatus: {
            status: "open",
            operational: true,
            lastChecked: "2026-02-10T12:00:00.000Z",
            rating: 4.8,
            note: "Confirmed via Google Search"
        }
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 110 Zeilen ---