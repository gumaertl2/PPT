// 24.01.2026 15:00 - REFACTOR: Lean Anreicherer Template (Enricher).
// Consumes pre-processed payload from 'prepareAnreichererPayload'.
// Implements 'BATCH INTEGRITY' to ensure high-quality fact-checking.
// src/core/prompts/templates/anreicherer.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildAnreichererPrompt = (payload: any): string => {
  const builder = new PromptBuilder('Anreicherer / Enricher');

  builder.setContext(`
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

  builder.setInstruction(`
Process the following ${payload.meta.total_count} candidates${payload.meta.chunk_info}.
For each candidate, find:
1. Official Name & Category
2. Precise Address & Coordinates
3. Short, engaging description (max 2 sentences)
4. Opening Hours & Rating (if available)

# BATCH INTEGRITY PROTOCOL
- Verify the location against the provided GEO-CONTEXT.
- If a place is outside the region/route, mark it clearly or suggest the closest correct match.
  `);

  builder.setOutputFormat(`
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
// --- END OF FILE 53 Zeilen ---