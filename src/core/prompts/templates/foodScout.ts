// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/foodScout.ts
// 19.01.2026 13:05 - FIX: Restored V30 Legacy Schema (vorschlaege, geo_koordinaten) for SSOT compliance.
// 16.01.2026 19:45 - FIX: Added V30 "Star-Filter" Logic.
// 18.01.2026 00:30 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject, FoodSearchMode } from '../../types';
import { PromptBuilder } from '../PromptBuilder';
import { getGuidesForCountry } from '../../../data/countries';

export const buildFoodScoutPrompt = (
    project: TripProject, 
    mode: FoodSearchMode = 'standard'
): string => {
  const { userInputs } = project;
  const { logistics, budget, vibe } = userInputs;

  // 1. Determine Location & Guides
  let location = "";
  let countryHint = "";

  if (logistics.mode === 'stationaer') {
      location = logistics.stationary.destination;
      countryHint = logistics.stationary.region; 
  } else {
      const stops = logistics.roundtrip.stops.map(s => s.location).join(', ');
      location = `the stops: ${stops}`;
      countryHint = logistics.roundtrip.region;
  }

  const guides = getGuidesForCountry(countryHint || location).join(', ');

  // 2. Mode Logic (V30 Parity) - Translated to English
  let qualityFilterInstruction = "";
  if (mode === 'standard') {
      qualityFilterInstruction = `### QUALITY FILTER (STANDARD)
We are looking for excellent cuisine for daily travel, NOT a "Fine Dining" event.
1. **Sources:** Use the guides (${guides}).
2. **Category:** Look for "Bib Gourmand", "Tip", "Recommendation".
3. **EXCLUDE:** Ignore restaurants with Michelin Stars (unless budget allows).`;
  } else {
      qualityFilterInstruction = `### QUALITY FILTER (GOURMET / STARS)
The user explicitly requests upscale gastronomy.
1. **Sources:** Use the guides (${guides}).
2. **Category:** Prioritize restaurants with Stars (1-3) or Toques.`;
  }

  // 3. Prompt Builder
  const role = `You are a culinary research scout. Your task is to find restaurants listed in renowned guides.`;

  const contextData = {
    target_area: { location: location, country: countryHint },
    allowed_sources: guides,
    budget: budget,
    vibe: vibe
  };

  const instructions = `# TASK
Search for restaurants in ${location} that match the filter criteria.
Extract exact coordinates.

${qualityFilterInstruction}

# MANDATORY
Geographic data is MANDATORY for distance calculation.`;

  // FIX: Schema converted to V40 English keys
  const outputSchema = {
    "candidates": [
      {
        "name": "String",
        "city": "String",
        "address": "String",
        "description": "String (Short description of cuisine/vibe)",
        "location": { "lat": "Number", "lng": "Number" },
        "guides": ["String"],
        "cuisine": "String (e.g. 'Regional', 'Modern')",
        "priceLevel": "String (e.g. '€€', '€€€')"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "CONTEXT")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'research'])
    .build();
};
// --- END OF FILE 87 Zeilen ---