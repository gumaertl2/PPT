// 04.02.2026 13:10 - FIX: STRICT CATEGORY WHITELISTING.
// - Filtered out System-IDs (General, Special, Buffer) and Chapter-Types (Arrival, Budget).
// - Added Negative Constraints (Blacklist) to prevent Hallucinations.
// src/core/prompts/templates/anreicherer.ts

import { PromptBuilder } from '../PromptBuilder';
import { INTEREST_DATA } from '../../../data/interests';

export const buildAnreichererPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  const builder = new PromptBuilder();

  // 1. Generate Whitelist from System Data (SSOT)
  // FIX: Strict filtering. Only allow real POI categories.
  // Exclude: System flags (isSystem), Chapters (city_info, etc.), and Logistics (hotel, arrival).
  const allowedCategories = Object.values(INTEREST_DATA)
    .filter(cat => 
        !cat.isSystem && 
        !['ignored_places', 'city_info', 'travel_info', 'arrival', 'budget', 'hotel'].includes(cat.id)
    )
    .map(c => c.id);

  const validCategoriesString = allowedCategories.join(', ');

  builder.withRole(instructions.role || "You are the **Data Precision Expert** ('The Enricher'). Your job is to validate and enrich raw candidates with high-precision geo-data.");

  // 2. Context Injection
  const contextData = {
    region_context: context.search_region,
    target_language: context.target_language,
    progress: context.chunk_progress,
    input_candidates: context.candidates_list // The raw list to process
  };
  
  builder.withContext(contextData, "DATA CONTEXT");

  // 3. Instructions
  builder.withInstruction(`
# MISSION
${instructions.task}

# PROTOCOL A: THE ID PASS-THROUGH (CRITICAL)
You receive a list of candidates, each with a unique 'id'.
1. **IMMUTABLE ID:** You MUST return the EXACT 'id' from the input in your result.
2. **NO NEW IDs:** Do NOT generate new UUIDs. If you break the ID link, the data is lost.

# PROTOCOL B: GEO-PRECISION & VALIDATION
1. **Coordinates:** Find exact Lat/Lng. Do not estimate.
2. **Address:** Must be navigable (Street, Number, Zip, City).
3. **Region Check:** If the place is not in "${context.search_region}", set "valid": false.
4. **Hallucination Check:** If you cannot find the place with 99% certainty, set "valid": false.

# PROTOCOL C: CATEGORY MAPPING (STRICT)
Map the place to one of these SYSTEM IDs:
[${validCategoriesString}]

*Fallback Logic:*
- Castles, Ruins -> 'architecture'
- Art, History -> 'museum'
- Squares, Parks -> 'nature' (or 'districts')
- Swimming -> 'beach'
- Concerts -> 'nightlife'

# PROTOCOL D: CONTENT
- **Description:** Factual, 2 sentences. No marketing fluff.
- **Duration:** Estimate realistic visit duration in minutes.

# BLACKLIST (FORBIDDEN TERMS)
You are strictly FORBIDDEN from using the following terms as categories:
- ❌ "General" / "Allgemein"
- ❌ "Sondertage" / "Special"
- ❌ "Wildcard"
- ❌ "Sightseeing" (Use 'architecture' or 'districts' instead)
`);

  // 4. Output Schema (Object-based for PromptBuilder optimization)
  const outputSchema = {
    "_thought_process": "String (Verify ID match, check region validity...)",
    "results": [
      {
        "id": "String (MUST MATCH INPUT ID EXACTLY)",
        "valid": "Boolean",
        "category": "String (One of the Valid Categories)",
        "official_name": "String (Corrected official name)",
        "location": { "lat": "Number", "lng": "Number" },
        "address": "String (Full Address)",
        "description": "String (Short factual text)",
        "openingHours": "String (e.g. 'Daily 9-17')",
        "rating": "Number (Google Rating 1-5)",
        "user_ratings_total": "Number (Count)",
        "duration": "Number (Minutes)",
        "website": "String | null"
      }
    ]
  };

  builder.withOutputSchema(outputSchema);

  return builder.build();
};
// --- END OF FILE 95 Zeilen ---