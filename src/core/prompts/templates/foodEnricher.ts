// 03.02.2026 20:30 - FIX: DATA PRESERVATION.
// - Added mandatory pass-through for 'guides' and 'source_url'.
// - Prevents data wipe during enrichment phase.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  // 1. Unpack Payload (Standard V40 Pattern)
  const { context, instructions } = payload;
  
  const role = instructions?.role || `You are the "Food-Enricher", a hybrid intelligence agent acting as a premium Restaurant Critic.`;
  const editorialGuideline = instructions?.editorial_guideline || "";

  // 2. Build Instructions
  const mainInstruction = `# TASK
Perform a "Hybrid Knowledge" enrichment for the provided restaurant candidates.
1. **Live Research:** Find current Hard Facts (Address, Phone, Website, Opening Hours, Current Menu, **Coordinates**).
2. **LLM Knowledge:** Use your internal culinary knowledge to describe the Vibe, Cuisine Style, and Reputation.

# EDITORIAL STYLE (BINDING)
You MUST follow this specific writing guideline:
"${editorialGuideline}"

# MANDATORY TEXT TEMPLATE (VITAL!)
For the "description" field, you MUST start exactly like this:
**"[Distance] entfernt: [Your text...]"**
(Example: "1.3 km entfernt: Die Brasserie Colette bietet...")
- Use the 'distance_val' from input to fill [Distance].
- If distance is 0 or unknown, use "Im Ort: ..." or "Direkt hier: ...".

# DATA REQUIREMENTS (ORCHESTRATED INTELLIGENCE)
1. **Identity:** You MUST return the exact 'id' provided in the input. Do NOT generate a new ID.
2. **Awards:** Explicitly check for Michelin (Stars, Bib), Gault&Millau, Feinschmecker.
3. **Signature Dish:** Identify one specific dish or specialty the place is famous for.
4. **Ratings:** Provide Google Rating (e.g. 4.6) and total count.
5. **Logistics:** Add a short tip (e.g. "Reservation essential", "Cash only").
6. **Coordinates:** You MUST provide accurate Latitude/Longitude for the Map View.
7. **DATA PRESERVATION (THE SHIELD):** You received 'existing_guides' and 'source_url' (or 'existing_url') in the input. You MUST return them exactly as received. Do NOT delete or empty these fields.

# FALLBACK RULE
If a restaurant cannot be found or is permanently closed, set "found": false.

# FINAL INTEGRITY CHECK (SELF-CONTROL)
Before outputting JSON, you MUST verify:
1. **Input Count:** I received X candidates.
2. **Output Count:** I am returning exactly X candidates.
3. **ID Match:** Every 'id' in output matches an 'id' from input.
⛔️ **CRITICAL:** If counts do not match, STOP and fix the list. Do NOT drop items because they are closed/unfound (set found:false instead).`;

  // 3. Schema
  const outputSchema = {
    "_thought_process": "String (Step 1: Count input items. Step 2: Research Awards & Coordinates. Step 3: Verify Output Count matches Input Count. CONFIRM!)",
    "enriched_candidates": [
      {
        "id": "String (CRITICAL: Copy exactly from input! Do NOT change!)",
        "original_name": "String",
        "found": "Boolean",
        "name_official": "String (Correct spelling)",
        "address": "String (Full Address with Zip/City)",
        "location": {
            "lat": "Number (e.g. 48.1351)",
            "lng": "Number (e.g. 11.5820)"
        },
        "phone": "String (e.g. +49 ... or null)",
        "website": "String | null",
        "awards": ["String (e.g. 'Michelin 1 Star', 'Bib Gourmand', 'Gault&Millau 3 Hauben')"],
        "guides": ["String (CRITICAL: Copy 'existing_guides' from input exactly)"],
        "source_url": "String (CRITICAL: Copy 'existing_url' or 'source_url' from input)",
        "cuisine": "String (e.g. 'French Modern')",
        "vibe": ["String (e.g. 'Romantic', 'Stylish')"],
        "signature_dish": "String (e.g. 'Bouillabaisse')",
        "priceLevel": "String (€/€€/€€€)",
        "rating": "Number (e.g. 4.5)",
        "user_ratings_total": "Number (Total count of ratings)",
        "logistics": "String (Short practical advice)",
        "openingHoursHint": "String (Brief text e.g. 'Daily from 18:00' or null)",
        "description": "String (Must follow the '[Distance] entfernt: ...' template!)"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "INPUT LIST & CONTEXT")
    .withInstruction(mainInstruction)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['research']) 
    .build();
};
// --- END OF FILE 107 Zeilen ---