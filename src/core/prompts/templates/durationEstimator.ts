// 23.01.2026 16:00 - FIX: Synchronized Schema with CoT Instruction (added _thought_process).
// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/durationEstimator.ts
// 17.01.2026 18:00 - FEAT: Ported 'DurationEstimator' from V30.
// 17.01.2026 23:40 - REFACTOR: Migrated to PromptBuilder pattern (Unified Builder).

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildDurationEstimatorPrompt = (
    project: TripProject, 
    activityName: string, 
    location: string
): string => {
  const { userInputs } = project;
  const { pace } = userInputs;

  const role = `You are an expert in time management for travel. Your task is to estimate realistic durations for activities.`;

  const contextData = {
    activity: activityName,
    location: location,
    travel_pace: pace // 'relaxed', 'moderate', 'fast'
  };

  const instructions = `# TASK
Estimate the recommended duration for the activity **"${activityName}"** in **"${location}"**.

# RULES
1.  **Context:** Consider the type of activity (Museum needs more time than a viewpoint).
2.  **Pace:**
    * "relaxed": Add +30% buffer.
    * "fast": Subtract 10% (efficient visit).
3.  **Transit:** Do NOT include travel time to the location, only the stay itself.

# FALLBACK
If the activity is completely unknown, estimate a standard duration based on the name (e.g. "Park" = 60 min).`;

  // FIX: Schema converted to V40 English keys & CoT added
  const outputSchema = {
    "_thought_process": "String (Analyze activity type & pace context)",
    "estimation": {
      "duration_minutes": "Integer (Recommended stay in minutes)",
      "reasoning": "String (Short explanation, e.g. 'Large museum, relaxed pace')"
    }
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "ACTIVITY DATA")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic'])
    .build();
};
// --- END OF FILE 65 Zeilen ---