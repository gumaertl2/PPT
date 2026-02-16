// 16.02.2026 21:45 - UPDATE: DATA RECOVERY & PREMIUM ENRICHMENT.
// - Logic: Step 0 strictly checks Existence/Open/Listed.
// - Logic: ADDED 'Data Recovery' for missing ratings/reviews (null-fix).
// - Logic: Preserves user's rich content generation (Teaser/Deep Dive).

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  const refLocation = context.location_name || context.target_town || "Target Region";
  const candidates = context.candidates_list || context.candidates || [];
  
  const candidatesString = JSON.stringify(candidates.map((c: any) => ({
      id: c.id,
      name: c.name,
      address: c.address, 
      phone: c.phone,     
      website: c.website, 
      awards: c.awards,   
      liveStatus: c.liveStatus,
      rating: c.rating,
      user_ratings_total: c.user_ratings_total
  })));

  const builder = new PromptBuilder();

  builder.withRole(instructions.role || "You are the 'Gastronomy Chief Editor' AND 'Strict Auditor'.");

  builder.withContext({
      candidates_count: candidates.length,
      reference_location: refLocation,
      task: "1. Audit & Data Recovery. 2. Generate Premium Content.",
      retention_policy: "REJECT INVALID. ENRICH VALID. FIX MISSING METADATA."
  });

  builder.withInstruction(`
    # MISSION
    You are refining a raw list of restaurants. Your goal is to turn "thin" data into a premium experience.
    
    ### STEP 0: THE AUDIT & DATA RECOVERY
    Before writing any text, verify and complete the data for EACH candidate:
    
    1. **VALIDITY CHECK:** Reject if permanently closed, non-existent, or clearly not a "Guide-level" establishment (Fast Food).
    
    2. **DATA RECOVERY (Rating Fix):** - If 'rating' or 'user_ratings_total' is null or 0, perform a targeted search: "[Name] [Address] Google Rating".
       - Fill in the real-world Google stars and review count. Do not leave them null if reachable.
    
    -> IF valid: Set "verification_status": "enriched" and proceed.

    # STEP 1: DUAL-TEXT GENERATION
    A. **'description' (The List View Teaser):**
       - **Strict Limit:** Max 150 characters.
       - **Style:** Catchy, inviting, summary of the style.

    B. **'detailContent' (The Chief Editor Story):**
       - **Format:** Use Markdown (### for headlines, ** for bold).
       - **Structure:**
         1. **### Kulinarisches Erlebnis:** Describe the food, philosophy, and chef's style.
         2. **### Atmosphäre:** Describe the interior, vibe, and crowd.
         3. **### Insider-Tipp:** A specific recommendation.
       - **Tone:** Passionate, knowledgeable, premium.

    # STEP 2: SOFT SKILLS ENRICHMENT
    A. **Vibe:** 3 keywords (e.g. "Rustic", "Elegant", "Lively").
    B. **Signature Dish:** Infer strictly from cuisine (e.g. "Zwiebelrostbraten" for Bavarian).
    C. **Logistics:** One practical tip (Parking, Reservation).
    D. **Meta:** Estimate 'priceLevel' (€ to €€€€) and 'openingHours'.

    # STEP 3: GUIDE LINK
    - **guide_link:** Construct a Smart Google Search URL.
      - Logic: "https://www.google.com/search?q=" + Name + " " + City + " " + (First Award OR "Restaurant")

    # STEP 4: OUTPUT
    Return the JSON. 
    - **ENSURE** 'rating' and 'user_ratings_total' are now filled with numeric values.
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
        user_ratings_total: "Number",
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
// --- END OF FILE 135 Zeilen ---