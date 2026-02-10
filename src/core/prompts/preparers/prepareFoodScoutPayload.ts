// 10.02.2026 15:00 - FIX: Robust Input Handling for town_list to prevent TypeError in Template.
// 10.02.2026 14:10 - FIX: Resolved TS Error 'country' missing on stationary type.
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
    // FIX: Ensure townList is ALWAYS an array to prevent "undefined" access later
    const townList: string[] = (options && Array.isArray(options.candidates)) 
                               ? options.candidates 
                               : [];
    
    // Fallback Location Name
    let searchLocation = userInputs?.logistics?.stationary?.destination || "Target Region";
    if (feedback && feedback.includes('LOC:')) {
        const match = feedback.match(/LOC:([^|]+)/);
        if (match) searchLocation = match[1].trim();
    }

    // Extract Country safely
    const logistics = userInputs?.logistics;
    const country = logistics?.target_countries?.[0] || 
                    (logistics?.stationary as any)?.region || 
                    logistics?.stationary?.destination ||
                    "Europe"; 
    
    const fullLocationString = `${searchLocation}, ${country}`;

    // --- 2. PREPARE CONTEXT ---
    return {
        context: {
            location_name: fullLocationString, 
            country: country, 
            town_list: townList, // Now guaranteed to be string[]
            guides: ["Michelin", "Gault&Millau", "Feinschmecker", "Varta Führer"]
        },
        instructions: {
            role: "Du bist ein Datenbank-Crawler für Standort-Daten."
        },
        userInputs: { 
             selectedInterests: [] 
        }
    };
};
// --- END OF FILE 58 Zeilen ---