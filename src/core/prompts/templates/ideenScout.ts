// 03.02.2026 14:30 - FIX: Linked with Preparer via 'instruction_override'.
// Ensures the strict Wildcard command from the preparer is actually used in the prompt.
// src/core/prompts/templates/ideenScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildIdeenScoutPrompt = (
    projectOrPayload: any,
    tasksChunk?: any[],
    currentChunk: number = 1,
    totalChunks: number = 1
): string => {
  
  // 1. RESOLVE INPUT (Hybrid Support)
  let tasks = tasksChunk;
  let strategicBriefing = "";
  let chunkInfo = "";

  if (projectOrPayload.context && projectOrPayload.instructions) {
      // V40 Payload Mode
      const payload = projectOrPayload;
      tasks = payload.context.tasks_chunk || [];
      strategicBriefing = payload.context.strategic_briefing || "";
      // Try to get chunk info from payload context first
      if (payload.context.chunk_info) {
         chunkInfo = payload.context.chunk_info;
      }
  } else {
      // Legacy Project Mode
      const project = projectOrPayload as TripProject;
      tasks = tasksChunk || [];
      strategicBriefing = (project.analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || "";
  }

  // Fallback: Use function parameters for chunk info if not present in payload
  // This satisfies the TS usage check for currentChunk & totalChunks
  if (!chunkInfo && totalChunks > 1) {
      chunkInfo = ` (Block ${currentChunk}/${totalChunks})`;
  }

  // Safety Check
  if (!tasks || tasks.length === 0) {
      return "ERROR: No tasks provided for Idea Scout.";
  }

  // 2. BUILD TASK LIST (Batch Instruction)
  const taskInstructions = tasks.map((task: any) => {
      const blockedList = task.blocked && task.blocked.length > 0 
          ? `\n   - **ALREADY PLANNED (DO NOT REPEAT):** ${JSON.stringify(task.blocked)}` 
          : "";
      
      const interests = task.user_profile?.interests?.join(', ') || "General";
      const vibe = task.user_profile?.vibe || "Standard";

      // FIX: Use override from Preparer if available (contains the strict Wildcard command)
      const scenarioInstructions = task.instruction_override || `
1. **Scenario Sunny:** Find 2-3 outdoor ideas (Parks, Views, Activity). Must match Profile.
2. **Scenario Rainy:** Find 2-3 indoor ideas (Museums, Cafes, Wellness). Must match Profile.
3. **Scenario Wildcard:** Find 1 "Local Secret" (Surprise). **IGNORE PROFILE!** Search for something unique/weird/cult for this region.`;

      return `
### LOCATION: "${task.location}" (ID: ${task.id})
**Profile:** Interests [${interests}], Vibe [${vibe}]
${scenarioInstructions}
4. **Constraints:** ${blockedList}
5. **Fallback:** If "${task.location}" is too small, search in the surrounding region (20-30min drive).`;
  }).join('\n\n----------------\n\n');

  // 3. ROLE
  const role = `You are the **Inspiration Agent** and **Local Insider**.
  Your task is to find unique activities for a LIST of locations.
  You create **NO** schedule, but a flexible pool of ideas (Sun, Rain, Surprise).`;

  // 4. INSTRUCTIONS
  const promptInstructions = `# YOUR MISSION${chunkInfo}
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

  // 5. SCHEMA
  const ideaSchema = {
      "name": "String",
      "description": "String (Why is this a great idea?)",
      "category": "String (e.g. Nature, Culture, Secret)",
      "estimated_duration_minutes": "Integer",
      "address": "String (Google Maps ready)",
      "location": { "lat": "Number", "lng": "Number" },
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
            "wildcard_ideas": [ideaSchema]
        }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(strategicBriefing, "STRATEGIC GUIDELINE")
    .withInstruction(promptInstructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['research', 'planning'])
    .build();
};
// --- END OF FILE 116 Zeilen ---