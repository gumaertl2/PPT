// 06.02.2026 21:20 - FEATURE: Added Geography Correction (City -> Country inference).
// 01.02.2026 17:20 - REFACTOR: Merged "Smart Brain" Logic with Legacy Features.
// src/core/prompts/templates/chefPlaner.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildChefPlanerPrompt = (payload: any): string => {
  const { context, meta } = payload;

  // 1. ROLE DEFINITION
  const role = `You are the **Lead Travel Architect** ("Chef-Planer").
Your task is to analyze the trip inputs, fix errors, validate feasibility (Reality Check), and establish a strategic foundation.${meta.feedbackSection || ''}`;

  // 2. INSTRUCTIONS
  const instructions = `# PHASE 1: REALITY CHECK & SEASONAL VALIDATION
Before planning, verify the fundamental logic:
1. **Season vs. Destination**: Check if the travel dates make sense for the destination (e.g. no beach holiday in winter, no hiking in monsoon).
2. **Group Dynamics**: Check if the program suits the travelers (Age, Kids, Seniors). Is the pace realistic?
3. **Plausibility**: If the user wants to drive 500km/day with kids, flag it in 'plausibility_check'.

# PHASE 2: CRITICAL LOGISTICS INSTRUCTIONS
You must strictly adhere to the 'logistics_briefing':
1. **Stationary**: Ensure the search radius does not exceed the 'max_drive_time_day_hours' (round trip).
2. **Roundtrip**: Ensure the legs between stops are feasible within 'max_drive_time_leg_hours'. Respect 'max_hotel_changes'.
3. **Region Constraint**: If 'mandatory_region' is set, you MUST NOT suggest places outside of it.
4. **Target Count**: Aim for a strategy that yields approx. **${meta.target_sights_count}** candidates.
5. **Start/End**: Use 'start_location' and 'end_location' as fixed anchors.

# PHASE 3: WORKFLOW STEPS
1. **ERROR SCAN**: Check for typos in destination names.
2. **GEOGRAPHY FIX**: Check if the user entered a **City** (e.g. "Kopenhagen", "Munich") but the system expects a **Country**.
   - IF destination is a City, identify the correct Country (e.g. "Dänemark") and fill 'inferred_country'.
3. **VALIDATION**: Research official names for user-provided hotels or fixed appointments.
4. **STRATEGY**: Write specific instructions (field 'strategic_briefing') for the "Collector" agent.

# LANGUAGE
Generate ALL user-facing text in **${meta.targetLanguageName}**.`;

  // 3. OUTPUT SCHEMA
  const outputSchema = {
    "_thought_process": [
      "String (Step 1: Reality Check - Season & Group...)", 
      "String (Step 2: Verify Logistics & Geography Check...)",
      "String (Step 3: Define Strategy...)"
    ],
    "plausibility_check": "String (Assessment: Is the route/base feasible? Mention Season/Weather risks here) | null",
    
    "corrections": {
      "destination_typo_found": "Boolean",
      "corrected_destination": "String | null",
      "inferred_country": "String (The correct country if missing, e.g. 'Dänemark') | null",
      "inferred_region": "String (The region/state if relevant, e.g. 'Hovedstaden') | null",
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
      "sammler_briefing": "String (Context for Basis-Agent: 'Focus on X because of Y')", 
      "itinerary_rules": "String (e.g. 'Max 2 major sights/day')"
    },
    
    "smart_limit_recommendation": { 
        "reasoning": "String (Why this count?)", 
        "value": "Integer (Target POI count)" 
    }
  };

  return new PromptBuilder()
    .withOS() // Enforces JSON-Only
    .withRole(role)
    .withContext(context, "PROJECT CONTEXT")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'planning'])
    .build();
};
// --- END OF FILE 105 Zeilen ---