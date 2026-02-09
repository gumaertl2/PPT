// 09.02.2026 14:35 - FIX: Added Country Context to Dumb Collector to prevent Hallucinations.
// 05.02.2026 14:45 - FIX: LINTING & LOBOTOMIZED SCOUT.
// - Prefixed unused 'modeInput' parameter.
// - The Scout is a "Dumb Collector" that only knows WHERE to look (Towns).
// src/core/prompts/preparers/prepareFoodScoutPayload.ts

import type { TripProject, FoodSearchMode } from '../../types';

export const prepareFoodScoutPayload = (
    projectOrPayload: any, 
    _modeInput: FoodSearchMode = 'standard',
    feedbackInput?: string,
    options?: any // Receives the town list from Orchestrator!
) => {
    // --- 0. RESOLVE INPUT ---
    let project: TripProject;
    let feedback = feedbackInput;

    if (projectOrPayload.context || projectOrPayload.instructions) {
        project = projectOrPayload.project || projectOrPayload; 
        if (!feedback && projectOrPayload.instructions) feedback = projectOrPayload.instructions;
    } else {
        project = projectOrPayload as TripProject;
    }

    const { userInputs } = project;
    
    // --- 1. DETECT INPUT MODE ---
    // The Orchestrator passes the "Clusters" (Town List) in options.candidates
    const townList: string[] = Array.isArray(options?.candidates) ? options.candidates : [];
    
    // Fallback Location Name (for the prompt title mostly)
    let searchLocation = userInputs?.logistics?.stationary?.destination || "Target Region";
    if (feedback && feedback.includes('LOC:')) {
        const match = feedback.match(/LOC:([^|]+)/);
        if (match) searchLocation = match[1].trim();
    }

    // FIX START: Extract Country to prevent Ambiguity (e.g. Antigua Guatemala vs Spain)
    const country = userInputs?.logistics?.stationary?.country || 
                    userInputs?.logistics?.roundtrip?.startLocation || 
                    "Spain"; // Fallback
    
    // Combine for unambiguous search context
    const fullLocationString = `${searchLocation}, ${country}`;
    // FIX END

    // --- 2. PREPARE CONTEXT (MINIMALIST) ---
    // No Guides. No Rules. Just Geography.
    
    return {
        context: {
            location_name: fullLocationString, // Adjusted to include Country
            country: country, // Explicit Field
            town_list: townList, // The only map he needs
        },
        instructions: {
            role: "Du bist ein Datenbank-Crawler für Standort-Daten." // Sehr nüchterne Rolle
        },
        userInputs: { 
             selectedInterests: [] // Irrelevant for the collector
        }
    };
};
// --- END OF FILE 62 Lines ---