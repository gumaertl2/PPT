// 31.01.2026 00:00 - FEAT: "Exhaustive Search" (Gierig). No limits. Find ALL valid candidates. 50km Radius.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodScoutPrompt = (payload: any): string => {
  const { context, userInputs } = payload;
  
  const locationName = context.location_name || "Target Region";
  // Radius: Wir lassen den Geo-Filter die Arbeit machen. Der Scout soll weit werfen.
  const searchRadius = "50km"; 

  const foodInterests = (userInputs?.selectedInterests || [])
    .filter((id: string) => ['food', 'restaurants', 'wine', 'fine_dining', 'local_food'].includes(id));
    
  const specificCuisines = foodInterests.length > 0 
    ? `Focus specifically on these vibes: ${foodInterests.join(', ')}` 
    : "Search broadly for high-quality local cuisine.";

  const allowedSources = Array.isArray(context.guides_list) && context.guides_list.length > 0
      ? context.guides_list.join(', ') 
      : "Internationally recognized premium restaurant guides";

  const role = `Du bist der "Food-Scout". Deine Aufgabe ist eine **VOLLSTÄNDIGE** Erfassung der Gastronomie.
  NICHT filtern. NICHT limitieren. Wir brauchen Masse für den späteren Geo-Filter.`;

  const mainInstruction = `# TASK
List **ALL** restaurant candidates you can find in the area of **${locationName}** (Radius: ~${searchRadius}).

# STRATEGY (EXHAUSTIVE / VOLLSTÄNDIGKEIT)
1. **NO LIMITS:** Do NOT stop at 8 or 10. If there are 50 valid restaurants, list 50.
2. **NO PRE-FILTERING:** If a restaurant is in one of the allowed guides, TAKE IT.
3. **REGIONAL COVERAGE:** Do not just look at the city center. Look at the surrounding villages and the whole region.

# ALLOWED SOURCES (SSOT)
Strictly stick to these guides:
👉 **${allowedSources}**

# INPUT-LOCATIONS (ANCHORS)
Start your search around these points:
${(context.search_locations || []).join(', ')}

# CRITICAL VALIDATION
1. **Real Names Only:** No guide names as restaurant names.
2. **Coordinates:** Essential for the Geo-Filter later.

${specificCuisines}`;

  const outputSchema = {
    "_thought_process": "String (Strategy: List scanned locations. Confirming I am listing ALL findings without artificial limits.)",
    "resolved_search_locations": ["String (List of REAL city names found)"],
    "candidates": [
      {
        "name": "String",
        "city": "String",
        "address": "String",
        "location": { "lat": "Number", "lng": "Number" },
        "guides": ["String"],
        "source_url": "String"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "SCANNER CONTEXT")
    .withInstruction(mainInstruction)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic'])
    .build();
};
// --- END OF FILE 69 Zeilen ---