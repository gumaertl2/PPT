// 29.01.2026 17:30 - FEAT: Refactored GeoAnalyst to "Location Strategist" (Cluster Analysis).
// 23.01.2026 15:50 - FIX: Synchronized Schema with CoT Instruction (added _thought_process).
// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/geoAnalyst.ts

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildGeoAnalystPrompt = (project: TripProject): string => {
  const { userInputs, analysis } = project;
  const { logistics } = userInputs;

  // 1. STRATEGIC BRIEFING
  const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                            (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                            "";

  // 2. DETERMINE MODE & CONTEXT
  let geoMode = "";
  let taskDescription = "";
  
  if (logistics.mode === 'stationaer') {
    geoMode = "STATIONARY (District Finder)";
    const dest = logistics.stationary.destination || 'Destination';
    taskDescription = `Target: ${dest}.
    Task: Analyze the provided 'SIGHTS_CLUSTER' (if available). Determine the **optimal district/neighborhood** in ${dest} to use as a base.
    Goal: Minimize travel times to the sights.`;
  } else {
    geoMode = "ROUNDTRIP (Hub Finder)";
    const stops = logistics.roundtrip.stops.map(s => s.location).join(' -> ');
    taskDescription = `Route: ${stops}.
    Region: ${logistics.roundtrip.region}.
    Task: Identify the best strategic overnight stops (Hubs) along this route to minimize driving daily.`;
  }

  const contextData = {
    mode: geoMode,
    arrival_type: (userInputs.dates.arrival as any).type,
    travel_season: userInputs.dates.start // Relevant for traffic/weather
  };

  const role = `You are the "Geo Analyst" and "Location Strategist". 
  You do not look for hotels yet. You define the **Search Area** for the Hotel Scout.
  Your goal is Logistical Efficiency.`;

  const instructions = `# TASK
${taskDescription}

# ANALYSIS LOGIC
1.  **Center of Gravity:** Look at the distribution of sights/activities. Where is the center?
2.  **Logistics Check:** * If Car: Suggest areas with parking / outskirts.
    * If Train/Flight: Suggest Central Station or City Center proximity.
3.  **Vibe Match:** Match the user's vibe (${userInputs.vibe}) with the district (e.g. "Hipster" -> Arts District, "Quiet" -> Suburbs).

# OUTPUT
Recommend 1-2 specific areas/hubs that are strategically perfect.`;

  const outputSchema = {
    "_thought_process": "String (Analyze Sights Distribution & Logistics)",
    "recommended_hubs": [
      {
        "hub_name": "String (Name of City OR Specific District, e.g. 'Berlin - Mitte')",
        "suitability_score": "Integer (1-10)",
        "pros": ["String (Logistics)", "String (Vibe)"],
        "cons": ["String"],
        "suitable_for": "String (e.g. 'Short Walking Distances', 'Car Travelers')"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "GEO PARAMETERS")
    .withContext(strategicBriefing, "STRATEGIC GUIDELINE")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['planning'])
    .build();
};
// --- END OF FILE 84 Zeilen ---