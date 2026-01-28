// 29.01.2026 14:30 - FIX: FoodScout Template update for Phase 1 (Scanner Mode). Added source_url to schema.
// 28.01.2026 10:15 - FIX: Removed invalid SelfCheck type 'quality'.
// 26.01.2026 21:20 - FIX: FoodScout Template (Strict Mode).
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodScoutPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  const role = instructions?.role || `You are the "Food-Collector", a specialized scanning agent in an orchestrated intelligence system.`;
  const strategy = instructions?.strategy || "Find the best rated restaurants.";
  
  // Robust check for guides list to prevent crashes
  const allowedSources = Array.isArray(context.guides_list) 
      ? context.guides_list.join(', ') 
      : "Michelin, Gault&Millau, Local Premium Guides";

  const mainInstruction = `# TASK
Scan for restaurant candidates in the area of **${context.location_name}**.
Search Radius/Area: ${context.search_area}

# STRATEGY & PROFILE
${strategy}

# ALLOWED SOURCES (WHITELIST)
You act as a strict filter. You must ONLY select restaurants that are explicitly listed in one of these guides:
**${allowedSources}**

# MANDATORY RULES
1. **Source Verification:** If a restaurant is not listed in one of the allowed guides, IGNORE it.
2. **Coordinates:** You MUST provide Lat/Lng coordinates.
3. **Accuracy:** No hallucinations. Verify that the place exists.
4. **Source Link:** If available, provide a direct link to the guide entry or the restaurant website.`;

  const outputSchema = {
    "_thought_process": "String (Verify guide listing & criteria match)",
    "candidates": [
      {
        "name": "String",
        "city": "String",
        "address": "String",
        "description": "String (Short summary of why it fits the profile, e.g. 'Listed in Michelin')",
        "location": { "lat": "Number", "lng": "Number" },
        "guides": ["String (The specific guide names found)"],
        "source_url": "String (Link to the guide entry or website)",
        "cuisine": "String",
        "priceLevel": "String"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "SCANNER CONTEXT")
    .withInstruction(mainInstruction)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['research'])
    .build();
};
// --- END OF FILE 57 Zeilen ---