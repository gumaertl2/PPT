// 13.02.2026 15:30 - FIX: COMPLETENESS GUARANTEE (NO CURATION).
// - Logic: Explicitly forbids the AI from "selecting the best" candidates.
// - Logic: Forces output of ALL found matches from Step 1 & 2.
// - Logic: Maintains the successful "Elite Mining" & "District Shield" strategies.

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
      searchArea = safeContext.target_country ? `${targetCity}, ${safeContext.target_country}` : targetCity;
  } else if (safeContext.location_name) {
      targetCity = safeContext.location_name.split(',')[0]; 
      searchArea = safeContext.location_name;
  }

  // 2. ROBUST GUIDE EXTRACTION
  let guideNames: string[] = [];
  const defaultGuides = ["Michelin", "Gault&Millau", "Varta Führer", "Feinschmecker", "Slow Food", "Gusto"];

  if (safeContext.guides && Array.isArray(safeContext.guides)) {
      guideNames = safeContext.guides
          .map((g: any) => (typeof g === 'string' ? g : g?.name))
          .filter((name: any) => name && typeof name === 'string' && name !== "undefined");
  }

  if (guideNames.length === 0) {
      guideNames = defaultGuides;
  }

  // 3. BROAD QUERY BUILDING
  const guideOrString = guideNames.map(n => `"${n}"`).join(' OR ');
  const humanQuery = `"${targetCity}" Restaurant (${guideOrString}) (Guide OR Empfehlung OR Eintrag OR listed OR Tipp OR Auszeichnung)`;

  builder.withOS();

  builder.withRole(`
    You are a high-precision DATA EXTRACTION BOT for premium gastronomy.
    Target: Find ALL restaurants in **${targetCity}** (including its sub-districts/Ortsteile) mentioned in: **${guideNames.join(', ')}**.
    
    ### CRITICAL RULES:
    1. **NO CURATION:** You are a collector, NOT an editor. If you find 10 restaurants, output 10. Do NOT select "the best".
    2. **DISTRICT SHIELD:** Recognize districts (e.g. Rottbach, Aich) as part of the search.
    3. **SELF-CLAIM RULE:** If a restaurant claims a listing on its OWN website snippet, accept it.
    4. **KEYWORD TRIGGER:** Treat 'Tipp', 'Schnecke', 'Eintrag', and 'Award' as equal triggers.
  `);

  builder.withContext({
    searchArea: searchArea,
    targetCity: targetCity,
    searchQuery: humanQuery, 
    activeGuides: guideNames,
    excluded: ["Closed Places", "McDonalds", "Burger King"], 
  });

  builder.withInstruction(`
    EXECUTE THE FOLLOWING STEPS:

    ### STEP 1: INITIAL DATA MINING
    Execute search: **${humanQuery}**
    Identify ALL names linked to guides.
    *Crucial: If you see "Gasthof Heinzinger" or "Hotel Post" without clear guide-assignment in the snippet, DO NOT discard.*

    ### STEP 2: FORCED VERIFICATION (The "Ehrenrunde")
    For ANY prominent local restaurant found in Step 1 that lacks a specific guide name in its snippet:
    - Search: "Restaurant [Name] ${targetCity} Michelin Varta Feinschmecker Slow Food"
    - If this targeted query confirms a listing/tipp, ADD it to the candidates.

    ### STEP 3: NORMALIZATION
    For each HIT:
    1. Extract official Name, Address, Website.
    2. Populate 'awards' array.
    3. Determine 'open' status.

    ### STEP 4: OUTPUT (THE "NO-DELETE" PHASE)
    Generate final JSON matching the schema.
    
    **OUTPUT RULE:** Return **ALL** verified candidates found in Step 1 and Step 2. 
    - Do NOT filter by personal preference or rating. 
    - Do NOT limit the list to "Top 3".
    - Every restaurant with a guide mention MUST be included in the JSON. 
    - Skipping verified data is a CRITICAL SYSTEM ERROR.
  `);

  builder.withOutputSchema({
    candidates: [
      {
        name: "Restaurant Name",
        address: "Street, Zip City",
        phone: "+49...",
        website: "https://...",
        cuisine: "...",
        awards: ["Guide A", "Guide B"],
        rating: 4.5,
        user_ratings_total: 100,
        verification_status: "verified",
        liveStatus: {
            status: "open",
            operational: true,
            lastChecked: "2026-02-12T13:25:00.000Z",
            rating: 4.5,
            note: "Verified via multi-stage extraction protocol"
        }
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 125 Zeilen ---