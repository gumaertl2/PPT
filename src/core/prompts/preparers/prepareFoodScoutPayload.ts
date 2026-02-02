// 05.02.2026 18:30 - NEW STRATEGY: BROAD COLLECTION (STEP 2 PREP).
// - Removed all filters (Stars, Guides, Kill-Lists).
// - Prepares the "Wide Net" strategy for the Scout.
// src/core/prompts/preparers/prepareFoodScoutPayload.ts

import type { TripProject, FoodSearchMode } from '../../types';

export const prepareFoodScoutPayload = (
    projectOrPayload: any, 
    modeInput: FoodSearchMode = 'standard',
    feedbackInput?: string,
    options?: any
) => {
    let project: TripProject;
    let feedback = feedbackInput;

    if (projectOrPayload.context || projectOrPayload.instructions) {
        project = projectOrPayload.project || projectOrPayload; 
        if (!feedback && projectOrPayload.instructions) feedback = projectOrPayload.instructions;
    } else {
        project = projectOrPayload as TripProject;
    }

    const { userInputs } = project;
    const townList: string[] = Array.isArray(options?.candidates) ? options.candidates : [];
    
    // Default location fallback
    let searchLocation = userInputs?.logistics?.stationary?.destination || "Target Region";
    if (feedback && feedback.includes('LOC:')) {
        const match = feedback.match(/LOC:([^|]+)/);
        if (match) searchLocation = match[1].trim();
    }

    // THE WIDE NET STRATEGY
    // We pass the raw town list to the template.
    // No filters applied here.
    
    return {
        context: {
            location_name: searchLocation,
            town_list: townList, // Passing the full cluster list
            target_country: "Deutschland" // Default
        },
        instructions: {
            // We leave specific instructions to the template to keep this clean
            role: "Du bist ein Datenbank-Expertensystem für europäische Gastronomie."
        },
        userInputs: { selectedInterests: [] }
    };
};