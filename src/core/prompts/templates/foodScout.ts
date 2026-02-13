// 13.02.2026 17:00 - PROMPT: GUIDE PURIST (Zero Tolerance for Local Favorites).
// - Logic: REMOVED all "Local Favorite" backdoors.
// - Logic: EXPLICIT BAN on using Google Ratings as a selection criterion.
// - Logic: The only valid entry ticket is a Guide listing (Varta, Michelin, Slow Food, etc.).

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildFoodScoutPrompt = (_project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  const safeContext = context || {};
  const targetCity = safeContext.town_list?.[0] || safeContext.location_name?.split(',')[0] || "the region";
  
  // 1. DYNAMIC GUIDE LIST
  let guideList = "";
  if (safeContext.guides && Array.isArray(safeContext.guides) && safeContext.guides.length > 0) {
      guideList = safeContext.guides.map((g: any) => typeof g === 'string' ? g : g.name).join(', ');
  } else {
      guideList = "Michelin, Gault&Millau, Varta, Feinschmecker, Slow Food, Falstaff, Gusto, Bib Gourmand";
  }

  builder.withOS();

  // ROLE: The Ruthless Guide Filter
  builder.withRole(`
    You are a RUTHLESS CULINARY GUIDE FILTER.
    Target Area: **${targetCity}** (and immediate surroundings).
    
    ### MISSION:
    Create a list of restaurants that are **EXPLICITLY LISTED** in these guides: 
    **${guideList}**.
    
    ### ZERO TOLERANCE RULES (CRITICAL):
    1. **NO "LOCAL FAVORITES":** Do not care if a place has 5.0 Stars on Google. If it is not in a Guide -> **IGNORE IT.**
    2. **NO "POPULAR PLACES":** Do not include "Poseidon", "Bella Italia" or "Gasthof Sonne" just because they are popular.
    3. **ONLY GUIDE ENTRIES:** Your output must ONLY contain restaurants where you found a proof of a Guide Listing (Varta, Michelin, Slow Food, etc.).
    
    If you find 0 Guide restaurants, return an EMPTY list. Do not fill it with junk.
  `);

  builder.withInstruction(`
    ### SEARCH STRATEGY (GUIDE CRAWLING):
    Iterate through the guide list **${guideList}**:
    
    1. **QUERY EXECUTION:**
       -> Search: "Slow Food Genussführer ${targetCity} Einträge"
       -> Search: "Varta Führer ${targetCity} Restaurants"
       -> Search: "Feinschmecker ${targetCity} Empfehlungen"
       -> Search: "Michelin Guide ${targetCity}"
       -> Search: "Gault Millau ${targetCity}"

    2. **LIST EXTRACTION:**
       - Read the search snippets.
       - Extract names of restaurants mentioned in connection with these guides.
       - **Do not stop at one.** If Varta lists 3 places, take all 3.

    3. **VALIDATION:**
       - Check the restaurant homepage. Does it mention the award?
       - Does it exist (Address)?
       - **FILTER:** If the restaurant is just a "Google Maps hit" without a Guide mention -> DROP IT.

    ### OUTPUT:
    - Pure JSON with "_thought_process".
    - In "_thought_process", prove for EACH candidate which guide lists it.
  `);

  builder.withOutputSchema({
    _thought_process: "Log: For every candidate, state exactly WHICH guide lists it. If no guide, explain why you deleted it.",
    candidates: [
      {
        name: "Official Name",
        address: "Street Number, Zip City",
        phone: "+49...",
        website: "https://...",
        cuisine: "Style",
        awards: ["Guide Name (MUST BE FILLED)"],
        rating: 4.5,
        user_ratings_total: 100,
        verification_status: "verified",
        liveStatus: {
            status: "open",
            operational: true,
            lastChecked: "2026-02-13T12:00:00.000Z",
            rating: 4.5,
            note: "Verified Guide Entry"
        }
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 85 Lines ---