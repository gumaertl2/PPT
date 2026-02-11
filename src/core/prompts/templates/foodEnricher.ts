// 10.02.2026 22:45 - RESTORED ORIGINAL ENRICHER.
// - Fix: Pass-through for Ratings & LiveStatus.
// - Fix: Smart Link Construction restored.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  const candidates = context.candidates_list || [];
  
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
      task: "Generate TWO types of texts (Teaser & Deep Dive) matching the project's data structure."
  });

  builder.withInstruction(`
    # MISSION
    You are refining a list of restaurants.
    **DO NOT change the Hard Facts (Address, Phone, Website, Awards).**

    Your job is to generate the CONTENT LAYERS for the App using the CORRECT FIELDS.

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
       - **Tone:** Passionate, knowledgeable, premium.

    # STEP 2: SOFT SKILLS ENRICHMENT
    A. **Vibe:** - 3 keywords.
    B. **Signature Dish:** Infer strictly from cuisine if not known.
    C. **Logistics:** One practical tip.
    D. **Meta:** Estimate 'priceLevel' and 'openingHours'.

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
    candidates: [
      {
        id: "String",
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
// --- END OF FILE 115 Zeilen ---