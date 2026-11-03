// [2026-11-03] [22:25] - FIX: Restored Graceful Exit anti-hallucination valve, numeric rating schema, and clean single-guide countries.ts queries.
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
  let guidePlaybook = "";
  if (safeContext.guides && Array.isArray(safeContext.guides) && safeContext.guides.length > 0) {
      guideNames = safeContext.guides.map((g: any) => g.name).join(', ');
      const extractedTerms = safeContext.guides
          .flatMap((g: any) => Array.isArray(g.searchTerms) ? g.searchTerms : [])
          .filter(Boolean);
      if (extractedTerms.length > 0) {
          guideTerms = Array.from(new Set(extractedTerms)).join(', ');
      }
      guidePlaybook = safeContext.guides
          .map((g: any) => {
              const queries = Array.isArray(g.googleQueries) && g.googleQueries.length > 0
                  ? g.googleQueries.join(' | ')
                  : g.searchUrl || '';
              return queries ? `      - **${g.name}:** \`${queries}\`` : '';
          })
          .filter(Boolean)
          .join('\n');
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

    **STEP 1: GEOGRAPHIC PROFILING (Mental Setup — MANDATORY BEFORE SEARCHING)**
    - Identify the **Parent Region / County** (e.g., "Siena Province" for Montepulciano).
    - Identify **ALL incorporated villages/districts (Ortsteile / Gemeindeteile / Frazioni)** belonging to ${targetLocation}.
    - Identify **3-8 Neighboring Towns & County Seat** within **${clusterRadiusKm}km** of ${targetLocation}.
    - *Log all districts and neighbors explicitly in _thought_process.*

    **STEP 2: THROW THE 3 NETS (Targeted Per-Guide Search Strategy)**
    - **CRITICAL SEARCH SYNTAX RULE (ONE GUIDE PER QUERY):** NEVER chain multiple guide names together with spaces/commas in a single Google query (Google treats space-separated guides as \`AND\`, hiding every official guide site!), and NEVER run open-web \`"[Town]" Michelin Restaurant\` queries without \`site:guide.michelin.com\` (which pulls TripAdvisor tourist reviews instead of Michelin!). Query **ONE guide at a time** using the Official Country Guide Search Playbook below (replacing \`[CITY]\` with the target town, county/region, neighbor, or district):${guidePlaybook ? `\n    - **OFFICIAL COUNTRY GUIDE SEARCH PLAYBOOK (${country}):**\n${guidePlaybook}` : ''}
    
    * **NET A: The Regional & County List Scan**
        - Run the official per-guide queries for the **Parent Region / County / County Seat** across ${guideNames}.
        - Example: \`site:guide.michelin.com "[Parent Region / County Seat]"\` and each national guide query from the Playbook for \`[Parent Region / County Seat]\`.
        - *Rule:* If you find a regional guide list, extract **ALL** listed entries located within **${radiusKm}km** of ${targetLocation}, not just the #1.

    * **NET B: The Target Town & Neighbor Cluster Scan**
        - Run the official per-guide queries specifically for **"${targetLocation}"** AND for the **Neighbors within ${radiusKm}km** identified in Step 1.
        - Example: \`site:guide.michelin.com "${targetLocation}"\` (or \`"${targetLocation}" OR "[Neighbor1]"\`) and each national guide from the Playbook for **"${targetLocation}"** and its **${radiusKm}km** neighbors.

    * **NET C: The Micro-District & Village Zoom**
        - Rural guide-listed gems (Gasthöfe / Landgasthöfe / Trattorie / Quintas) are often indexed under their small incorporated village/district name (Ortsteil / Frazione / Freguesia) rather than the main municipality.
        - Run targeted single-guide searches for the districts/villages identified in Step 1 (e.g. \`("[District1]" OR "[District2]")\` combined with one guide from ${guideNames} at a time).

    **STEP 3: AGGREGATION & FILTERING**
    - Compile all unique finds from Net A, Net B, and Net C.
    - **Strict Radius Check:** Is the restaurant located in ${targetLocation}, one of its incorporated villages/districts, OR a neighboring town within **${radiusKm}km** driving distance? -> **KEEP IT!** (Discard places further away than ${radiusKm}km).
    ${qualityRule}
    - **CRITICAL TRUTH, SOURCE PROOF & GRACEFUL EXIT RULE (NO PADDING / NO HALLUCINATION):**
      1. **Official Source Proof (Anti-TripAdvisor Rule):**
         - A **Michelin** distinction (\`1 Star\`, \`Bib Gourmand\`, \`Selected / Recomendado / Empfehlung\`) may **ONLY** be assigned if you verified an active restaurant page on **\`guide.michelin.com\`**.
         - National guide awards (${guideNames}) must come from official guide listings or critic award lists — **NEVER** from TripAdvisor, TheFork, Google Maps reviews, tourist comments praising "Michelin quality", or expired listings from past years!
      2. **No Padding:** If official guide-listed restaurants exist within **${radiusKm}km**, return **ONLY** those verified guide-listed restaurants — **NEVER** pad or fill up the list with unguided "Local Top Pick" entries.
      3. **Graceful Exit (Honesty Valve):** **NEVER** invent, guess, or falsely claim a Michelin, Gault&Millau, or national guide award! If any candidate has no verified current listing in ${guideNames} (or if ZERO guide-listed restaurants exist in the entire ${radiusKm}km radius), you MUST set its \`awards\` array to exactly \`["Local Top Pick"]\`.
    - **Duplication Check:** Ensure each restaurant is listed only once.
    - **Address Formatting (CRITICAL GEOCODING RULE):** The 'address' field must be clean, verified from the restaurant's official imprint/website or guide entry, and machine-readable for OpenStreetMap. Use 'Street, Number, ZIP, City, Country' if available. If it's a natural sight or has no street, use the specific local identifier (e.g. 'Plaza de la Iglesia', 'Camino a...'). STRICTLY FORBIDDEN: Never use descriptive prose, brackets like '(Leuchtturm)', or abbreviations like 's/n' in the address.
  `);
  }

  builder.withOutputSchema({
    _thought_process: "Detailed log of the 3-Net-Strategy, Official Source Verification, and Truth Check",
    candidates: [
      {
        name: "Official Name",
        address: "Street Number, Zip City",
        phone: "+49...",
        website: "https://...",
        cuisine: "Style",
        awards: ["Guide Name OR 'Local Top Pick'"],
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
// --- END OF FILE 137 Zeilen ---