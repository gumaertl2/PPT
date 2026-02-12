// 13.02.2026 21:00 - MERGED FIX: ORIGINAL CONTENT LOGIC + RETENTION POLICY.
// - Logic: Uses the user's detailed content generation (Teaser/Deep Dive).
// - Logic: Adds strict "NO FILTERING" rule to ensure Wirtshäuser/Hotels are kept.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  // Robustly handle candidates input (handle both list and direct property)
  const candidates = context.candidates_list || context.candidates || [];
  
  // Serialize candidates safely INCLUDING RATINGS
  const candidatesString = JSON.stringify(candidates.map((c: any) => ({
      id: c.id,
      name: c.name,
      cuisine: c.cuisine,
      address: c.address, 
      phone: c.phone,     
      website: c.website, 
      awards: c.awards,   
      liveStatus: c.liveStatus,
      rating: c.rating,   // Pass-through
      user_ratings_total: c.user_ratings_total // Pass-through
  })));

  const builder = new PromptBuilder();

  builder.withRole(instructions.role || "You are the 'Gastronomy Chief Editor'. You turn validated restaurant data into premium content.");

  builder.withContext({
      candidates_count: candidates.length,
      task: "Generate TWO types of texts (Teaser & Deep Dive) matching the project's data structure.",
      retention_policy: "STRICT: Do not filter out candidates found by the Scout."
  });

  builder.withInstruction(`
    # MISSION
    You are refining a list of restaurants found by a Data Scout.
    
    ### CRITICAL RETENTION RULE (NON-NEGOTIABLE):
    The candidates in the input list have ALREADY been selected because they are listed in Guides.
    **YOU MUST OUTPUT A RESULT FOR EVERY SINGLE CANDIDATE.**
    - **Do NOT filter out** "Gasthöfe", "Hotel Restaurants" or "Traditional Places".
    - **Do NOT reject** a place because it lacks a website (use Google Maps data mentally).
    - **ONLY reject** if the place is "Permanently Closed".

    # STEP 1: DUAL-TEXT GENERATION
    For each candidate, write TWO distinct texts:
    
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
    B. **Signature Dish:** Infer strictly from cuisine if not known (e.g. "Zwiebelrostbraten" for Bavarian).
    C. **Logistics:** One practical tip (Parking, Reservation).
    D. **Meta:** Estimate 'priceLevel' (€, €€, €€€) and 'openingHours'.

    # STEP 3: GUIDE LINK
    - **guide_link:** Construct a Smart Google Search URL.
      - Logic: "https://www.google.com/search?q=" + Name + " " + City + " " + (First Award OR "Restaurant")

    # STEP 4: OUTPUT
    Return the JSON. 
    - **COPY** Hard Facts (id, address, phone, website, awards, liveStatus, rating, user_ratings_total).
    - **FILL** Content fields.

    # INPUT DATA
    ${candidatesString}
  `);

  builder.withOutputSchema({
    enriched_candidates: [
      {
        id: "String (preserve from input)",
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
        verification_status: "enriched"
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 130 Zeilen ---