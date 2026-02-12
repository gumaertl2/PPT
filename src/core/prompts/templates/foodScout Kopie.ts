// 13.02.2026 11:00 - FIX: DIRECT OBJECT USAGE (FINAL).
// - Logic: Uses 'context.guides' directly. Assumes Array structure from Orchestrator.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildFoodScoutPrompt = (_project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  const safeContext = context || {};
  let searchArea = "the region";
  let targetCity = "";
  
  if (safeContext.town_list && Array.isArray(safeContext.town_list) && safeContext.town_list.length > 0) {
      targetCity = safeContext.town_list[0];
      if (safeContext.target_country) {
          searchArea = `${targetCity}, ${safeContext.target_country}`;
      } else {
          searchArea = `${targetCity}`;
      }
  } else if (safeContext.location_name) {
      targetCity = safeContext.location_name.split(',')[0]; 
      searchArea = safeContext.location_name;
  }

  // 1. GET GUIDES DIRECTLY
  // The Orchestrator passes 'guides' as a raw array. No JSON stringify/parse needed.
  let guideDefinitions: any[] = [];
  
  if (safeContext.guides && Array.isArray(safeContext.guides)) {
      guideDefinitions = safeContext.guides;
  } else {
      // Fallback only if Orchestrator fails
      guideDefinitions = [
        { name: "Michelin", searchUrl: "" }, 
        { name: "Varta", searchUrl: "" }
      ];
  }

  // 2. BUILD QUERIES
  const siteQueries = guideDefinitions
    .filter(g => g.searchUrl && g.searchUrl.includes('http'))
    .map(g => {
        try {
            const url = new URL(g.searchUrl);
            const domain = url.hostname.replace('www.', '');
            const terms = g.searchTerms && g.searchTerms.length > 0 
                ? `(${g.searchTerms.map((t: string) => `"${t}"`).join(' OR ')})` 
                : "";
            
            return `site:${domain} "${targetCity}" ${terms}`;
        } catch (e) {
            return null;
        }
    })
    .filter(Boolean);

  const combinedSiteQuery = siteQueries.length > 0 
      ? siteQueries.join(' OR ') 
      : `Restaurant Guide ${targetCity}`; 

  builder.withOS();

  builder.withRole(`
    You are the 'Gourmet Scout' using an INVERTED SEARCH STRATEGY.
    Target: Find restaurants in **${targetCity}** that are listed in specific Guides.
    
    ### STRATEGY:
    Do NOT search for generic "Best restaurants".
    Search INSIDE the guide websites using the provided specific queries.
    
    **PRIME DIRECTIVE:**
    1. Only accept restaurants appearing on the Guide Websites (Michelin, Varta, etc.) for **${targetCity}**.
    2. **Ignore Google Ratings for these winners** (The Guide Entry is the validation).
    3. Take ONLY the top 3 results per Guide Query to ensure they are local.
    4. Verify they are open.
  `);

  builder.withContext({
    searchArea: searchArea,
    targetCity: targetCity,
    guideQueries: combinedSiteQuery,
    // LOGGING: Shows the active guides in Flight Recorder
    active_guide_config: guideDefinitions, 
    excluded: ["Fast Food", "Large Chains", "Tourist Traps", "Closed Places"],
  });

  builder.withInstruction(`
    EXECUTE THE FOLLOWING STEPS SEQUENTIALLY:

    ### STEP 1: GUIDE INDEX SEARCH (The "Laser" Scan)
    Execute this exact search query:
    **${combinedSiteQuery}**
    
    Scan the results. Any restaurant mentioned in these snippets is automatically a candidate.
    
    ### STEP 2: VERIFICATION
    For each candidate found in Step 1:
    1. **GET DETAILS:** Run a quick check ("Restaurant [Name] ${targetCity} official site") to get address/phone.
    2. **CHECK STATUS:** Is it Open?
    3. **RATING:** Get Google Rating (just for info).

    ### STEP 3: OUTPUT
    Return ONLY the candidates found in Step 1.
    **If no candidates were found in the guides, return an empty list [].**
    DO NOT search for generic "Best Restaurants" as a fallback.
    
    - 'awards': Array of strings. MUST contain the Guide Name and the Award if found (e.g. "Varta-Tipp", "Bib Gourmand").
    - 'rating': Numeric.
    - 'user_ratings_total': Number.
    - 'liveStatus': Fill based on findings.
  `);

  builder.withOutputSchema({
    candidates: [
      {
        name: "Restaurant Name",
        address: "Musterstraße 1, 80331 Stadt", 
        phone: "+49 89 123456", 
        website: "https://www.restaurant.com", 
        cuisine: "Regional / Modern / ...",
        awards: ["Varta-Tipp", "Bib Gourmand"], 
        rating: 4.5, 
        user_ratings_total: 150, 
        verification_status: "verified",
        liveStatus: {
            status: "open",
            operational: true,
            lastChecked: "2026-02-12T10:00:00.000Z",
            rating: 4.5,
            note: "Found via Guide Search"
        }
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 125 Zeilen ---