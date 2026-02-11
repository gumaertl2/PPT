// 10.02.2026 22:45 - RESTORED ORIGINAL LOGIC (Dynamic Guides).
// 12.02.2026 19:00 - FIX: Technical Fix only (Ratings Output). No Logic Changes.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildFoodScoutPrompt = (_project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  // DEFENSIVE GUARD
  const safeContext = context || {};
  
  // LOGIC: Search Area & Target City
  let searchArea = "the region";
  let targetCity = "";
  
  if (safeContext.town_list && Array.isArray(safeContext.town_list) && safeContext.town_list.length > 0) {
      targetCity = safeContext.town_list[0];
      
      // 1. Try explicit location_name
      if (safeContext.location_name && safeContext.location_name.includes(targetCity)) {
          searchArea = safeContext.location_name;
      } 
      // 2. Try target_country
      else if (safeContext.target_country) {
          searchArea = `${targetCity}, ${safeContext.target_country}`;
      }
      // 3. Fallback to project country
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

  // SSOT Guides (Loaded from Country File via Orchestrator)
  // NOW this receives "Yamu.lk, Pulse.lk" instead of "[object Object]"
  const validGuides = safeContext.guides || ["Michelin", "Gault&Millau", "Feinschmecker", "Varta Führer", "Slow Food", "Falstaff"];

  builder.withOS();

  builder.withRole(`
    You are the 'Gourmet Scout' (Hard Fact Collector).
    Your mission is to find the best dining spots in **${searchArea}**.
    
    ### PRIME DIRECTIVE:
    1. **FIND** valid candidates in **${targetCity}** AND its districts (e.g. Rottbach, Gernlinden, Überacker).
    2. **EXTRACT** Hard Facts (Address, Phone, Website, Status, Ratings).
    3. **VERIFY** location strictly (< 8km radius).
    
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
       - **Rating:** Google Rating & Count.
       - **Status:** Check if Open/Closed.

    B. **LOCATION CHECK (The "Zip Code Guard"):**
       Is the address physically in **${targetCity}** or immediate surroundings (< 8km)?
       - NOTE: Includes districts like Rottbach.
       - IF NO: **DISCARD IMMEDIATELY.**

    C. **GUIDE & RATING CHECK:**
       - Is it in: ${validGuides.join(', ')}? -> KEEP.
       - OR: Is Google Rating > 4.5? -> KEEP.
       - Else -> DISCARD.

    ### STEP 2: OUTPUT GENERATION
    Return ONLY the candidates that survived.
    **CRITICAL:** It is perfectly fine to return NO candidates. Better 0 results than bad results.
    
    - 'awards': Must be an ARRAY of strings.
    - 'liveStatus': Fill based on your findings.
    - 'rating': Google Rating (Number).
    - 'user_ratings_total': Review Count (Number).
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
        rating: 4.8, // Added to ensure Pass-Through
        user_ratings_total: 150, // Added to ensure Pass-Through
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
// --- END OF FILE 126 Zeilen ---