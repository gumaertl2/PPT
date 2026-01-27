// 28.01.2026 10:15 - FIX: Removed invalid SelfCheck type 'quality'.
// 26.01.2026 21:20 - FIX: FoodScout Template (Strict Mode).
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodScoutPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  const role = instructions?.role || `You are a specialized Food-Scout.`;
  const strategy = instructions?.strategy || "";
  
  const mainInstruction = `# TASK
Search for restaurants in **${context.location_name}** matching the strict profile below.
Search Area: ${context.search_area}

${strategy}

# ALLOWED SOURCES (WHITELIST)
You must ONLY select restaurants that appear in one of these specific guides:
**${context.guides_list.join(', ')}**

# MANDATORY RULES
1. **Source Check:** If a restaurant is not in one of the guides above, DISCARD IT.
2. **Coordinates:** Geographic data (Lat/Lng) is MANDATORY.
3. **No Hallucinations:** Only list places that actually exist and match the guide criteria.`;

  const outputSchema = {
    "_thought_process": "String (Verify guide listing & criteria match)",
    "candidates": [
      {
        "name": "String",
        "city": "String",
        "address": "String",
        "description": "String (Mention the specific Guide & Award, e.g. 'Michelin Bib Gourmand')",
        "location": { "lat": "Number", "lng": "Number" },
        "guides": ["String (The specific guide from the whitelist)"],
        "cuisine": "String",
        "priceLevel": "String"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "SEARCH CONTEXT")
    .withInstruction(mainInstruction)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['research'])
    .build();
};
// --- END OF FILE 48 Zeilen ---