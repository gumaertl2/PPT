// 28.01.2026 21:50 - FIX: Added 'location' { lat, lng } to schema to enable Map Pins for Ideas.
// 26.01.2026 17:45 - FEAT: IdeenScout Batch Update.
// src/core/prompts/templates/ideenScout.ts

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildIdeenScoutPrompt = (
    project: TripProject, 
    tasksChunk: any[], // List of hubs to process
    currentChunk: number = 1,
    totalChunks: number = 1
): string | null => {

  // Safety Check
  if (!tasksChunk || tasksChunk.length === 0) {
      return null;
  }

  const { userInputs, analysis } = project;
  const { selectedInterests } = userInputs;
  const interestsString = selectedInterests.join(', ');

  const chunkingInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

  // 1. STRATEGIC BRIEFING
  const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                            (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                            "";

  // 2. BUILD TASK LIST
  const taskInstructions = tasksChunk.map(task => {
      const blockedList = task.blocked && task.blocked.length > 0 
          ? `\n   - **ALREADY PLANNED (DO NOT REPEAT):** ${JSON.stringify(task.blocked)}` 
          : "";

      return `
### LOCATION: "${task.location}" (ID: ${task.id})
1. **Scenario Sunny:** Find 2-3 outdoor ideas (relaxing, parks, views).
2. **Scenario Rainy:** Find 2-3 indoor ideas (museums, cozy cafes).
3. **Constraints:** ${blockedList}
4. **Fallback:** If "${task.location}" is too small, search in the surrounding region (20-30min drive).`;
  }).join('\n\n----------------\n\n');

  const role = `You are a creative and local "Idea Scout". Your task is to find unique and suitable activities for special days for a LIST of locations. You create **NO** schedule, but a flexible, detailed pool of ideas.`;

  const instructions = `# YOUR MISSION${chunkingInfo}
Process the following locations and find alternative ideas for "Sunny" and "Rainy" days.
Research **live on the internet** for every idea.

# TASK LIST
${taskInstructions}

# MANDATORY RULES (APPLY TO ALL)
- **Rule 1 (No Duplicates):** Strictly respect the "ALREADY PLANNED" list for each location.
- **Rule 2 (Inspiration):** Be guided by the user interests: ${interestsString}.
- **Rule 3 (Fact Depth):** An address is mandatory. Unknown is \`null\`.
- **Rule 4 (Regional Fallback):** If a place has no indoor options, expand search radius immediately and note it.

# OUTPUT SCHEMA
Return a SINGLE valid JSON object.`;

  // FIX: Schema converted to V40 English keys & Batch Structure
  const ideaSchema = {
      "name": "String",
      "description": "String (Why is this a great idea?)",
      "estimated_duration_minutes": "Integer",
      "address": "String (Google Maps ready)",
      // FIX: Explicitly request coordinates so pins appear on the map
      "location": { "lat": "Number", "lng": "Number" },
      "website_url": "String | null",
      "planning_note": "String (Tips, e.g. 'Visit in the morning')"
  };

  // NEW: Results Array for Batch Processing
  const outputSchema = {
    "_thought_process": "String (Analyze locations & identify creative gaps)",
    "results": [
        {
            "id": "String (Must match Task ID)",
            "location": "String (City Name)",
            "sunny_day_ideas": [ideaSchema],
            "rainy_day_ideas": [ideaSchema]
        }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(strategicBriefing, "STRATEGIC GUIDELINE")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'research'])
    .build();
};
// --- END OF FILE 94 Zeilen ---