// 13.02.2026 18:00 - FIX: ULTIMATE HYBRID PROMPT.
// - Logic: Merges "Anti-Undefined Shield" with "Self-Claim Protocol".
// - Logic: Adds German keywords "Eintrag" & "Tipp" for Varta/Slow Food detection.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildFoodScoutPrompt = (_project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  const safeContext = context || {};
  let searchArea = "the region";
  let targetCity = "";
  
  // 1. POSITIONING
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

  // 2. ROBUST GUIDE EXTRACTION (The "Anti-Undefined Shield")
  let guideNames: string[] = [];
  const defaultGuides = ["Michelin", "Gault&Millau", "Varta", "Feinschmecker", "Slow Food", "Gusto"];

  if (safeContext.guides && Array.isArray(safeContext.guides)) {
      guideNames = safeContext.guides
          .map((g: any) => {
              // Handle both string and object inputs safely
              if (typeof g === 'string') return g;
              return g?.name; 
          })
          // STRICT FILTER: Removes null, undefined, AND the string "undefined"
          .filter((name: any) => name && typeof name === 'string' && name !== "undefined");
  }

  // Fallback if list is empty after filtering
  if (guideNames.length === 0) {
      guideNames = defaultGuides;
  }

  // 3. BROAD QUERY BUILDING (User Optimization)
  const guideOrString = guideNames.map(n => `"${n}"`).join(' OR ');
  
  // Added "Eintrag" and "Tipp" for better German results (Varta/Presse)
  const humanQuery = `"${targetCity}" Restaurant (${guideOrString}) (Guide OR Empfehlung OR Eintrag OR listed OR Tipp)`;
  
  // Secondary Query for "Heuristic Check"
  const secondaryQuery = `Beste Restaurants ${targetCity} Reviews`;

  builder.withOS();

  builder.withRole(`
    You are a DATA EXTRACTION BOT for high-quality gastronomy.
    Target: Extract ALL restaurants in **${targetCity}** mentioned in these Guides: **${guideNames.join(', ')}**.
    
    ### CRITICAL EXTRACTION RULES:
    1. **NO JUDGMENT:** You are not a critic. Do not filter by "premium" feel.
    2. **EQUAL TRIGGERS:** Treat 'Mentioned', 'Recommended', 'Listed', 'Tipp', 'Schnecke', 'Eintrag' and 'Awarded' as EQUAL triggers for a HIT.
    3. **WIRTSHAUS-SUPPORT:** Traditional restaurants (Brauhäuser, Hotel-Restaurants) are often listed in Varta or Slow Food. If they are mentioned, they MUST be included.
    4. **SELF-CLAIM RULE:** If a restaurant claims on its OWN website snippet that it is listed (e.g. "Varta-Tipp"), **YOU MUST ACCEPT IT**.
  `);

  builder.withContext({
    searchArea: searchArea,
    targetCity: targetCity,
    searchQuery: humanQuery, 
    activeGuides: guideNames,
    excluded: ["Closed Places", "Fast Food Chains"], 
  });

  builder.withInstruction(`
    EXECUTE SEQUENTIALLY:

    ### STEP 1: KEYWORD MATCHING
    Execute: **${humanQuery}**
    
    Scan results for: [Restaurant Name] + [Guide Name].
    Capture EVERY match.
    
    Examples of VALID HITS:
    - "Marthabräu (Varta-Tipp)..." -> HIT
    - "Slow Food recommends Klosterstüberl..." -> HIT
    - "Hotel Post listed in..." -> HIT

    ### STEP 2: HEURISTIC CHECK (Safety Net)
    If you found fewer than 3 restaurants in Step 1, perform a specific check:
    - Search: **${secondaryQuery}**
    - Check the top results: Do they mention any of the guides (${guideNames.join(', ')}) in their snippets?
    - If yes, ADD THEM.

    ### STEP 3: NORMALIZATION
    For each HIT:
    1. Extract official Name.
    2. List ALL matching guides in the 'awards' array.
    3. Verify 'open' status via quick check.

    ### STEP 4: OUTPUT
    Return the verified candidates as JSON.
  `);

  builder.withOutputSchema({
    candidates: [
      {
        name: "Restaurant Name",
        address: "Address", 
        phone: "...", 
        website: "...", 
        cuisine: "...",
        awards: ["Varta-Tipp", "Slow Food"], 
        rating: 4.5, 
        user_ratings_total: 100, 
        verification_status: "verified",
        liveStatus: {
            status: "open",
            operational: true,
            lastChecked: "2026-02-12T12:00:00.000Z",
            rating: 4.5,
            note: "Found via Data Extraction"
        }
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 130 Zeilen ---