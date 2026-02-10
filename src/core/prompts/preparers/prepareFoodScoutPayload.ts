// 10.02.2026 14:10 - FIX: Resolved TS Error 'country' missing on stationary type.
// 09.02.2026 14:35 - FIX: Added Country Context to Dumb Collector to prevent Hallucinations.
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
    const townList: string[] = Array.isArray(options?.candidates) ? options.candidates : [];
    
    // Fallback Location Name
    let searchLocation = userInputs?.logistics?.stationary?.destination || "Target Region";
    if (feedback && feedback.includes('LOC:')) {
        const match = feedback.match(/LOC:([^|]+)/);
        if (match) searchLocation = match[1].trim();
    }

    // FIX START: Extract Country correctly from 'target_countries' (Type Safe)
    // We cast to 'any' briefly if needed, but better to use optional chaining on known types
    const logistics = userInputs?.logistics;
    
    // Safe Access Chain
    const country = logistics?.target_countries?.[0] || 
                    (logistics?.stationary as any)?.region || // Type cast for safety if type definition is strict
                    logistics?.stationary?.destination ||
                    "Europe"; 
    
    // Combine for unambiguous search context
    const fullLocationString = `${searchLocation}, ${country}`;
    // FIX END

    // --- 2. PREPARE CONTEXT (MINIMALIST) ---
    return {
        context: {
            location_name: fullLocationString, 
            country: country, 
            town_list: townList, 
        },
        instructions: {
            role: "Du bist ein Datenbank-Crawler für Standort-Daten."
        },
        userInputs: { 
             selectedInterests: [] 
        }
    };
};
// --- END OF FILE 65 Lines ---