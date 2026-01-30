// 01.02.2026 20:00 - PROMPT REWRITE: "Chief Itinerary Architect".
// Implements strict ID Pass-through to ensure ResultProcessor linkage.
// Focus on Geo-Clustering and Logical Flow.
// src/core/prompts/templates/tourGuide.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildTourGuidePrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  // 1. DATA PREPARATION (Format for AI visibility)
  // The Preparer must provide 'sights_list' with { id, name, location, category }
  const sightsData = Array.isArray(context.sights_list) 
    ? context.sights_list.map((s: any) => `- [ID: ${s.id}] ${s.name} (${s.category || 'General'}) @ ${s.location?.lat || '?'},${s.location?.lng || '?'}`).join('\n')
    : "No sights provided.";

  const constraintsText = `
  - Duration: ${context.duration_days} Days
  - Pace: ${context.preferences?.pace || 'Moderate'}
  - Fixed Appointments: ${JSON.stringify(context.constraints?.fixed_appointments || [])}
  `;

  // 2. ROLE
  const role = instructions.role || `You are the **Chief Itinerary Architect** ("The Tour Guide").
  Your task is to organize a chaotic list of sights into a logical, flow-optimized day-by-day itinerary.
  You maximize experience quality and minimize travel stress.`;

  // 3. INSTRUCTIONS
  const promptInstructions = `# INPUT SIGHTS (POOL)
${sightsData}

# LOGISTICS & PREFERENCES
${constraintsText}

# MISSION
1. **Clustering:** Group nearby sights into the same day to minimize travel time.
2. **Logic & Flow:** Arrange the daily order logically (e.g. Start at the castle on the hill, walk down to the old town).
3. **Pacing:** Respect the user's pace. 
   - Relaxed: Max 2-3 major sights/day.
   - Intense: Pack as much as possible.
4. **Mandatory:** Include ALL fixed appointments at their specific times.

# CRITICAL PROTOCOL: ID INTEGRITY
You are working with database objects.
1. **Pass-through:** When scheduling a sight, you **MUST** return its exact \`sight_id\` from the Input list.
2. **No Hallucinations:** Do not invent new sights. Only use what is in the pool.
3. **Leftovers:** If a sight strictly does not fit the timeline, list its ID in \`unassigned_sight_ids\`.

# OUTPUT FORMAT
Return a strictly valid JSON object.`;

  // 4. SCHEMA
  const outputSchema = {
    "_thought_process": "String (Step 1: Geo-Clustering. Step 2: Assign days. Step 3: Optimize daily flow...)",
    "itinerary_days": [
      {
        "day_index": "Number (1-based)",
        "title": "String (Thematic Title of the day)",
        "summary": "String (Brief explanation of the flow)",
        "activities": [
          {
            "sight_id": "String (MUST MATCH INPUT ID EXACTLY)",
            "time_slot": "String (e.g. '09:00 - 11:00')",
            "duration_min": "Number (Estimate)",
            "travel_time_after_min": "Number (Estimate to next stop)",
            "reasoning": "String (Why this order?)"
          }
        ]
      }
    ],
    "unassigned_sight_ids": ["String (IDs of sights that could not be scheduled)"]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "TRIP CONTEXT")
    .withInstruction(promptInstructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['logic', 'planning'])
    .build();
};
// --- END OF FILE 88 Zeilen ---