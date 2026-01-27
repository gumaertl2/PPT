// 27.01.2026 17:35 - FIX: Added 'user_ratings_total' to Schema.
// STRICT MAPPING: Instructions now only reference keys existing in INTEREST_DATA.
// src/core/prompts/templates/anreicherer.ts

import { PromptBuilder } from '../PromptBuilder';
import { INTEREST_DATA } from '../../../data/interests';

export const buildAnreichererPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  const builder = new PromptBuilder();

  // 1. Generate Whitelist from System Data (SSOT)
  const validCategories = Object.keys(INTEREST_DATA).join(', ');

  builder.withRole(instructions.role || "You are a high-precision Data Enricher.");

  // 2. Context Injection
  builder.withContext(`
# GEO-CONTEXT (SEARCH REGION)
${context.search_region}

# TARGET LANGUAGE
${context.target_language}

# TASK PROGRESS
${context.chunk_progress}
  `, "CONTEXT");

  // 3. Candidates
  const candidatesList = JSON.stringify(context.candidates_list, null, 2);

  builder.withInstruction(`
# INPUT CANDIDATES
${candidatesList}

# MISSION
${instructions.task}

# RULES & PROTOCOLS
1. **ID Integrity:** You MUST use the exact \`id\` from the input list.
2. **Geo-Precision:** Find exact Geo-Coordinates (lat/lng).
3. **Address:** Must be a navigable address.
4. **Validation:** If a place implies a specific region but is found elsewhere, mark valid: false.
5. **Neutrality:** Write factual descriptions.

# CATEGORY PROTOCOL (STRICT)
You MUST assign one of the following system IDs to the "category" field.
**VALID CATEGORIES:** [${validCategories}]

*Mapping Logic (Fallbacks):*
- Castles, Monuments, Churches, Ruins -> 'architecture'
- History, Art, Exhibitions -> 'museum'
- Squares, Streets, Areas -> 'districts'
- Walking, Hiking, Views -> 'nature' (or 'parks' if urban)
- Swimming, Lakes -> 'beach' (or 'nature')
- Concerts, Clubs -> 'nightlife'
- If it is a specific venue/store -> check if 'shopping' fits.

# OUTPUT SCHEMA
Return a SINGLE valid JSON object.

Structure:
{
  "_thought_process": "Verify location. Map category (e.g. Cathedral -> architecture)...",
  "results": [
    {
      "id": "MATCHING_INPUT_ID",
      "valid": true,
      "category": "VALID_CATEGORY_ID",
      "official_name": "Corrected Name",
      "location": { "lat": 0.0, "lng": 0.0 },
      "address": "Street 1, 12345 City",
      "description": "Factual description (max 2 sentences).",
      "openingHours": "Daily 9-17 (approx)",
      "rating": 4.5,
      "user_ratings_total": 120,
      "website": "www.example.com"
    }
  ]
}
  `);

  return builder.build();
};
// --- END OF FILE 75 Zeilen ---