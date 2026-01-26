// 26.01.2026 22:15 - FIX: FoodEnricher Template (Payload Pattern).
// Implements strict Editorial Style Injection.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  // 1. Unpack Payload
  const { context, instructions } = payload;
  
  const role = instructions?.role || `You are a culinary data enricher.`;
  const editorialGuideline = instructions?.editorial_guideline || "";

  // 2. Build Instructions
  const mainInstruction = `# TASK
Research each restaurant candidate live on the web and enrich it with details.

# EDITORIAL STYLE (BINDING)
You MUST follow this specific writing guideline:
"${editorialGuideline}"

# DATA REQUIREMENTS
1.  **Address:** Must be exact and navigable.
2.  **Cuisine:** What is served? (e.g. "Modern Italian", "Traditional Bavarian").
3.  **Vibe:** Describe the atmosphere in 3-4 words (e.g. "Romantic, Candlelight").
4.  **Signature Dish:** Name 1-2 specialties if available.
5.  **Price:** €, €€ or €€€ (Estimate based on menu).

# FALLBACK RULE
If a restaurant cannot be found or is permanently closed, set "found": false. Do NOT invent data.`;

  // 3. Schema
  const outputSchema = {
    "_thought_process": "String (Research verification & strategy)",
    "enriched_candidates": [
      {
        "original_name": "String",
        "found": "Boolean",
        "address": "String (Full Address)",
        "cuisine": "String",
        "description": "String (Engaging text following the editorial guideline)",
        "vibe": ["String"],
        "signature_dish": "String",
        "price_level": "String",
        "website": "String | null"
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
// --- END OF FILE 52 Zeilen ---