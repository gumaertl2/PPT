// src/core/prompts/templates/geoExpander.ts
// 16.02.2026 17:15 - UPDATE: PASS-THROUGH MODE.
// - Logic: Disables the "Atomic Splitting" of locations.
// - Logic: Returns the input location as the SINGLE candidate.
// - Logic: Prevents the workflow from looping through small villages.

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildGeoExpanderPrompt = (_project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  // We take the destination and treat it as a single block
  const location = context?.location_name || "Region";

  builder.withOS();

  builder.withRole(`
    You are a LOCATION NORMALIZER.
    Input: "${location}"
    
    ### MISSION:
    Your ONLY job is to return the input location as a single, clean candidate.
    
    ### RULE:
    - DO NOT search for neighbors.
    - DO NOT split the region into villages.
    - DO NOT expand the radius.
    - We want ONE search for the whole region.
  `);

  builder.withInstruction(`
    Return exactly this JSON:
    {
      "_thought_process": "Pass-through mode active. Returning input as single candidate.",
      "candidates": ["${location}"]
    }
  `);

  builder.withOutputSchema({
    _thought_process: "Log confirmation",
    candidates: ["The Input Location"]
  });

  return builder.build();
};
// --- END OF FILE 44 Lines ---