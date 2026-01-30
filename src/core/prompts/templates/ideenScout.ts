// 01.02.2026 21:10 - PROMPT REWRITE: Batch-Mode with Wildcard Feature.
// Processes multiple locations (Hubs) and generates Sun/Rain/Surprise ideas.
// src/core/prompts/templates/ideenScout.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildIdeenScoutPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  
  // Batch Context: The 'PayloadBuilder' usually puts the sliced items into 'tasks_chunk'
  // Fallback: If 'context' IS the array (legacy behavior), handle it.
  const tasksChunk = Array.isArray(context) ? context : (context.tasks_chunk || []);

  // Safety Check
  if (!tasksChunk || tasksChunk.length === 0) {
      return "ERROR: No tasks provided for Idea Scout.";
  }

  // 1. BUILD TASK LIST (Batch Instruction)
  const taskInstructions = tasksChunk.map((task: any) => {
      const blockedList = task.blocked && task.blocked.length > 0 
          ? `\n   - **ALREADY PLANNED (DO NOT REPEAT):** ${JSON.stringify(task.blocked)}` 
          : "";
      
      const interests = task.user_profile?.interests?.join(', ') || "General";
      const vibe = task.user_profile?.vibe || "Standard";

      return `
### LOCATION: "${task.location}" (ID: ${task.id})
**Profile:** Interests [${interests}], Vibe [${vibe}]
1. **Scenario Sunny:** Find 2-3 outdoor ideas (Parks, Views, Activity). Must match Profile.
2. **Scenario Rainy:** Find 2-3 indoor ideas (Museums, Cafes, Wellness). Must match Profile.
3. **Scenario Wildcard:** Find 1 "Local Secret" (Surprise). **IGNORE PROFILE!** Search for something unique/weird/cult for this region.
4. **Constraints:** ${blockedList}
5. **Fallback:** If "${task.location}" is too small, search in the surrounding region (20-30min drive).`;
  }).join('\n\n----------------\n\n');

  // 2. ROLE
  const role = instructions?.role || `You are the **Inspiration Agent** and **Local Insider**.
  Your task is to find unique activities for a LIST of locations.
  You create **NO** schedule, but a flexible pool of ideas (Sun, Rain, Surprise).`;

  // 3. INSTRUCTIONS
  const promptInstructions = `# YOUR MISSION
Process the following locations and find alternative ideas.
Research **live on the internet** for every idea.

# TASK LIST
${taskInstructions}

# MANDATORY RULES
- **Rule 1 (No Duplicates):** Strictly respect the "ALREADY PLANNED" list for each location.
- **Rule 2 (Geo-Data):** You MUST provide Lat/Lng coordinates for every idea (Critical for Map Pins).
- **Rule 3 (Wildcard):** The Wildcard MUST be a contrast to the user's usual interests.

# OUTPUT SCHEMA
Return a SINGLE valid JSON object.`;

  // 4. SCHEMA (V40 Batch + Wildcard)
  const ideaSchema = {
      "name": "String",
      "description": "String (Why is this a great idea?)",
      "category": "String (e.g. Nature, Culture, Secret)",
      "estimated_duration_minutes": "Integer",
      "address": "String (Google Maps ready)",
      "location": { "lat": "Number", "lng": "Number" }, // CRITICAL for Map Pins
      "website_url": "String | null",
      "planning_note": "String (Tips, e.g. 'Visit in the morning')"
  };

  const outputSchema = {
    "_thought_process": "String (Analyze locations, check blocked items, find gaps...)",
    "results": [
        {
            "id": "String (MUST MATCH INPUT TASK ID)",
            "location": "String (City Name)",
            "sunny_day_ideas": [ideaSchema],
            "rainy_day_ideas": [ideaSchema],
            "wildcard_ideas": [ideaSchema] // New Wildcard Array
        }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context.strategic_briefing || "", "STRATEGIC GUIDELINE")
    .withInstruction(promptInstructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['creative', 'research'])
    .build();
};
// --- END OF FILE 98 Zeilen ---