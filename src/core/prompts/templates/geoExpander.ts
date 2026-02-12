// 13.02.2026 14:00 - FIX: ATOMIC CITY PROTOCOL.
// - Logic: Prevents fragmentation of small/medium towns into districts.
// - Logic: Forces "One City = One Search Term" unless it's a major metropolis (>500k).
// src/core/prompts/templates/geoExpander.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

export const buildGeoExpanderPrompt = (_project: TripProject, context: any): string => {
  const builder = new PromptBuilder();
  
  // FIX: Robustly detect input location.
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
    You are the 'Geo-Expander'. Your job is to generate a list of relevant search areas around **${center}**.
    
    ### ATOMIC CITY PROTOCOL (CRITICAL):
    1. **METROPOLIS CHECK:** Is the target a major international city (> 500k inhabitants, e.g. Munich, Berlin, London)?
       - **YES:** Split it into relevant tourist districts (e.g. "Munich Schwabing", "Munich Center").
       - **NO:** TREAT IT AS ATOMIC. Do **NOT** split small towns or regional centers into districts (e.g. do NOT split "Fürstenfeldbruck" into "Buchenau/Kloster"). Return ONLY the main town name.
    
    ### REASONING:
    - Splitting small towns hides results (e.g. a restaurant in Buchenau is listed under "Fürstenfeldbruck").
    - We need the BROADEST administrative definition for small towns.
  `);

  builder.withContext({
    input_locations: locations,
    radius_km: radius,
    country: context.country || "Europe"
  });

  builder.withInstruction(`
    Identify the search areas within ${radius}km of: ${locations.join(', ')}.
    
    **EXECUTION:**
    - If ${center} is a small/medium town -> Return just ["${center}"].
    - If radius is large (>10km) -> Add *other* independent towns nearby (e.g. "Olching", "Maisach"), but DO NOT split the main town.
    
    Return as a simple list of names.
  `);

  builder.withOutputSchema({
    candidates: ["String", "String", "String"]
  });

  return builder.build();
};
// --- END OF FILE 65 Zeilen ---