// 24.01.2026 12:15 - OPTIMIZATION: Hardened Prompt against "Lazy-Batching". Restricted CoT length.
// 24.01.2026 11:35 - REFACTOR: V40 Signature Update (Explicit Candidates Array & Chunking).
// 22.01.2026 22:45 - FIX: Enforced List-Mode via PromptBuilder.build(true) to allow JSON Array start '['.
// src/core/prompts/templates/anreicherer.ts
// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// 19.01.2026 18:40 - FIX: Migrated Output Schema to German V30 Keys & Added Strategic Briefing Context.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';
import { INTEREST_DATA } from '../../../data/interests';

/**
 * Das Ziel-Schema für einen Ort in V40 (English).
 */
const SIGHT_SCHEMA = {
  "id": "String (MUST match the exact ID from input list!)",
  "name": "String (Official Name)",
  "city": "String (City name only, no ZIP)",
  "country": "String (Country name)",
  "category": "String (MUST match one of the allowed whitelist values)",
  "description": "String (1-2 sentences, inspiring and tailored to user)",
  "location": {
    "lat": "Number (Latitude)",
    "lng": "Number (Longitude)"
  },
  "address": "String (Navigable address, without city name at start)",
  "openingHours": "String (Summary for travel period)",
  "website": "String (Official website or empty)",
  "rating": "Number (e.g. 4.7)",
  "ratingCount": "Number (Count of ratings)",
  "duration": "Number (Recommended visit duration in minutes)",
  "priceLevel": "String (Free, Cheap, Moderate, Expensive)",
  "logistics": "String (Parking, Public Transport info)",
  "reasoning": "String (Short reasoning why this fits the strategy)"
};

export const buildAnreichererPrompt = (
    project: TripProject, 
    candidates: any[], 
    currentChunk: number = 1, 
    totalChunks: number = 1
): string | null => {
    
    // Safety Check
    if (!candidates || candidates.length === 0) {
        return null;
    }

    const { userInputs, analysis } = project;
    const chunkingInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

    // 1. STRATEGIC BRIEFING (V40 English Key)
    const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                              (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                              "Enrich the places with helpful information.";

    // 2. CATEGORY WHITELIST
    const safeInterestData = INTEREST_DATA || {};
    const validCategories = Object.values(safeInterestData)
        .filter((cat: any) => !cat.isSystem) 
        .map((cat: any) => cat.id)
        .join(', ');

    // 3. DATA SOURCES (Directly from input args now)
    const candidatesList = candidates.map((p: any) => ({
        id: p.id,
        name: p.name || "Unknown Place"
    }));

    const dates = `${userInputs.dates.start} to ${userInputs.dates.end}`;

    // 4. PROMPT CONSTRUCTION via Builder
    const role = `You are a high-precision "Data Enricher" for travel guides. Your task is to enrich a list of places with verifiable facts.`;

    const contextData = {
        travel_period: dates,
        strategic_guideline: strategicBriefing,
        places_to_process: candidatesList 
    };

    const instructions = `# BATCH INTEGRITY PROTOCOL (CRITICAL)
- **Input Count:** You received ${candidatesList.length} places.
- **Output Count:** You MUST return exactly ${candidatesList.length} enriched objects.
- **No Skipping:** Do NOT stop after the first few items. Process the ENTIRE list.
- **Efficiency:** Keep your internal thoughts (_thought_process) extremely short to save resources.

# INSTRUCTIONS${chunkingInfo}
- **Rule 1 (ID Retention):** You MUST use the exact \`id\` from the input list in your result.
- **Rule 2 (Strategy Focus):** Write the \`description\` considering the "strategic_guideline".
- **Rule 3 (Structure):** Separate \`city\` and \`country\`.
- **Rule 4 (Coordinates):** Find exact Geo-Coordinates (lat/lng).
- **Rule 5 (Address):** The \`address\` field must contain a navigable address.
- **Rule 6 (Google Data):** Research current \`rating\` and \`ratingCount\`.

# CATEGORY PROTOCOL
Choose exactly ONE category for each place from this list:
**[${validCategories}]**`;

    const outputSchema = [ 
        { 
            ...SIGHT_SCHEMA,
            // Optimization: Strict length limit to prevent token explosion
            _thought_process: "String (MAX 5 WORDS! e.g. 'Valid place, data found')" 
        } 
    ];

    return new PromptBuilder()
        .withOS()
        .withRole(role)
        .withContext(contextData, "DATA BASIS (PROCESS ALL ITEMS)")
        .withInstruction(instructions)
        .withOutputSchema(outputSchema)
        .withSelfCheck(['basic', 'research'])
        // FIX: Enable List Mode (Start with '[')
        .build(true);
};
// --- END OF FILE 117 Zeilen ---