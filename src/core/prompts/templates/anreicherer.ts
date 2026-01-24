// 24.01.2026 17:00 - FIX: Architecture Compliance. 
// 1. Injected missing candidate list.
// 2. Added '_thought_process' field to JSON schema to contain AI reasoning within valid JSON.
// src/core/prompts/templates/anreicherer.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildAnreichererPrompt = (payload: any): string => {
  const builder = new PromptBuilder();

  builder.withContext(`
# ROLE
You are the 'Data Specialist' (Anreicherer). Your task is to verify and enrich a list of candidates with hard facts.

# GEO-CONTEXT & ROUTE (PRIORITY 1)
${payload.context.geo_context}

# STRATEGIC GUIDELINE
${payload.context.strategic_guideline}

# CONSTRAINTS
Travel Period: ${payload.context.travel_period}
User Notes: ${payload.context.user_note}
  `);

  // CRITICAL FIX: Explicitly inject the candidates list into the prompt text!
  const candidatesList = JSON.stringify(payload.context.places_to_process, null, 2);

  builder.withInstruction(`
Process the following ${payload.meta.total_count} candidates${payload.meta.chunk_info}:

${candidatesList}

For each candidate, find:
1. Official Name & Category
2. Precise Address & Coordinates
3. Short, engaging description (max 2 sentences)
4. Opening Hours & Rating (if available)

# BATCH INTEGRITY PROTOCOL
- Verify the location against the provided GEO-CONTEXT.
- If a place is outside the region/route, mark it clearly or suggest the closest correct match.

# OUTPUT FORMAT
Return a SINGLE valid JSON object with a "_thought_process" field and a "candidates" array.
Structure:
{
  "_thought_process": "Analyze the Geo-Context and Strategy here. Verify which candidates match the route...",
  "candidates": [
    {
      "id": "original_id",
      "name": "Official Name",
      "category": "Sight/Museum/etc.",
      "address": "Full Address",
      "location": { "lat": 0.0, "lng": 0.0 },
      "description": "Short text...",
      "rating": 4.5
    }
  ]
}
  `);

  return builder.build();
};
// --- END OF FILE 62 Zeilen ---