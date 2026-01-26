// 26.01.2026 18:15 - FIX: TourGuide Template Update.
// Consumes pre-processed payload from 'prepareTourGuidePayload'.
// Now utilizes GEO-COORDINATES provided in context for better clustering.
// src/core/prompts/templates/tourGuide.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildTourGuidePrompt = (payload: any): string => {
  // 1. Unpack Payload (from Preparer)
  const { context, instructions } = payload;
  const sightsForPrompt = context.sights;

  // 2. Setup Builder
  // We use the Role defined in the Preparer (or fallback if missing)
  const role = instructions?.role || `You are an experienced Travel Guide Author and Geographic Analyst. Your strength is transforming a loose collection of places into a compelling and logical narrative that a traveler can use for self-guided exploration.

Your task is to take the **entire list** of sights and organize them into geographically coherent "Exploration Tours". You create **NO** time schedule, but a purely spatial structure.`;

  const promptInstructions = `# WORK STEPS
1.  **Analysis:** Analyze the geographic location (Lat/Lng) of all places in the provided list.
2.  **Clustering:** Group the places into meaningful, dense clusters (e.g., by neighborhood). Aim for 2-5 clusters.
3.  **Naming:** Give each cluster a creative title (e.g., "Tour 1: The Historic Heart").
4.  **Sequencing:** Arrange the sights **within each cluster** in a logical order for a walk.
5.  **JSON Creation:** Create the final JSON object.

# MANDATORY RULES
- **Rule 1 (Completeness):** EVERY sight from the input list MUST appear in exactly ONE tour.
- **Rule 2 (No Timing):** Do NOT add times or time slots.
- **Rule 3 (ID Integrity):** Use the exact \`id\` values from the input list.`;

  // FIX: Schema converted to V40 English keys & CoT added (Preserved from original)
  const outputSchema = {
    "_thought_process": "String (Geo-Analysis & Clustering Strategy)",
    "guide": {
      "title": "String (e.g. 'Your personal guide to Paris')",
      "intro": "String (Short, inviting introduction)",
      "tours": [
        {
          "tour_title": "String",
          "tour_description": "String (2-3 sentences about the area)",
          "suggested_order_ids": ["String (ID of the sight)"]
        }
      ]
    }
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(sightsForPrompt, "DATA BASIS (Complete list of all ideas with Geo-Coords)")
    .withInstruction(promptInstructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'planning'])
    .build();
};
// --- END OF FILE 62 Zeilen ---