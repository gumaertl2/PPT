// [2026-11-03] [15:49] - FIX: Checked roundtrip.region before defaulting country to Europe/Deutschland.
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

    // --- 2. DETECT COUNTRY & AD-HOC PARAMETERS ---
    const logistics = userInputs?.logistics;
    let country = "";
    if (feedback && feedback.includes('COUNTRY:')) {
        const cMatch = feedback.match(/COUNTRY:([^|]+)/i);
        if (cMatch && cMatch[1]) country = cMatch[1].trim();
    }
    if (!country) {
        country = logistics?.target_countries?.[0] || 
                  (project.analysis?.chefPlaner?.corrections as any)?.countries?.[0] ||
                  logistics?.roundtrip?.region ||
                  (logistics?.stationary as any)?.region || 
                  logistics?.stationary?.destination || 
                  "Europe"; 
    }

    // Fallback: If country is missing/Europe but language is DE -> Deutschland
    if ((!country || country === "Europe") && project.meta?.language === 'de') {
        country = "Deutschland";
    }

    let radiusKm = 15;
    if (feedback && feedback.includes('RAD:')) {
        const rMatch = feedback.match(/RAD:(\d+)/i);
        if (rMatch && rMatch[1]) radiusKm = Math.max(1, parseInt(rMatch[1], 10));
    }

    let searchMode: FoodSearchMode = _modeInput || 'standard';
    if (feedback && feedback.includes('MODE:')) {
        const mMatch = feedback.match(/MODE:([^|]+)/i);
        if (mMatch && mMatch[1]?.trim().toLowerCase() === 'stars') {
            searchMode = 'stars';
        }
    }

    let repairTarget: { name: string; city: string } | null = null;
    if (feedback && feedback.startsWith('REPAIR_MODE')) {
        const nMatch = feedback.match(/NAME:([^|]+)/);
        const cMatch = feedback.match(/CITY:([^|]+)/);
        if (nMatch && nMatch[1]) {
            repairTarget = {
                name: nMatch[1].trim(),
                city: cMatch && cMatch[1] ? cMatch[1].trim() : targetLocation
            };
        }
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
            guides: selectedGuides,
            radius_km: radiusKm,
            search_mode: searchMode,
            is_adhoc: Boolean(feedback && feedback.includes('ADHOC_SEARCH')),
            repair_target: repairTarget
        },
        instructions: {
            role: "Du bist ein professioneller Recherche-Assistent."
        },
        userInputs: { selectedInterests: [] },
        ...options 
    };
};
// --- END OF FILE 111 Zeilen ---