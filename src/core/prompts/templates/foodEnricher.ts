// 04.02.2026 22:20 - FINAL POLISH: FACTS CONFIDENCE.
// - Added 'facts_confidence' (high/medium/low) to signal reliability.
// - Re-emphasized "DO NOT GUESS" rule.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  // 1. Unpack Payload
  const { context, instructions } = payload;
  
  const role = instructions?.role || `You are the "Food-Enricher" & Honest Data Specialist.`;
  const editorialGuideline = instructions?.editorial_guideline || "";

  // 2. Build Instructions
  const mainInstruction = `# TASK
Perform a "Hybrid Knowledge" enrichment AND "Hard Facts Recovery".
The previous agent (Scout) may have delivered incomplete data (lat/lng: null).

1. **COORDINATE RECOVERY (HONESTY FIRST):**
   - Try to determine coordinates based on Name + City + Address.
   - **CRITICAL:** If you are NOT 100% sure about the location, set 'lat'/'lng' to null and 'geocoding_status' to "requires_lookup".
   - **DO NOT GUESS COORDINATES.** A missing coordinate is better than a wrong one.

2. **Live Research Simulation:** Determine Hard Facts (Address, Phone, Website, Opening Hours).
   - If a specific fact (e.g. Rating) is unknown, set it to null. Do NOT invent numbers.
   - Set 'facts_confidence' to "low" if you are guessing most details.

3. **LLM Knowledge:** Use your internal culinary knowledge to describe the Vibe, Cuisine Style, and Reputation.

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
2. **Awards:** Explicitly check for Michelin (Stars, Bib), Gault&Millau, Feinschmecker. Mark estimates with "(ca.)".
3. **Signature Dish:** Identify one specific dish or specialty.
4. **DATA PRESERVATION (THE SHIELD):** You received 'existing_guides' and 'source_url' (or 'existing_url') in the input. You MUST return them exactly as received. Do NOT delete or empty these fields.

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
    "_thought_process": "String (Step 1: Check Input. Step 2: Honest Recovery. Step 3: Verify Output Count. CONFIRM!)",
    "enriched_candidates": [
      {
        "id": "String (CRITICAL: Copy exactly from input!)",
        "original_name": "String",
        "found": "Boolean",
        "name_official": "String (Correct spelling)",
        "address": "String (Full Address or 'Unknown')",
        "location": {
            "lat": "Number OR null",
            "lng": "Number OR null"
        },
        "geocoding_status": "String ('verified' | 'requires_lookup')",
        "facts_confidence": "String ('high' | 'medium' | 'low')",
        "phone": "String (e.g. +49 ... or null)",
        "website": "String | null",
        "awards": ["String (e.g. 'Michelin 1 Star', 'Bib Gourmand')"],
        "guides": ["String (CRITICAL: Copy 'existing_guides' from input exactly)"],
        "source_url": "String (CRITICAL: Copy 'existing_url' from input)",
        "cuisine": "String",
        "vibe": ["String"],
        "signature_dish": "String",
        "priceLevel": "String (€/€€/€€€)",
        "rating": "Number OR null",
        "user_ratings_total": "Number OR null",
        "logistics": "String (Short practical advice)",
        "openingHoursHint": "String (e.g. 'Daily from 18:00' or null)",
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
// --- END OF FILE 118 Zeilen ---