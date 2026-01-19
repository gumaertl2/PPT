// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/durationEstimator.ts
// 19.01.2026 13:45 - FIX: Restored V30 Legacy Schema (German Keys) for DurationEstimator.
// 17.01.2026 15:00 - FEAT: Initial Logic for Roundtrip Duration Estimation.
// 18.01.2026 00:55 - REFACTOR: Migrated to PromptBuilder pattern.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildDurationEstimatorPrompt = (project: TripProject): string => {
  const { userInputs } = project;
  const { logistics, dates, pace, selectedInterests } = userInputs;

  // Only relevant for Roundtrips
  const stops = logistics.roundtrip?.stops || [];
  const totalDays = dates.duration;

  // Context Data
  const contextData = {
    total_trip_duration_days: totalDays,
    pace_preference: pace, // fast, balanced, relaxed
    travel_party: userInputs.travelers,
    interests: selectedInterests,
    planned_stops: stops.map(s => s.location)
  };

  const role = `You are the "Duration Estimator" (Time Strategist). Your task is to calculate the ideal duration of stay (in nights) per stop for a given roundtrip.`;

  const instructions = `# TASK
Distribute the available ${totalDays} travel days sensibly across the ${stops.length} stations.

# RULES
1.  **Pace:** Respect the travel pace '${pace}'. 
    - 'relaxed': Fewer location changes, longer stays.
    - 'fast': Efficient route, shorter stops.
2.  **Interests:** Places that match the interests (${selectedInterests.join(', ')}) well get more time.
3.  **Realism:** Consider travel times between locations (roughly estimated).
4.  **Sum:** The sum of nights MUST match exactly (or -1 day for travel time) the total duration.

# INPUT
Route: ${stops.map(s => s.location).join(' -> ')}
Total Duration: ${totalDays} Days`;

  // FIX: Schema converted to V40 English keys
  const outputSchema = {
    "estimation": {
      "total_days_planned": "Integer",
      "stops": [
        {
          "location": "String (Name from Input)",
          "recommended_nights": "Integer",
          "reasoning": "String (Short reasoning why this long/short)"
        }
      ],
      "feasibility_check": "String (Is the route feasible in this time? 'Yes', 'Tight' or 'No')"
    }
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "ROUTE DATA")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['planning']) 
    .build();
};
// --- END OF FILE 61 Zeilen ---