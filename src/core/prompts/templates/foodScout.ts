// 10.02.2026 22:45 - FIX: CONTEXT PRIORITY & SEARCH QUERY.
// - Fix: Prioritize 'target_country' (AdHoc) over 'country' (Project).
// - Fix: Search Query includes "surroundings" to find districts (Rottbach).
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildFoodScoutPrompt = (project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  // DEFENSIVE GUARD: Ensure context exists
  const safeContext = context || {};
  
  // Prioritize the specific town from the list if available
  let searchArea = "the region";
  let targetCity = "";
  
  // LOGIC FIX: Handle AdHoc Country correctly inside town_list loop
  if (safeContext.town_list && Array.isArray(safeContext.town_list) && safeContext.town_list.length > 0) {
      targetCity = safeContext.town_list[0];
      
      // 1. Try explicit location_name (e.g. "Maisach, Deutschland")
      if (safeContext.location_name && safeContext.location_name.includes(targetCity)) {
          searchArea = safeContext.location_name;
      } 
      // 2. Try target_country (from AdHoc Modal -> "Deutschland")
      else if (safeContext.target_country) {
          searchArea = `${targetCity}, ${safeContext.target_country}`;
      }
      // 3. Fallback to project country, but avoid "Europe"
      else {
          const country = safeContext.country || '';
          if (country === 'Europe' || country === 'Europa') {
             searchArea = `${targetCity} and surroundings`;
          } else {
             searchArea = `${targetCity}, ${country}`;
          }
      }

  } else if (safeContext.location_name) {
      targetCity = safeContext.location_name.split(',')[0]; 
      searchArea = safeContext.location_name;
  } else if (safeContext.destination) {
      targetCity = safeContext.destination;
      searchArea = safeContext.destination;
  }

  // SSOT Guides
  const validGuides = safeContext.guides || ["Michelin", "Gault&Millau", "Feinschmecker", "Varta Führer", "Slow Food", "Falstaff"];

  builder.withOS();

  builder.withRole(`
    You are the 'Gourmet Scout' (Hard Fact Collector).
    Your mission is to find the best dining spots in **${searchArea}**.
    
    ### PRIME DIRECTIVE:
    1. **FIND** valid candidates in **${targetCity}** AND its districts (e.g. Rottbach, Gernlinden, Überacker).
    2. **EXTRACT** Hard Facts (Address, Phone, Website, Status).
    3. **VERIFY** location strictly (< 6km radius).
    
    **NO FLUFF:** Do not write long marketing descriptions. Focus on data accuracy.
  `);

  builder.withContext({
    searchArea: searchArea,
    targetCity: targetCity,
    validGuides: validGuides,
    excluded: ["Fast Food", "Large Chains", "Tourist Traps", "Closed Places"],
  });

  builder.withInstruction(`
    EXECUTE THE FOLLOWING STEPS SEQUENTIALLY:

    ### STEP 1: DISCOVERY & DATA EXTRACTION
    Search for "Best restaurants in ${searchArea}" and "Gasthöfe in ${targetCity}".
    For each candidate found:
    
    A. **GET HARD FACTS:**
       - **Address:** Must be the real street address.
       - **Phone:** Official number (if visible).
       - **Website:** Official URL (if visible).
       - **Status:** Check if Open/Closed.

    B. **LOCATION CHECK (The "Zip Code Guard"):**
       Is the address physically in **${targetCity}** or immediate surroundings (< 6km)?
       - NOTE: Includes districts like Rottbach.
       - IF NO: **DISCARD IMMEDIATELY.**

    C. **GUIDE & RATING CHECK:**
       - Is it in: ${validGuides.join(', ')}? -> KEEP.
       - OR: Is Google Rating > 4.6? -> KEEP.
       - Else -> DISCARD.

    ### STEP 2: OUTPUT GENERATION
    Return ONLY the candidates that survived.
    - 'awards': Must be an ARRAY of strings.
    - 'liveStatus': Fill based on your findings.
    - **IMPORTANT:** Provide the address, phone, and website exactly as found.
  `);

  builder.withOutputSchema({
    candidates: [
      {
        name: "Restaurant Name",
        address: "Musterstraße 1, 80331 Stadt", // Hard Fact
        phone: "+49 89 123456", // Hard Fact
        website: "https://www.restaurant.com", // Hard Fact
        cuisine: "Regional / Modern / ...",
        awards: ["Michelin 1 Star", "Gault&Millau 16 Pkt"], 
        rating: 4.8,
        user_ratings_total: 150,
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
// --- END OF FILE 125 Zeilen ---