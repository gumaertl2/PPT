// 10.02.2026 23:00 - FIX: PRESERVE LIVE STATUS.
// - Problem: Enricher dropped 'liveStatus' from Scout, causing UI to re-trigger checks.
// - Fix: Added 'liveStatus' to Pass-Through fields (Input & Schema).
// - Context: 'awards' are also preserved strictly.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  // Input: Validated Candidates from Scout (containing Hard Facts & Live Status)
  const candidates = context.candidates_list || [];
  
  // Serialize candidates safely
  // We MUST include the Hard Facts AND liveStatus here so the LLM can pass them through
  const candidatesString = JSON.stringify(candidates.map((c: any) => ({
      id: c.id,
      name: c.name,
      cuisine: c.cuisine,
      address: c.address, // Hard Fact (Pass-through)
      phone: c.phone,     // Hard Fact (Pass-through)
      website: c.website, // Hard Fact (Pass-through)
      awards: c.awards,   // Hard Fact (Pass-through)
      liveStatus: c.liveStatus, // CRITICAL: Pass-through to prevent re-checking
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
       - *Example:* "Modernes Bistro mit kreativer Alpenküche und toller Weinkarte."

    B. **'detailContent' (The Chief Editor Story):**
       - **Format:** Use Markdown (### for headlines, ** for bold).
       - **Structure:**
         1. **### Kulinarisches Erlebnis:** Describe the food, the philosophy, and the chef's style.
         2. **### Atmosphäre:** Describe the interior, the vibe, and the crowd.
         3. **### Insider-Tipp:** A specific recommendation (Dish or Seat).
       - **Tone:** Passionate, knowledgeable, premium.

    # STEP 2: SOFT SKILLS ENRICHMENT
    A. **Vibe:** - 3 keywords (e.g., "Romantic", "Lively", "Traditional").

    B. **Signature Dish:**
       - Infer strictly from cuisine if not known (e.g. Italian -> "Hausgemachte Pasta").

    C. **Logistics:** - One practical tip (e.g., "Reservierung empfohlen").

    D. **Meta:**
       - Estimate 'priceLevel' (€-€€€€).
       - Format 'openingHours' as compact string.

    # STEP 3: OUTPUT
    Return the JSON. 
    - **COPY** the Hard Facts (id, address, phone, website, awards) exactly.
    - **COPY** the 'liveStatus' object exactly (do not change it).
    - **FILL** the 'detailContent' and 'description' fields.

    # INPUT DATA
    ${candidatesString}
  `);

  builder.withOutputSchema({
    candidates: [
      {
        id: "String (KEEP ORIGINAL ID)",
        name: "String (KEEP ORIGINAL)",
        address: "String (PASS THROUGH FROM INPUT)",
        phone: "String (PASS THROUGH FROM INPUT)",
        website: "String (PASS THROUGH FROM INPUT)",
        awards: ["String (PASS THROUGH FROM INPUT)"], 
        liveStatus: {
            // PASS THROUGH THE WHOLE OBJECT
            status: "String",
            operational: "Boolean",
            lastChecked: "String",
            rating: "Number",
            note: "String"
        },
        
        // The Dual-Text Layer:
        description: "String (Short Teaser, max 150 chars)",
        detailContent: "String (Long Markdown Story - ### Headlines)", 
        
        // Soft Skills:
        vibe: ["String", "String"],
        signature_dish: "String",
        logistics: "String",
        priceLevel: "String (€, €€, €€€, €€€€)",
        openingHours: "String",
        
        verification_status: "enriched"
      }
    ]
  });

  return builder.build();
};
// --- END OF FILE 120 Zeilen ---