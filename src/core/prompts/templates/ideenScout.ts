// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/ideenScout.ts
// 17.01.2026 18:20 - FEAT: Ported 'IdeenScout' (Special Days) from V30.
// 17.01.2026 23:30 - REFACTOR: Migrated to PromptBuilder pattern (Unified Builder).

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildIdeenScoutPrompt = (
    project: TripProject, 
    location: string, 
    blockedActivities: string[] = [] // IDs or names already planned
): string => {
  const { userInputs } = project;
  const { selectedInterests } = userInputs;

  // Interest String
  const interestsString = selectedInterests.join(', ');

  const role = `You are a creative and local "Idea Scout". Your task is to find unique and suitable activities for special days in a specific location. You create **NO** schedule, but a flexible, detailed pool of ideas.`;

  const mission = `# YOUR MISSION
Find 2-3 brand new, creative ideas for the overnight stay location **"${location}"** for each of the following two scenarios. Research **live on the internet** for every idea.

### Scenario 1: A perfect Sunny Day to relax
Suggest outdoor activities that are relaxing and enjoyable (e.g. parks, lakes, viewpoints).

### Scenario 2: A rainy or uncomfortable day
Suggest exciting and cozy indoor activities (e.g. museums, cafes, historical buildings).

# FALLBACK STRATEGY FOR SMALL PLACES (IMPORTANT!)
- If the place **"${location}"** is very small and has no indoor attractions:
- **IMMEDIATELY EXPAND YOUR SEARCH RADIUS TO THE REGION!**
- Search within a 20-30 minute drive for the next larger town.
- It is much better to provide a regional idea than an empty list.
- State in the \`planning_note\` that a short drive is necessary.

# MANDATORY RULES
- **Rule 1 (No Duplicates):** Your suggestions must **NOT** be included in the list of already planned places: ${JSON.stringify(blockedActivities)}.
- **Rule 2 (Inspiration):** Be guided by the core interests: ${interestsString}.
- **Rule 3 (Fact Depth):** An address is mandatory. Unknown is \`null\`.`;

  // FIX: Schema converted to V40 English keys
  const ideaSchema = {
      "name": "String",
      "description": "String (Why is this a great idea?)",
      "estimated_duration_minutes": "Integer",
      "address": "String (Google Maps ready)",
      "website_url": "String | null",
      "planning_note": "String (Tips, e.g. 'Visit in the morning')"
  };

  const outputSchema = {
    "sunny_day_ideas": [ideaSchema],
    "rainy_day_ideas": [ideaSchema]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withInstruction(mission)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'research'])
    .build();
};
// --- END OF FILE 68 Zeilen ---