// 29.01.2026 15:45 - FEAT: Expanded FoodEnricher Schema (Ratings, Signature Dish, Logistics) & Critic Persona.
// 28.01.2026 10:05 - FIX: Removed invalid SelfCheck type 'quality'.
// 27.01.2026 23:30 - FIX: FoodEnricher Template V30 Parity.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  // 1. Unpack Payload
  const { context, instructions } = payload;
  
  const role = instructions?.role || `You are the "Food-Enricher", a hybrid intelligence agent acting as a premium Restaurant Critic.`;
  const editorialGuideline = instructions?.editorial_guideline || "";

  // 2. Build Instructions
  const mainInstruction = `# TASK
Perform a "Hybrid Knowledge" enrichment for the provided restaurant candidates.
1. **Live Research:** Find current Hard Facts (Address, Phone, Website, Opening Hours, Current Menu).
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
1. **Awards:** Explicitly check for Michelin (Stars, Bib), Gault&Millau, Feinschmecker.
2. **Signature Dish:** Identify one specific dish or specialty the place is famous for.
3. **Ratings:** Provide Google Rating (e.g. 4.6) and Count.
4. **Logistics:** Add a short tip (e.g. "Reservation essential", "Cash only").

# FALLBACK RULE
If a restaurant cannot be found or is permanently closed, set "found": false.`;

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
        "signature_dish": "String (e.g. 'Bouillabaisse')",
        "price_level": "String (€/€€/€€€)",
        "rating": "Number (e.g. 4.5)",
        "rating_count": "Number (approximate)",
        "logistics_tip": "String (Short practical advice)",
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
    .withSelfCheck(['research']) 
    .build();
};
// --- END OF FILE 79 Zeilen ---