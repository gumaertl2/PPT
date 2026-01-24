// 24.01.2026 19:00 - FIX: RESTORED FULL DATA SCHEMA.
// Re-added missing fields (website, logistics, priceLevel, reasoning) from V30 logic.
// Maintained 'Thinking-Safe' wrapper for Gemini 2.5.
// src/core/prompts/templates/anreicherer.ts

import { PromptBuilder } from '../PromptBuilder';
import { INTEREST_DATA } from '../../../data/interests';

export const buildAnreichererPrompt = (payload: any): string => {
  const builder = new PromptBuilder();

  // 1. Generate Whitelist from System Data (SSOT)
  const validCategories = Object.keys(INTEREST_DATA).join(', ');

  builder.withContext(`
# ROLE
You are a high-precision "Data Enricher". Your task is to enrich a list of places with verifiable facts and inspiring descriptions.

# GEO-CONTEXT & ROUTE (PRIORITY 1)
${payload.context.geo_context}

# STRATEGIC BRIEFING
${payload.context.strategic_guideline}

# CONSTRAINTS
Travel Period: ${payload.context.travel_period}
User Notes: ${payload.context.user_note}
  `);

  const candidatesList = JSON.stringify(payload.context.places_to_process, null, 2);

  builder.withInstruction(`
Process the following ${payload.meta.total_count} candidates${payload.meta.chunk_info}:

${candidatesList}

# INSTRUCTIONS & RULES
1. **ID Retention:** You MUST use the exact \`id\` from the input list.
2. **Completeness:** Return exactly one result object per input candidate.
3. **Coordinates:** Find exact Geo-Coordinates (lat/lng).
4. **Address:** Must be a navigable address.
5. **Structure:** Separate \`city\` and \`country\`.
6. **Strategy Focus:** Write the \`description\` and \`reasoning\` considering the Strategic Briefing.

# CATEGORY PROTOCOL (STRICT)
You MUST assign one of the following system IDs to the "category" field. 
**VALID CATEGORIES:** [${validCategories}]

*Mapping Rules:*
- Hiking/Walking -> 'sports' or 'nature'
- Camping/Hotel -> 'hotel'
- Eating/Drinking -> 'restaurant'
- Sightseeing -> 'culture_history' or 'museum' or 'architecture'

# OUTPUT FORMAT
Return a SINGLE valid JSON object with a "_thought_process" field and a "candidates" array.

Structure:
{
  "_thought_process": "Analyze strategy. Map categories. Verify addresses...",
  "candidates": [
    {
      "id": "MUST MATCH INPUT ID",
      "name": "Official Name",
      "city": "City Name",
      "country": "Country Name",
      "category": "VALID_CATEGORY_ID",
      "description": "Inspiring description (1-2 sentences)",
      "location": { "lat": 0.0, "lng": 0.0 },
      "address": "Navigable Address",
      "openingHours": "Summary for travel period (or 'n/a')",
      "website": "Official URL (or empty string)",
      "rating": 4.5,
      "ratingCount": 120,
      "duration": 90, 
      "priceLevel": "Free|Cheap|Moderate|Expensive",
      "logistics": "Parking info or Public Transport info",
      "reasoning": "Why fits this the strategy?"
    }
  ]
}
  `);

  return builder.build();
};
// --- END OF FILE 86 Zeilen ---