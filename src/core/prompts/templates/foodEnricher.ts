// 06.02.2026 21:00 - FIX: RESTORE LOGISTICS FIELD.
// 07.02.2026 14:00 - FIX: STRICT RATING ENFORCEMENT (>= 4.5).
// - Changed "Local Favorite" logic to include 4.5.
// - Added STRICT instruction to purge candidates below threshold if no award exists.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  const candidates = context.candidates_list || [];
  const targetArea = context.target_country || "Destination";
  const allowedGuides = context.allowed_guides || "Michelin, Gault&Millau";
  const searchTools = context.guide_tools || "";

  // Serialize candidates safely
  const candidatesString = JSON.stringify(candidates.map((c: any) => ({
      id: c.id,
      name: c.name || c.official_name,
      city: c.city || c.ort || "Unknown",
      description: c.description
  })));

  const builder = new PromptBuilder();

  builder.withRole(instructions.role || "You are the 'Gourmet Auditor'. You verify restaurant candidates and enrich them with premium data.");

  builder.withContext({
      target_area: targetArea,
      candidates_count: candidates.length,
      allowed_guides: allowedGuides,
      research_tools: `\n${searchTools}` 
  });

  builder.withInstruction(`
# MISSION
Audit the provided list of "Raw Candidates". Validate them and enrich them with high-quality data.

# STEP 1: VALIDATION (THE FILTER)
Check each candidate:
1. **Existence:** Does this place actually exist in **${targetArea}** (or its Metropolitan Area)?
2. **Relevance:** Is it a proper restaurant (No Fast Food chains, no pure Take-Away)?
3. **Status:** Is it currently OPEN (not permanently closed)?

-> If a candidate fails these checks, exclude it from the output.

# STEP 2: ENRICHMENT (THE DATA)
For every valid candidate, find and fill:
- **official_name:** Correct spelling.
- **address:** Full navigable address.
- **location:** Exact Lat/Lng coordinates.
- **contact:** Phone number & Official Website.
- **details:** - Opening Hours (compact string)
    - Price Level (1-4: €-€€€€)
    - Cuisine Style (e.g. "Modern Nordic", "Italian Fine Dining")
- **logistics:** Practical advice (e.g. "Reservierung 2 Wochen im Voraus nötig", "Mittags Walk-in möglich").
- **rating:** The Google Maps Rating (e.g. 4.7).
- **user_ratings_total:** Number of reviews (e.g. 1250).
- **vibe:** 3 keywords describing the atmosphere.
- **description:** A short, engaging summary (max 2 sentences) describing the food and atmosphere.
- **signature_dish:** The most famous dish or menu type.
- **awards:** List ANY guide mentions from this allowed list: **[${allowedGuides}]**.
- **guide_link:** Provide a DIRECT URL to the listing in the guide (e.g. guide.michelin.com/.../restaurant-name). 
  *FALLBACK:* If no direct guide link is found, create a specific Google Search link: "https://www.google.com/search?q=[Restaurant Name]+[City]+[Guide Name]"

# STEP 3: QUALITY GATEKEEPER (STRICT ENFORCEMENT)
You must apply this logic to deciding whether to KEEP or DISCARD a candidate.
**Do not show mercy.**

1. **Has Guide Award?** (Michelin, Gault&Millau, etc.) 
   -> **KEEP IT.** (Rating does not matter).

2. **No Guide Award?** -> CHECK GOOGLE RATING.
   - IF **rating >= 4.5**: Mark "awards" as ["Local Favorite"]. -> **KEEP IT.**
   - IF **rating < 4.5**: -> **DELETE THIS CANDIDATE.** (Do not include it in the output JSON. It failed the quality check.)

# REFERENCE TOOLS
${searchTools}

# INPUT DATA
${candidatesString}
`);

  // Define Schema
  builder.withOutputSchema({
      "_thought_process": "String (Audit log: Why did you accept/reject?)",
      "candidates": [
          {
              "id": "String (KEEP ORIGINAL ID)",
              "name_official": "String",
              "city": "String",
              "address": "String",
              "location": { "lat": "Number", "lng": "Number" },
              "phone": "String | null",
              "website": "String | null",
              "openingHours": "String (e.g. 'Tue-Sat 18-24')",
              "priceLevel": "String (€, €€, €€€, €€€€)",
              "cuisine": "String",
              "description": "String (Short summary)",
              "logistics": "String (Reservation advice)",
              "rating": "Number (float)",
              "user_ratings_total": "Number (integer)",
              "vibe": ["String"],
              "signature_dish": "String",
              "awards": ["String"],
              "guide_link": "String (The proof link)", 
              "verification_status": "String ('verified' or 'rejected')"
          }
      ]
  });

  return builder.build();
};
// --- END OF FILE 109 Zeilen ---