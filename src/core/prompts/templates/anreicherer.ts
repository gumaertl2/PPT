// 24.01.2026 20:00 - FIX: FORCE SYNC. Using default values to ensure signature compatibility.
// src/core/prompts/templates/anreicherer.ts

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';
import { INTEREST_DATA } from '../../../data/interests';

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

// FIX: We use DEFAULT VALUES to satisfy any caller (1, 2 or 3 args).
export const buildAnreichererPrompt = (
    project: TripProject, 
    feedback: string = "", 
    _options: any = {}
): string => {
    const { userInputs, analysis } = project;

    const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                              (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                              "Enrich the places with helpful information.";

    const safeInterestData = INTEREST_DATA || {};
    const validCategories = Object.values(safeInterestData)
        .filter((cat: any) => !cat.isSystem) 
        .map((cat: any) => cat.id)
        .join(', ');

    let rawCandidates = [];
    
    // Check batching logic
    if ((project.data.places as any).current_batch && Array.isArray((project.data.places as any).current_batch)) {
        rawCandidates = (project.data.places as any).current_batch.map((p: any) => ({
            id: p.id,
            name: p.name || "Unknown Place"
        }));
    } else {
        // Fallback logic
        rawCandidates = Object.values(project.data.places || {}).flat().map((p: any) => ({
            id: p.id,
            name: p.name || "Unknown Place"
        }));
    }

    const candidatesList = rawCandidates.length > 0 
        ? rawCandidates 
        : [{ id: "dummy-example-id", name: "Example Sight" }];

    const dates = `${userInputs.dates.start} to ${userInputs.dates.end}`;

    const role = `You are a high-precision "Data Enricher" for travel guides. Your task is to enrich a list of places with verifiable facts and inspiring descriptions.`;

    const contextData = {
        travel_period: dates,
        strategic_guideline: strategicBriefing,
        places_to_process: candidatesList,
        user_feedback: feedback
    };

    const instructions = `# INSTRUCTIONS
- **Rule 1 (ID Retention):** You MUST use the exact \`id\` from the input list in your result.
- **Rule 2 (Completeness):** Your result must contain exactly as many objects as the input list.
- **Rule 3 (Strategy Focus):** Write the \`description\` considering the "strategic_guideline".
- **Rule 4 (Structure):** Separate \`city\` and \`country\`.
- **Rule 5 (Coordinates):** Find exact Geo-Coordinates (lat/lng).
- **Rule 6 (Address):** The \`address\` field must contain a navigable address.
- **Rule 7 (Google Data):** Research current \`rating\` and \`ratingCount\`.

# CATEGORY PROTOCOL
Choose exactly ONE category for each place from this list:
**[${validCategories}]**
Do not invent new categories.`;

    const outputSchema = [ SIGHT_SCHEMA ];

    return new PromptBuilder()
        .withOS()
        .withRole(role)
        .withContext(contextData, "DATA BASIS & CONTEXT")
        .withInstruction(instructions)
        .withOutputSchema(outputSchema)
        .withSelfCheck(['basic', 'research'])
        .build(true);
};