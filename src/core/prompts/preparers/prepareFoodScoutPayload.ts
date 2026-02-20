// 20.02.2026 16:30 - FIX: Reverted to Single-City processing. Multi-City logic moved to FoodWorkflow loop to prevent AI overload.
// 16.02.2026 17:20 - UPDATE: SIMPLE PASS-THROUGH & DYNAMIC GUIDES.
// src/core/prompts/preparers/prepareFoodScoutPayload.ts

import { getGuidesForCountry } from '../../../data/countries';
import type { TripProject, FoodSearchMode } from '../../types';

export const prepareFoodScoutPayload = (
    projectOrPayload: any, 
    _modeInput: FoodSearchMode = 'standard',
    feedbackInput?: string,
    options?: any
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
    
    // --- 1. DETECT LOCATION (SINGLE TARGET) ---
    // The FoodWorkflow loop passes exactly ONE city via options.candidates
    const candidates = options?.candidates || [];
    let targetLocation = candidates.length > 0 ? candidates[0] : (userInputs?.logistics?.stationary?.destination || "Region");

    if (feedback && feedback.includes('LOC:')) {
        const match = feedback.match(/LOC:([^|]+)/);
        if (match) targetLocation = match[1].trim();
    }

    // --- 2. DETECT COUNTRY ---
    const logistics = userInputs?.logistics;
    let country = logistics?.target_countries?.[0] || 
                  (logistics?.stationary as any)?.region || 
                  logistics?.stationary?.destination || 
                  "Europe"; 

    // Fallback: If country is missing/Europe but language is DE -> Deutschland
    if ((!country || country === "Europe") && project.meta?.language === 'de') {
        country = "Deutschland";
    }

    // --- 3. SELECT GUIDES ---
    let selectedGuides = options?.guides;
    if (!selectedGuides || !Array.isArray(selectedGuides) || selectedGuides.length === 0) {
        selectedGuides = getGuidesForCountry(country);
    }

    // --- 4. RETURN PAYLOAD ---
    return {
        context: {
            // Die KI bekommt durch die Schleife immer nur EINE Stadt + Land (z.B. "Bozen (Italien)")
            location_name: `${targetLocation} (${country})`, 
            target_town: targetLocation,
            country: country, 
            guides: selectedGuides 
        },
        instructions: {
            role: "Du bist ein professioneller Recherche-Assistent."
        },
        userInputs: { selectedInterests: [] },
        ...options 
    };
};
// --- END OF FILE 71 Zeilen ---