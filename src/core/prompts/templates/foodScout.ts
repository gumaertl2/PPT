// 13.02.2026 15:30 - FIX: SLOW FOOD MISSING.
// - Logic: Fixed hardcoded search examples that excluded Slow Food.
// - Logic: Now dynamically instructs the AI to search for EVERY guide in the provided list.
// - Logic: Specific handling for "Genussführer" mapping.

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildFoodScoutPrompt = (_project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  const safeContext = context || {};
  const targetCity = safeContext.town_list?.[0] || safeContext.location_name?.split(',')[0] || "the region";
  
  // GUIDE INJECTION
  let guideList = "";
  if (safeContext.guides && Array.isArray(safeContext.guides) && safeContext.guides.length > 0) {
      guideList = safeContext.guides.map((g: any) => typeof g === 'string' ? g : g.name).join(', ');
  } else {
      // Robust Fallback containing Slow Food
      guideList = "Michelin, Gault&Millau, Varta, Feinschmecker, Slow Food (Genussführer), Falstaff, Gusto, Schlemmer Atlas, Bib Gourmand";
  }

  builder.withOS();

  // ROLE: The Investigative Scout
  builder.withRole(`
    You are an INVESTIGATIVE CULINARY SCOUT.
    Target Area: **${targetCity}** (and immediate surroundings).
    
    ### MISSION:
    Find all restaurants listed in these specific guides: **${guideList}**.
    
    ### THE "TRUST" RULE:
    - If a restaurant claims on its **own website** to be in the Varta Guide, Slow Food, etc. -> **BELIEVE IT AND ADD IT.**
    - You do not need a third-party confirmation if the restaurant claims it.
  `);

  builder.withInstruction(`
    ### SEARCH STRATEGY (MANDATORY STEPS):
    1. **INDIVIDUAL GUIDE CHECKS:** You must perform a specific Google Search for EACH guide in your list + the city.
       -> Execute: "Slow Food Genussführer ${targetCity}" (CRITICAL for Klosterstüberl etc.)
       -> Execute: "Varta Guide ${targetCity}"
       -> Execute: "Feinschmecker ${targetCity}"
       -> Execute: "Michelin ${targetCity}"
       -> ...and so on for the rest of **${guideList}**.
    
    2. **BADGE HUNTING:** Look for keywords like "Auszeichnung", "Empfohlen von", "Schnecke" (Slow Food Symbol), "Diamant" (Varta).
    
    3. **HOMEPAGE VERIFICATION:** Check the search snippets of the restaurant's homepage. If they mention a guide -> ADD.

    ### INCLUSION CRITERIA:
    - **Strict:** Must exist (Address verified).
    - **Loose:** Any connection to a guide is enough. Old listing? Okay. Mentioned in "Tipps"? Okay.
    - **Local Favorites:** Only include non-guide places if they are "Wirtshaus" style with >4.6 stars.

    ### OUTPUT:
    - Pure JSON with "_thought_process".
  `);

  builder.withOutputSchema({
    _thought_process: "Log: EXACTLY which search queries did you run? Did you search for 'Slow Food' specifically?",
    candidates: [
      {
        name: "Official Name",
        address: "Street Number, Zip City",
        phone: "+49...",
        website: "https://...",
        cuisine: "Style",
        awards: ["Guide Name (e.g. Slow Food Genussführer, Varta)"],
        rating: 4.5,
        user_ratings_total: 100,
        verification_status: "verified",
        liveStatus: {
            status: "open",
            operational: true,
            lastChecked: "2026-02-13T12:00:00.000Z",
            rating: 4.5,
            note: "Verified via Homepage/Search"
        }
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 85 Lines ---