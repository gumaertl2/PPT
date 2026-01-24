// 24.01.2026 19:40 - REFACTOR: Migrated to Payload Pattern.
// Logic moved to 'prepareChefPlanerPayload.ts'. Template is now logic-free.
// Maintains exact Output Schema & Instructions from V40.
// src/core/prompts/templates/chefPlaner.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildChefPlanerPrompt = (payload: any): string => {
  const { context, meta } = payload;

  // 1. ROLE DEFINITION
  // Feedback is now injected via meta property from Preparer
  const role = `You are the **Lead Travel Architect** ("Chef-Planer").
Your task is to analyze the trip inputs, fix errors, and establish a strategic foundation.${meta.feedbackSection}`;

  // 2. INSTRUCTIONS
  // We use the exact text from the original file, injecting variables from payload.meta
  const instructions = `# CRITICAL LOGISTICS INSTRUCTIONS
You must strictly adhere to the 'logistics_briefing':
1. **Stationary**: Ensure the search radius does not exceed the 'max_drive_time_day_hours' (round trip).
2. **Roundtrip**: Ensure the legs between stops are feasible within 'max_drive_time_leg_hours'. Respect 'max_hotel_changes'.
3. **Region Constraint**: If 'mandatory_region' is set, you MUST NOT suggest places outside of it.
4. **Target Count**: Aim for a strategy that yields approx. **${meta.target_sights_count}** candidates.
5. **Start/End**: Use 'start_location' and 'end_location' as fixed anchors.

# WORKFLOW STEPS
1. **ERROR SCAN**: Check for typos.
2. **VALIDATION**: Research official names for hotels/appointments.
3. **PLAUSIBILITY**: Check if the plan works with the given drive-time limits AND transport mode.
4. **BRIEFING**: Write instructions (field 'strategic_briefing') for the "Collector" agent.

# LANGUAGE
Generate ALL user-facing text in **${meta.targetLanguageName}**.`;

  // 3. OUTPUT SCHEMA (Exact Copy from V40)
  const outputSchema = {
    "_thought_process": [
      "String (Step 1: Verify Inputs & Logistics...)", 
      "String (Step 2: Check Feasibility...)",
      "String (Step 3: Define Strategy...)"
    ],
    "plausibility_check": "String (Assessment: Is the route/base feasible?) | null",
    
    "corrections": {
      "destination_typo_found": "Boolean",
      "corrected_destination": "String | null",
      "notes": [ "String" ]
    },

    "validated_appointments": [
      {
        "original_input": "String", "official_name": "String", "address": "String",
        "estimated_duration_min": "Integer"
      }
    ],
    "validated_hotels": [
      { "station": "String", "official_name": "String", "address": "String" }
    ],
    
    "strategic_briefing": {
      "search_radius_instruction": "String (Instruction for Collector based on logistics)", 
      "sammler_briefing": "String (Briefing for Collector: Focus on Strategy & Pet Needs)", // Key kept for Basis-Compatibility
      "itinerary_rules": "String"
    },
    
    "smart_limit_recommendation": { 
        "reasoning": "String (Why this count?)", 
        "value": "Integer (Target POI count)" 
    }
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "PROJECT CONTEXT")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'planning'])
    .build();
};
// --- END OF FILE 81 Zeilen ---