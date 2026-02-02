// 02.02.2026 14:15 - FIX: LOBOTOMIZED SCOUT.
// - REMOVED all Guide/Country logic.
// - The Scout is now a "Dumb Collector" that only knows WHERE to look (Towns), not WHAT to look for.
// - Prevents early filtering/bias.
// src/core/prompts/preparers/prepareFoodScoutPayload.ts

import type { TripProject, FoodSearchMode } from '../../types';

export const prepareFoodScoutPayload = (
    projectOrPayload: any, 
    modeInput: FoodSearchMode = 'standard',
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

    // --- 2. PREPARE CONTEXT (MINIMALIST) ---
    // No Guides. No Rules. Just Geography.
    
    return {
        context: {
            location_name: searchLocation,
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
// --- END OF FILE 52 Lines ---