// 10.02.2026 22:00 - FIX: Signature Mismatch. Updated to (project, context) pattern.
// 11.02.2026 20:00 - FIX: Output Schema must be 'candidates' (Array), NOT 'towns'.
// src/core/prompts/templates/geoExpander.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildGeoExpanderPrompt = (_project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  // Input: Either a single location (AdHoc) or a list (Route)
  const isAdHoc = !!context.location_name;
  const locations = isAdHoc ? [context.location_name] : (context.stops || []);
  const center = isAdHoc ? context.location_name : "the route stops";
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
// --- END OF FILE 45 Zeilen ---