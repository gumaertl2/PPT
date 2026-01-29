// 31.01.2026 15:10 - FEAT: Enforced District-Level Precision for Major Cities (Roundtrip & Stationary).
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
    Task: Analyze the provided 'SIGHTS_CLUSTER'. Determine the **optimal district/neighborhood** in ${dest} to use as a base.
    Goal: Minimize travel times to the sights while respecting the vibe.`;
  } else {
    geoMode = "ROUNDTRIP (Hub Finder)";
    const stops = logistics.roundtrip.stops.map(s => s.location).join(' -> ');
    taskDescription = `Route: ${stops}.
    Region: ${logistics.roundtrip.region}.
    Task: Identify the best strategic overnight stops (Hubs) along this route.
    **CRITICAL:** For major cities (e.g. Munich, Hamburg), you **MUST specify the District/Neighborhood** (e.g. 'Munich - Schwabing') that is closest to the active sights/activities. Do not just output the city name.`;
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
2.  **Granularity Rule:** If a target is a large city (>100k inhabitants), providing a generic city name is a FAILURE. You must pinpoint the optimal district.
3.  **Logistics Check:** * If Car: Suggest areas with parking / outskirts or specific districts with good connections. Avoid pedestrian zones.
    * If Train/Flight: Suggest Central Station or City Center proximity.
4.  **Vibe Match:** Match the user's vibe (${userInputs.vibe}) with the district (e.g. "Hipster" -> Arts District, "Quiet" -> Suburbs).

# OUTPUT
Recommend 1-2 specific areas/hubs that are strategically perfect.`;

  const outputSchema = {
    "_thought_process": "String (Analyze Sights Distribution & Logistics. Explain why this District?)",
    "recommended_hubs": [
      {
        "hub_name": "String (Name of City OR Specific District, e.g. 'Berlin - Mitte' - MANDATORY for cities)",
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
// --- END OF FILE 87 Zeilen ---