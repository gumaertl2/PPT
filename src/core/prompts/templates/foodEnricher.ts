// 27.01.2026 22:30 - FIX: FoodEnricher Template V30 Parity.
// Enforces specific text structure (Distance template) and richer data extraction (Awards, Phone).
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  // 1. Unpack Payload
  const { context, instructions } = payload;
  
  const role = instructions?.role || `You are a culinary data enricher.`;
  const editorialGuideline = instructions?.editorial_guideline || "";

  // 2. Build Instructions
  const mainInstruction = `# TASK
Research each restaurant candidate live on the web and enrich it with PREMIUM details.

# EDITORIAL STYLE (BINDING)
You MUST follow this specific writing guideline:
"${editorialGuideline}"

# MANDATORY TEXT TEMPLATE (VITAL!)
For the "description" field, you MUST start exactly like this:
**"[Distance] entfernt: [Your text...]"**
(Example: "1.3 km entfernt: Die Brasserie Colette bietet...")
If distance is unknown, use "Im Ort: ..." or "In der Nähe: ...".

# DATA REQUIREMENTS (V30 STANDARD)
1.  **Awards:** Search for Michelin (Stars, Bib Gourmand), Gault&Millau (Hauben), Feinschmecker using current data.
2.  **Hard Facts:** Exact address, Phone number (!), Website.
3.  **Vibe & Cuisine:** Precise classification.
4.  **Price:** €, €€, €€€ or €€€€ based on main courses.

# FALLBACK RULE
If a restaurant cannot be found or is permanently closed, set "found": false. Do NOT invent data.`;

  // 3. Schema
  const outputSchema = {
    "_thought_process": "String (Research verification & strategy)",
    "enriched_candidates": [
      {
        "original_name": "String",
        "found": "Boolean",
        "name_official": "String (Correct spelling)",
        "address": "String (Full Address with Zip/City)",
        "phone_number": "String (e.g. +49 ... or null)",
        "website": "String | null",
        "awards": ["String (e.g. 'Michelin 1 Star', 'Bib Gourmand', 'Gault&Millau 3 Hauben')"],
        "cuisine": "String (e.g. 'French Modern')",
        "vibe": ["String (e.g. 'Romantic', 'Stylish')"],
        "price_level": "String (€/€€/€€€)",
        "opening_hours_hint": "String (Brief text e.g. 'Daily from 18:00' or null)",
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
    .withSelfCheck(['research', 'quality'])
    .build();
};
// --- END OF FILE 68 Zeilen ---