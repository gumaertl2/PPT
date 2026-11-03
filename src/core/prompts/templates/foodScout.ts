// [2026-11-03] [12:24] - FIX: Enforced strict Zero-Result Honesty (removed all Local Top Pick/Hero fallbacks), wired dynamic Ad-Hoc radius & stars mode, and added REPAIR_MODE branch.
// [2026-11-02] [22:53] - FEAT: Added guide searchTerms injection, excluded 2-3 Michelin star temples, and prevented Local Top Pick padding when guide entries exist.
// 20.04.2026 16:45 - FIX: Implemented "Graceful Exit" and Strict Anti-Hallucination for Guide Awards.
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
  const radiusKm = Number(safeContext.radius_km) || 15;
  const clusterRadiusKm = safeContext.is_adhoc ? radiusKm : Math.max(25, radiusKm);
  const isStarsMode = safeContext.search_mode === 'stars';
  const repairTarget = safeContext.repair_target;
  
  // Dynamic Guide Setup
  let guideNames = "Michelin, Gault&Millau, Falstaff, Slow Food, Varta, Feinschmecker";
  let guideTerms = "Bib Gourmand, Guide Selection / Recommendation, National Guide Awards";
  if (safeContext.guides && Array.isArray(safeContext.guides)) {
      guideNames = safeContext.guides.map((g: any) => g.name).join(', ');
      const extractedTerms = safeContext.guides
          .flatMap((g: any) => Array.isArray(g.searchTerms) ? g.searchTerms : [])
          .filter(Boolean);
      if (extractedTerms.length > 0) {
          guideTerms = Array.from(new Set(extractedTerms)).join(', ');
      }
  }

  builder.withOS();

  if (repairTarget && repairTarget.name) {
      builder.withRole(`You are a Precision Geocoding & Address Research Assistant for Gastronomy in ${country}.`);
      builder.withInstruction(`
        Find the exact, machine-readable street address (Street, Number, ZIP, City, Country), phone number, and official website for the restaurant **"${repairTarget.name}"** in or near **${repairTarget.city} (${country})**.
        Do NOT invent an address. Return the single repaired candidate in the JSON array.
      `);
  } else {
      const qualityRule = isStarsMode
          ? `- **FINE DINING & STARS FOCUS (MODE: STARS):** The user explicitly requested **Michelin Starred (1, 2, or 3 Stars)** and absolute top-tier fine-dining restaurants (e.g., high Gault&Millau points / top national awards in ${guideNames}) within **${radiusKm}km** of ${targetLocation}.`
          : `- **QUALITY & STAR CEILING RULE:** Focus strictly on **Bib Gourmand**, official **Guide Recommendations / Selections**, national guide awards (${guideNames}), and **at most 1 Michelin Star**. **EXCLUDE 2-Star and 3-Star Michelin luxury temples**.`;

      builder.withRole(`
    You are a GLOBAL DEEP RESEARCH DETECTIVE for Gastronomy.
    Target: **${targetLocation}** in **${country}** (Strict Search Radius: **${radiusKm}km**).
    
    ### THE MISSION: "THE TRIPLE DRAGNET"
    To find ALL relevant restaurants (Hidden Gems, Neighbors, and List-Runners-Up), you must execute three specific search strategies simultaneously.
    We are strictly looking for restaurants officially listed in: **${guideNames}** (Key distinctions: **${guideTerms}**).
  `);

      builder.withInstruction(`
    ### EXECUTION PROTOCOL (The 3 Nets):

    **STEP 1: GEOGRAPHIC PROFILING (Mental Setup)**
    - Identify the **Parent Region** (e.g., "Landkreis FFB" for Maisach, "Siena Province" for Montepulciano).
    - Identify **Neighbors (Cluster)** strictly within **${clusterRadiusKm}km** of ${targetLocation}.
    - Identify **Districts/Suburbs** (e.g., "Rottbach" for Maisach).
    - *Log these in _thought_process.*

    **STEP 2: THROW THE 3 NETS (Search Strategy)**
    
    * **NET A: The Regional List Scan (For "Klosterstüberl")**
        - Search for broad lists of the Parent Region.
        - Query: \`"Best Restaurants [Parent Region] Guide List"\`
        - Query: \`"Guide Michelin [Parent Region] full list"\`
        - *Rule:* If you find a list, extract **ALL** entries that are within **${radiusKm}km** of ${targetLocation}, not just the #1.

    * **NET B: The Neighbor Cluster (For "Widmann")**
        - Search using OR-Logic for neighbors within **${radiusKm}km**.
        - Query: \`site:viamichelin.com "${targetLocation}" OR "[Neighbor1]" OR "[Neighbor2]"\`
        - Query: \`site:falstaff.com "${targetLocation}" OR "[Neighbor1]"\`

    * **NET C: The Micro-District Zoom (For "Heinzinger")**
        - Search specifically for the small districts/suburbs identified in Step 1.
        - Query: \`"Restaurant [District Name] [Parent Region] Guide"\`
        - Query: \`"Gasthof [District Name] Award"\`

    **STEP 3: AGGREGATION & FILTERING**
    - Compile all unique finds.
    - **Strict Radius Check:** Is the restaurant located in ${targetLocation} OR within **${radiusKm}km** driving distance? -> KEEP. Anything further than ${radiusKm}km MUST be discarded!
    ${qualityRule}
    - **STRICT ZERO-RESULT HONESTY (NO LOCAL HEROES / NO PADDING):** Return **ONLY** restaurants that hold a real, verifiable listing or distinction in the requested guides (${guideNames}). **NEVER** pad or fill the list with unguided "Local Top Pick", "Local Hero", or standard Google-rated restaurants!
    - **EMPTY ARRAY IF NOTHING FOUND:** If there are ZERO official guide-listed restaurants within the **${radiusKm}km** radius of ${targetLocation} (e.g. a small village with a tight 5km radius), you **MUST** return an empty array \`"candidates": []\`! Do NOT invent guide awards and do NOT include restaurants outside the ${radiusKm}km radius.
    - **Duplication Check:** Ensure each restaurant is listed only once.
    - **Address Formatting (CRITICAL GEOCODING RULE):** The 'address' field must be clean and machine-readable for OpenStreetMap. Use 'Street, Number, ZIP, City, Country' if available. If it's a natural sight or has no street, use the specific local identifier (e.g. 'Plaza de la Iglesia', 'Camino a...'). STRICTLY FORBIDDEN: Never use descriptive prose, brackets like '(Leuchtturm)', or abbreviations like 's/n' in the address.

    ### OUTPUT (JSON ONLY):
    {
      "_thought_process": "1. Geo-Profile: Parent Region is X, Radius is ${radiusKm}km. 2. Net A/B/C found: ... 3. Strict Guide & Radius Check: Keeping only verified guide entries within ${radiusKm}km (or returning [] if none exist).",
      "candidates": [
        {
           "name": "Official Name",
           "address": "Street, Zip City (MUST BE ACCURATE)", 
           "phone": "+49...",
           "website": "...",
           "cuisine": "Style",
           "awards": ["Exact Guide Distinction (e.g. Michelin: Bib Gourmand)"], 
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
  }

  builder.withOutputSchema({
    _thought_process: "Detailed log of the 3-Net-Strategy and Strict Guide & Radius Check",
    candidates: [
      {
        name: "Official Name",
        address: "Street Number, Zip City",
        phone: "+49...",
        website: "https://...",
        cuisine: "Style",
        awards: ["Exact Guide Name & Distinction"],
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
// --- END OF FILE 147 Zeilen ---