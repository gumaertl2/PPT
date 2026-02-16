// src/core/prompts/templates/foodEnricher.ts
// 16.02.2026 17:45 - FIX: PASSTHROUGH RATINGS.
// - Logic: Step 0 strictly checks Existence/Open/Listed.
// - Logic: Added missing 'user_ratings_total' to input mapping (was causing data loss).
// - Logic: Output schema guarantees rating preservation.

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  const refLocation = context.location_name || context.target_town || "Target Region";
  const candidates = context.candidates_list || context.candidates || [];
  
  // FIX: Added user_ratings_total to the input map so the LLM sees it
  const candidatesString = JSON.stringify(candidates.map((c: any) => ({
      id: c.id,
      name: c.name,
      address: c.address, 
      phone: c.phone,     
      website: c.website, 
      awards: c.awards,   
      liveStatus: c.liveStatus,
      rating: c.rating,
      user_ratings_total: c.user_ratings_total // <--- WIEDER EINGEFÜGT
  })));

  const builder = new PromptBuilder();

  builder.withRole(instructions.role || "You are the 'Gastronomy Chief Editor' AND 'Strict Auditor'.");

  builder.withContext({
      candidates_count: candidates.length,
      reference_location: refLocation,
      task: "1. Audit (Exist? Open? Listed?). 2. Generate Content.",
      retention_policy: "REJECT INVALID OR UNLISTED PLACES. PRESERVE RATINGS."
  });

  builder.withInstruction(`
    # MISSION
    You are refining a raw list of restaurants found by a Scout.
    
    ### STEP 0: THE AUDIT (3-POINT CHECK)
    Before writing any text, verify the candidate:
    
    1. **EXISTENCE CHECK:** Is this a real, operating restaurant?
       -> If NO: Set "verification_status": "rejected".
    
    2. **STATUS CHECK:** Is it "Permanently Closed"?
       -> If YES: Set "verification_status": "rejected".
    
    3. **LISTING PLAUSIBILITY (The Guide Check):**
       - Does this place look like something listed in Michelin, Varta, Slow Food or Feinschmecker?
       - **REJECT** if it is clearly a fast-food chain (Subway, McDonalds) or a "Dönerbude" without reputation.
       - **KEEP** if it is a "Gasthof", "Landhotel", or "Fine Dining".
    
    -> IF checks 1-3 pass: Set "verification_status": "enriched" and proceed.

    # STEP 1: DUAL-TEXT GENERATION (Only for 'enriched' candidates)
    For each valid candidate, write TWO distinct texts:
    
    A. **'description' (The List View Teaser):**
       - **Strict Limit:** Max 150 characters.
       - **Style:** Catchy, inviting, summary of the style.

    B. **'detailContent' (The Chief Editor Story):**
       - **Format:** Use Markdown (### for headlines, ** for bold).
       - **Structure:**
         1. **### Kulinarisches Erlebnis:** Describe the food, the philosophy, and the chef's style.
         2. **### Atmosphäre:** Describe the interior, the vibe, and the crowd.
         3. **### Insider-Tipp:** A specific recommendation.
       - **Tone:** Passionate, knowledgeable, premium (but respectful of traditional places).

    # STEP 2: SOFT SKILLS ENRICHMENT
    A. **Vibe:** - 3 keywords (e.g. "Rustic", "Elegant", "Lively").
    B. **Signature Dish:** Infer strictly from cuisine (e.g. "Zwiebelrostbraten" for Bavarian).
    C. **Logistics:** One practical tip (Parking, Reservation).
    D. **Meta:** Estimate 'priceLevel' (€, €€, €€€) and 'openingHours'.

    # STEP 3: GUIDE LINK
    - **guide_link:** Construct a Smart Google Search URL.
      - Logic: "https://www.google.com/search?q=" + Name + " " + City + " " + (First Award OR "Restaurant")

    # STEP 4: OUTPUT
    Return the JSON. 
    - **COPY** Hard Facts (id, address, phone, website, awards, liveStatus, rating, user_ratings_total).
    - **FILL** Content fields for valid items.
    - **MARK** rejected items clearly in "verification_status".

    # INPUT DATA
    ${candidatesString}
  `);

  builder.withOutputSchema({
    enriched_candidates: [
      {
        id: "String (preserve)",
        name: "String",
        address: "String",
        phone: "String",
        website: "String",
        awards: ["String"], 
        rating: "Number",
        user_ratings_total: "Number", // <--- Jetzt auch im Schema gesichert
        liveStatus: {
            status: "String",
            operational: "Boolean",
            lastChecked: "String",
            rating: "Number",
            note: "String"
        },
        description: "String",
        detailContent: "String", 
        vibe: ["String"],
        signature_dish: "String",
        logistics: "String",
        priceLevel: "String",
        openingHours: "String",
        guide_link: "String",
        verification_status: "enriched" // OR "rejected"
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 137 Lines ---