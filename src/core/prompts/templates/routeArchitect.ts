// 01.02.2026 19:15 - PROMPT OPTIMIZATION: English System Language & Logic Hardening.
// Preserved ALL legacy fields (map_waypoints, stages) & Integrity Rules.
// src/core/prompts/templates/routeArchitect.ts

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildRouteArchitectPrompt = (project: TripProject): string => {
  const { userInputs, analysis } = project;
  const { logistics, dates } = userInputs;

  // 1. STRATEGIC BRIEFING
  const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || "";

  // 2. USER ROUTE PREFERENCES
  const roundtripOptions = logistics.roundtripOptions || {};

  // Context for AI
  const contextData = {
    start_date: dates.start,
    end_date: dates.end,
    total_duration_days: dates.duration,
    arrival_type: (dates.arrival as any).type || 'car',
    logistics_mode: logistics.mode,
    // Base Constraints
    roundtrip_constraints: logistics.mode === 'mobil' ? logistics.roundtrip : null,
    // User Constraints
    user_waypoints: roundtripOptions.waypoints || "None",
    is_strict_route: roundtripOptions.strictRoute || false
  };

  // ROLE: English for better reasoning performance
  const role = `You are the **Chief Logistics Architect**. 
  Your task is to design logical, optimized Multi-Stop Routes (Roundtrips) for a given duration and region.
  You plan ONLY the overnight hubs (Sleeping Stations), not the daily activities.`;

  const instructions = `# MISSION
Develop 3 distinct route options for the specified duration.
The options must differ in "Vibe" (e.g., "The Classic", "Nature Pure", "Culture & History").

# LOGISTICS RULES (THE GOLDEN LAWS)
1. **Start & End:** Strictly observe fixed start/end points if defined in constraints.
2. **User Waypoints:** If "user_waypoints" are present:
   - If "is_strict_route" = true: You MUST include them (Mandatory).
   - If "is_strict_route" = false: Try to integrate them logically if they fit the flow.
3. **Pace & Flow:** Plan realistic driving distances. Max 4 hours pure driving time per leg/transfer.
4. **Duration Match:** The sum of 'nights' across all stages MUST exactly match 'total_duration_days'.
5. **Strategic Hubs:** Choose strategic overnight locations (Base Camps) from which to explore the area.
6. **Calculation (MANDATORY):** Estimate 'total_km' and 'total_drive_time' (pure driving) realistically.
7. **Traveling Salesman:** Optimize the sequence of stops to minimize "Zigzagging". The route must flow logically.

# CRITICAL DATA INTEGRITY (LOCATION NAMES)
The field \`location_name\` in \`stages\` is CRITICAL for downstream systems (Geocoding, Hotel Search).
1. **Concrete Cities Only:** You MUST output a specific city, town, or village name (e.g. "Heidelberg", "Freiburg im Breisgau").
2. ⛔️ **FORBIDDEN:** Do NOT use vague regional terms like "Region Stuttgart", "Schwarzwald Mitte", "Bodenseekreis".
3. **Resolution:** If the strategy suggests a region, pick the most strategic *Hub City* within that region as the \`location_name\`.

# OUTPUT SCHEMA (V40 Standard)
Create a JSON object with key "routes".
Each option needs:
- \`title\`: Creative Title.
- \`description\`: Short vibe description.
- \`total_km\`: Estimated total kilometers (Number).
- \`total_drive_time\`: Estimated pure driving time in hours (Number).
- \`hotel_changes\`: Number of hotel switches (Number).
- \`map_waypoints\`: List of location names for map pins (Array of Strings).
- \`stages\`: Array of objects.
  - \`location_name\`: Specific City Name.
  - \`nights\`: Number of nights (Integer).
  - \`reasoning\`: Short reasoning (Why this stop?).`;

  // SCHEMA: Preserved 100% of your structure
  const outputSchema = {
    "_thought_process": "String (CRITICAL: Step-by-step reasoning on strategy, seasonality, routing logic & total duration check)",
    "routes": [
      {
        "title": "String (e.g. 'Alpine Classic')",
        "description": "String (Short vibe description)",
        "total_km": 450,
        "total_drive_time": 6.5,
        "hotel_changes": 2,
        "map_waypoints": ["München", "Garmisch", "Berchtesgaden"],
        "stages": [
          {
            "location_name": "München (NOT 'Region München'!)",
            "nights": 2,
            "reasoning": "Start point & Culture"
          },
          {
            "location_name": "Garmisch-Partenkirchen",
            "nights": 2,
            "reasoning": "Alps & Nature"
          },
          {
            "location_name": "Berchtesgaden",
            "nights": 2,
            "reasoning": "History & Views"
          }
        ]
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "LOGISTICS DATA")
    .withContext(strategicBriefing, "STRATEGIC BRIEFING")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'planning'])
    .build();
};
// --- END OF FILE 126 Zeilen ---