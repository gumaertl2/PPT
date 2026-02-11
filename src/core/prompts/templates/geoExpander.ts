// 10.02.2026 22:00 - FIX: Signature Mismatch. Updated to (project, context) pattern.
// 11.02.2026 21:30 - FIX: Redundant checks for location input.
// src/core/prompts/templates/geoExpander.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildGeoExpanderPrompt = (_project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  // FIX: Robustly detect input location.
  // Priority 1: Direct location_name (Standard)
  // Priority 2: candidates array (Manual injection fallback)
  
  let locations: string[] = [];
  let center = "";
  
  if (context.location_name) {
      locations = [context.location_name];
      center = context.location_name;
  } else if (context.candidates && Array.isArray(context.candidates) && context.candidates.length > 0) {
      locations = context.candidates;
      center = context.candidates[0];
  } else {
      locations = context.stops || [];
      center = "the route stops";
  }

  const radius = context.radius || 20;

  builder.withOS();

  builder.withRole(`
    You are the 'Geo-Expander'. Your job is to generate a list of relevant towns/places around **${center}** for a radius of **${radius} km**.
    
    ### RULES:
    1. **Valid Towns Only:** List real towns or districts that are worth visiting or have infrastructure (Restaurants/Hotels).
    2. **Radius Check:** Strictly adhere to the ${radius} km limit.
    3. **Duplicates:** Remove duplicates.
    4. **Output:** Return a JSON object with a 'candidates' array.
  `);

  builder.withContext({
    input_locations: locations,
    radius_km: radius,
    country: context.country || "Europe"
  });

  builder.withInstruction(`
    Identify the main towns and interesting villages within ${radius}km of: ${locations.join(', ')}.
    Return them as a simple list of names (e.g. ["Maisach", "Fürstenfeldbruck", "Olching"]).
  `);

  // FIX: Schema must match Orchestrator expectation: 'candidates'
  builder.withOutputSchema({
    candidates: ["String", "String", "String"]
  });

  return builder.build();
};
// --- END OF FILE 60 Zeilen ---