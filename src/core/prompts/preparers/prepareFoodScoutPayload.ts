// 20.02.2026 15:55 - FEAT: Expanded Restaurant Search to cover ALL visited cities (districts) and stops, not just the main hub.
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

    const { userInputs, data, analysis } = project;
    
    // --- 1. DETECT LOCATIONS (ALL HUBS & CITIES) ---
    let hubs: string[] = [];

    // A) Base logistics locations (Hauptorte)
    if (userInputs?.logistics?.mode === 'stationaer') {
        if (userInputs.logistics.stationary?.destination) {
            hubs.push(userInputs.logistics.stationary.destination);
        }
    } else {
        if (analysis?.routeArchitect?.routes?.[0]?.stages) {
            hubs = analysis.routeArchitect.routes[0].stages.map((s: any) => s.location_name);
        } else if (userInputs?.logistics?.roundtrip?.stops) {
            hubs = userInputs.logistics.roundtrip.stops.map((s: any) => s.location);
        }
    }

    // B) NEW: Add all discovered cities/districts from the generated places list
    const places = Object.values(data?.places || {});
    places.forEach((p: any) => {
        if (p.category === 'districts' || p.category === 'city_info') {
            // Bereinige den Namen (entferne Klammern wie "(Altstadt)")
            const cityName = p.name ? p.name.split('(')[0].trim() : '';
            if (cityName) hubs.push(cityName);
        }
    });

    // C) Bereinigung (Duplikate entfernen)
    hubs = Array.from(new Set(hubs)).filter(h => h && h.length > 2);

    // Fallback, falls die Liste aus irgendeinem Grund leer ist
    let targetLocation = hubs.length > 0 ? hubs.join(', ') : "Region";

    // Legacy candidates override
    const candidates = options?.candidates || [];
    if (candidates.length > 0) {
        targetLocation = candidates.join(', ');
    }

    // Feedback override (falls der User sagt: "Suche nur in München")
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
            // Die KI bekommt nun z.B.: "Wolkenstein, Bozen, Brixen, Trient (Italien)"
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
// --- END OF FILE 98 Zeilen ---