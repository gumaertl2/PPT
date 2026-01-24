// 24.01.2026 16:35 - FIX: PromptBuilder API compliance (zero-arg constructor, fluent 'with' methods).
// src/core/prompts/templates/anreicherer.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildAnreichererPrompt = (payload: any): string => {
  // FIX: Constructor takes no arguments
  const builder = new PromptBuilder();

  // FIX: Use 'withContext' instead of 'setContext'. Added Role here.
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

  // FIX: Use 'withInstruction' instead of 'setInstruction'.
  // Merged Output Format here to ensure build safety.
  builder.withInstruction(`
Process the following ${payload.meta.total_count} candidates${payload.meta.chunk_info}.
For each candidate, find:
1. Official Name & Category
2. Precise Address & Coordinates
3. Short, engaging description (max 2 sentences)
4. Opening Hours & Rating (if available)

# BATCH INTEGRITY PROTOCOL
- Verify the location against the provided GEO-CONTEXT.
- If a place is outside the region/route, mark it clearly or suggest the closest correct match.

# OUTPUT FORMAT
Return a JSON array of objects with this structure:
[{
  "id": "original_id",
  "name": "Official Name",
  "category": "Sight/Museum/etc.",
  "address": "Full Address",
  "location": { "lat": 0.0, "lng": 0.0 },
  "description": "Short text...",
  "rating": 4.5
}]
  `);

  return builder.build();
};
// --- END OF FILE 52 Zeilen ---