// 05.02.2026 12:00 - NEW: GEO EXPANDER PROMPT.
// - Task: Explode a Center + Radius into a specific list of villages/towns.
// - Output: Pure JSON String Array.
// src/core/prompts/templates/geoExpander.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildGeoExpanderPrompt = (payload: any): string => {
  const { context } = payload;
  const center = context.center || "Unknown Location";
  const radius = context.radius || 20;

  const role = `You are an Expert Geographer and Surveyor.
  Your Goal: List EVERY single distinct settlement (Village, Town, City, Hamlet, "Ortsteil") within a ${radius}km radius of "${center}".`;

  const instruction = `# TASK
  1. Mentally simulate a map around **${center}**.
  2. Identify all surrounding locations within **${radius}km**.
  3. Be GRANULAR: Do not just list big cities. We explicitly need the **small villages** (e.g. if center is Maisach, we need Überacker, Gernlinden, Rottbach, Esting, etc.).
  4. Return them as a simple JSON Array of Strings.
  
  # OUTPUT FORMAT
  ["${center}", "Village A", "Town B", "Hamlet C", ...]
  
  # RULES
  - STRICTLY JSON only. No text before/after.
  - Include the center itself.
  - Sort alphabetically.
  - Limit to max 40 most relevant locations (prioritize close proximity over size).`;

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withInstruction(instruction)
    .build();
};
// --- END OF FILE 36 Zeilen ---