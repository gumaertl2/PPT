// 10.02.2026 23:30 - FIX: GUIDE LINK & TS COMPLIANCE.
// - Fix: Explicitly instruct better Google Search URL for guide_link.
// - Context: 'awards' and 'liveStatus' are passed through.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  const candidates = context.candidates_list || [];
  
  const candidatesString = JSON.stringify(candidates.map((c: any) => ({
      id: c.id,
      name: c.name,
      cuisine: c.cuisine,
      address: c.address, 
      phone: c.phone,     
      website: c.website, 
      awards: c.awards,   // Pass-through
      liveStatus: c.liveStatus, // Pass-through
      rating: c.rating    
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
    **DO NOT change the Hard Facts (Address, Phone, Website, Awards, LiveStatus).**

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

    # STEP 3: GUIDE LINK (URL OPTIMIZATION)
    - **guide_link:** If you find a DIRECT URL to the Michelin/Gault&Millau page, use it.
    - **FALLBACK:** If no direct link, construct a SMART SEARCH URL:
      "https://www.google.com/search?q=" + Name + " " + City + " " + (First Award Name OR "Restaurant")
      *Example:* "https://www.google.com/search?q=Gasthof%20Widmann%20Maisach%20Guide%20Michelin"
      *Goal:* The user should find the award entry immediately.

    # STEP 4: OUTPUT
    Return the JSON. 
    - **COPY** Hard Facts & liveStatus exactly.
    - **FILL** detailContent, description, and guide_link.

    # INPUT DATA
    ${candidatesString}
  `);

  builder.withOutputSchema({
    candidates: [
      {
        id: "String (KEEP ORIGINAL ID)",
        name: "String (KEEP ORIGINAL)",
        address: "String (PASS THROUGH)",
        phone: "String (PASS THROUGH)",
        website: "String (PASS THROUGH)",
        awards: ["String (PASS THROUGH)"], 
        liveStatus: {
            status: "String",
            operational: "Boolean",
            lastChecked: "String",
            rating: "Number",
            note: "String"
        },
        description: "String (Short)",
        detailContent: "String (Long Markdown)", 
        vibe: ["String"],
        signature_dish: "String",
        logistics: "String",
        priceLevel: "String",
        openingHours: "String",
        guide_link: "String (Smart URL)", // Optimized Link
        verification_status: "enriched"
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 125 Zeilen ---