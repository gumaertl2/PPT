// 28.02.2026 18:50 - FIX: Relaxed CRITICAL GEOCODING RULE.
// 28.02.2026 18:00 - FIX: Added CRITICAL GEOCODING RULE securely.
// src/core/prompts/templates/foodScout.ts
// 16.02.2026 19:00 - PROMPT: INTERNATIONAL TRIPLE DRAGNET.
// - Logic: Combines 3 Strategies: Regional Lists + Neighbor Cluster + District Zoom.
// - Logic: Works internationally by deducing the administrative structure (County/Province/District).
// - Logic: Enforces "List Scanning" to find multiple entries per list.

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildFoodScoutPrompt = (_project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  const safeContext = context || {};
  const targetLocation = safeContext.target_town || safeContext.location_name || "the region";
  const country = safeContext.country || "the country";
  
  // Dynamic Guide Setup
  let guideNames = "Michelin, Gault&Millau, Falstaff, Slow Food, Varta, Feinschmecker";
  if (safeContext.guides && Array.isArray(safeContext.guides)) {
      guideNames = safeContext.guides.map((g: any) => g.name).join(', ');
  }

  builder.withOS();

  builder.withRole(`
    You are a GLOBAL DEEP RESEARCH DETECTIVE for Gastronomy.
    Target: **${targetLocation}** in **${country}**.
    
    ### THE MISSION: "THE TRIPLE DRAGNET"
    To find ALL relevant restaurants (Hidden Gems, Neighbors, and List-Runners-Up), you must execute three specific search strategies simultaneously.
    We are looking for restaurants listed in: **${guideNames}**.
  `);

  builder.withInstruction(`
    ### EXECUTION PROTOCOL (The 3 Nets):

    **STEP 1: GEOGRAPHIC PROFILING (Mental Setup)**
    - Identify the **Parent Region** (e.g., "Landkreis FFB" for Maisach, "Siena Province" for Montepulciano).
    - Identify **3-8 Neighbors** (Cluster) within 25km.
    - Identify **Districts/Suburbs** (e.g., "Rottbach" for Maisach).
    - *Log these in _thought_process.*

    **STEP 2: THROW THE 3 NETS (Search Strategy)**
    
    * **NET A: The Regional List Scan (For "Klosterstüberl")**
        - Search for broad lists of the Parent Region.
        - Query: \`"Best Restaurants [Parent Region] Guide List"\`
        - Query: \`"Guide Michelin [Parent Region] full list"\`
        - *Rule:* If you find a list, extract **ALL** entries that are geographically close to ${targetLocation}, not just the #1.

    * **NET B: The Neighbor Cluster (For "Widmann")**
        - Search using OR-Logic for neighbors.
        - Query: \`site:viamichelin.com "${targetLocation}" OR "[Neighbor1]" OR "[Neighbor2]"\`
        - Query: \`site:falstaff.com "${targetLocation}" OR "[Neighbor1]"\`

    * **NET C: The Micro-District Zoom (For "Heinzinger")**
        - Search specifically for the small districts/suburbs identified in Step 1.
        - Query: \`"Restaurant [District Name] [Parent Region] Guide"\`
        - Query: \`"Gasthof [District Name] Award"\`

    **STEP 3: AGGREGATION & FILTERING**
    - Compile all unique finds.
    - **Relevance Check:** Is the restaurant in ${targetLocation} OR a direct neighbor (< 10km)? -> KEEP.
    - **Guide Check:** Is it mentioned in a guide (Snippet or Website)? -> KEEP.
    - **Duplication Check:** Ensure "Fürstenfelder" is listed only once.
    - **Address Formatting (CRITICAL GEOCODING RULE):** The 'address' field must be clean and machine-readable for OpenStreetMap. Use 'Street, Number, ZIP, City, Country' if available. If it's a natural sight or has no street, use the specific local identifier (e.g. 'Plaza de la Iglesia', 'Camino a...'). STRICTLY FORBIDDEN: Never use descriptive prose, brackets like '(Leuchtturm)', or abbreviations like 's/n' in the address.

    ### OUTPUT (JSON ONLY):
    {
      "_thought_process": "1. Geo-Profile: Parent Region is X, Neighbors are Y, Z. 2. Net A found: ... 3. Net B found: ... 4. Net C found: ...",
      "candidates": [
        {
           "name": "Official Name",
           "address": "Street, Zip City (MUST BE ACCURATE)", 
           "phone": "+49...",
           "website": "...",
           "cuisine": "Style",
           "awards": ["Guide Name"], 
           "verification_status": "unverified", 
           "liveStatus": {
              "status": "open",
              "operational": true,
              "rating": 4.5,
              "note": "Found via Net B (Neighbor Cluster)"
           }
        }
      ]
    }
  `);

  builder.withOutputSchema({
    _thought_process: "Detailed log of the 3-Net-Strategy",
    candidates: [
      {
        name: "Official Name",
        address: "Street Number, Zip City",
        phone: "+49...",
        website: "https://...",
        cuisine: "Style",
        awards: ["Guide Name"],
        rating: 4.5,
        user_ratings_total: 100,
        verification_status: "verified",
        liveStatus: {
            status: "open",
            operational: true,
            lastChecked: "2026-02-16T12:00:00.000Z",
            rating: 4.5,
            note: "Verified"
        }
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 107 Lines ---