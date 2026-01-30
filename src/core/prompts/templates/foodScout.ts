// 01.02.2026 18:20 - PROMPT UPGRADE: Golden Rules & "Deep Scan" Mode.
// Preserves "Exhaustive Search" logic (No Limits) for RAM-processing chain.
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
    ? `Focus on these vibes: ${foodInterests.join(', ')}` 
    : "Search broadly for high-quality local cuisine.";

  const allowedSources = Array.isArray(context.guides_list) && context.guides_list.length > 0
      ? context.guides_list.join(', ') 
      : "Internationally recognized premium restaurant guides";

  // 1. ROLE: Strategic Scanner (High Volume)
  const role = `You are the **Strategic Culinary Sourcing Agent** ("The Food-Scanner").
  Your operation mode is **EXHAUSTIVE / DEEP SCAN**.
  Your goal is to create a massive "Longlist" of candidates for the downstream geometric filter.
  **NEVER FILTER RESULTS YOURSELF.** We need quantity AND quality.`;

  const mainInstruction = `# PHASE 1: SOURCE CONFIGURATION (SSOT)
You are restricted to these official guides:
👉 **${allowedSources}**

# PHASE 2: EXHAUSTIVE SCANNING PROTOCOL (NO LIMITS)
Target: **${locationName}** (Radius: ~${searchRadius})
1. **NO ARTIFICIAL LIMITS:** Do NOT stop at 10 results. If the guides list 50 places, RETURN 50 PLACES.
2. **NO PRE-FILTERING:** Do not check opening hours or prices yet. Just capture valid guide entries.
3. **REGIONAL SCOPE:** Scan the city center AND the surrounding villages/region.

# PHASE 3: DATA INTEGRITY
1. **Real Names Only:** Verify the name. Do not invent places.
2. **Coordinates (CRITICAL):** You MUST provide Lat/Lng. The system calculates distances based on your coordinates.
3. **Source Tracking:** Note which guide recommended the place.

${specificCuisines}`;

  const outputSchema = {
    "_thought_process": "String (Confirming strategy: 'Scanning [Guides] for [Location]. I will list ALL valid findings without limiting count...')",
    "resolved_search_locations": ["String (List of REAL city names you are scanning)"],
    "candidates": [
      {
        "name": "String (Official Name)",
        "city": "String",
        "address": "String (Full Address)",
        "location": { "lat": "Number", "lng": "Number" },
        "guides": ["String (Name of the Guide, e.g. Michelin)"],
        "source_url": "String | null"
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
// --- END OF FILE 74 Zeilen ---