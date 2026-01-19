// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/geoAnalyst.ts
// 19.01.2026 19:35 - FIX: Corrected PromptBuilder pattern for Strategic Briefing injection.
// 19.01.2026 13:35 - FIX: Restored V30 Legacy Schema (German Keys) for GeoAnalyst.
// 17.01.2026 15:00 - UPDATE: Added 'Hub Identification' Logic.
// 18.01.2026 00:40 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildGeoAnalystPrompt = (project: TripProject): string => {
  const { userInputs, analysis } = project;
  const { logistics } = userInputs;

  // 1. STRATEGIC BRIEFING (V40 English Key)
  const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                            (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                            "";

  // Context Preparation
  let geoMode = "";
  let routing = "";

  if (logistics.mode === 'stationaer') {
    geoMode = "STATIONARY (Hub & Spoke)";
    routing = `Base Location: ${logistics.stationary.destination}.
    Task: Validate if this base is suitable for day trips in the region: ${logistics.stationary.region || 'Region'}.`;
  } else {
    geoMode = "ROUNDTRIP";
    routing = `Route: ${logistics.roundtrip.stops.map(s => s.location).join(' -> ')}.
    Region: ${logistics.roundtrip.region}.
    Task: Identify the best overnight stops (Hubs) along this route.`;
  }

  const contextData = {
    mode: geoMode,
    arrival_type: (userInputs.dates.arrival as any).type,
    routing_info: routing
  };

  const role = `You are the "Geo Analyst". Your task is the strategic evaluation of locations (Hubs).
  You are NOT looking for specific hotels, but for the best *locations* to stay overnight.`;

  const instructions = `# TASK
${routing}

# GOAL
1.  Identify strategic "Hubs" (Cities/Villages) suitable as a base.
2.  Evaluate the location regarding:
    * Accessibility (Transport connections)
    * Infrastructure (Restaurants, Supermarkets)
    * Tourist Appeal (Vibe)

# OUTPUT
Create a list of recommended hubs with reasoning.`;

  // FIX: Schema converted to V40 English keys
  const outputSchema = {
    "recommended_hubs": [
      {
        "hub_name": "String (Name of City/Town)",
        "suitability_score": "Integer (1-10)",
        "pros": ["String"],
        "cons": ["String"],
        "suitable_for": "String (e.g. 'Families', 'Nightlife', 'Quiet')"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "GEO DATA")
    .withContext(strategicBriefing, "STRATEGIC GUIDELINE")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['planning'])
    .build();
};
// --- END OF FILE 70 Zeilen ---