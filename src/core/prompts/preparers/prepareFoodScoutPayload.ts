// 27.01.2026 00:15 - FEAT: Added Ad-Hoc Manual Location Support.
// Parses 'feedback' string for explicit 'LOC:' and 'RAD:' overrides.
// src/core/prompts/preparers/prepareFoodScoutPayload.ts

import type { TripProject, FoodSearchMode } from '../../types';
import { getGuidesForCountry } from '../../../data/countries';

export const prepareFoodScoutPayload = (
    project: TripProject, 
    modeInput: FoodSearchMode = 'standard',
    feedback?: string
) => {
    const { userInputs } = project;
    
    // 1. ANALYSE: AD-HOC PARSING
    // We look for structured commands in feedback: "ADHOC_SEARCH|LOC:Munich|RAD:20|MODE:stars"
    const isAdHoc = !!(feedback && feedback.toLowerCase().includes('adhoc'));
    
    let manualLoc = "";
    let manualRad = "";
    
    if (isAdHoc && feedback) {
        // Simple Parser for overrides
        const locMatch = feedback.match(/LOC:([^|]+)/);
        if (locMatch) manualLoc = locMatch[1];

        const radMatch = feedback.match(/RAD:(\d+)/);
        if (radMatch) manualRad = radMatch[1];
    }

    // 2. STRATEGY SELECTION
    let mode = modeInput;
    if (!isAdHoc) {
        mode = 'standard'; // Trip mode is always standard/authentic
    }
    // Override via Feedback (explicit priority)
    if (feedback && feedback.toLowerCase().includes('sterne')) mode = 'stars';
    if (feedback && feedback.toLowerCase().includes('mode:stars')) mode = 'stars';
    if (feedback && feedback.toLowerCase().includes('mode:standard')) mode = 'standard';

    // 3. DETERMINE CONTEXT & COUNTRY
    let searchContext = "";
    let countryForGuides = "Welt"; 
    let locationName = "Current Location";

    if (isAdHoc) {
        // CASE A: Manual Text Input (e.g. "München")
        if (manualLoc) {
            locationName = manualLoc;
            searchContext = `${manualLoc} (Radius: ${manualRad || '10'}km)`;
            // KI soll Land selbst ableiten oder wir nutzen Fallback
            countryForGuides = manualLoc; 
        } 
        // CASE B: GPS (Current Location)
        else if (userInputs.currentLocation) {
            const { lat, lng } = userInputs.currentLocation;
            searchContext = `Lat: ${lat}, Lng: ${lng} (Radius: ${manualRad || '20'}km)`;
            locationName = "Current Surroundings";
            if (userInputs.logistics.stationary?.region) countryForGuides = userInputs.logistics.stationary.region;
        } 
        // CASE C: Fallback to Trip Data
        else {
             searchContext = "Unknown Location";
        }
    } else {
        // TRIP MODE logic (unchanged)
        if (userInputs.logistics.mode === 'stationaer') {
            searchContext = userInputs.logistics.stationary.destination || "Destination";
            countryForGuides = userInputs.logistics.stationary.region || "Welt";
            locationName = searchContext;
        } else {
            const region = userInputs.logistics.roundtrip.region || "Roundtrip";
            const stops = userInputs.logistics.roundtrip.stops.map(s => s.location).filter(Boolean).join(', ');
            searchContext = `${region} (Stops: ${stops})`;
            countryForGuides = region;
            locationName = region;
        }
    }

    // 4. LOAD GUIDES
    // If countryForGuides is a city (e.g. "Munich"), the helper might return "Welt" 
    // unless mapped. Ideally, the LLM is robust enough with "Welt" lists or we assume implicit mapping.
    const relevantGuides = getGuidesForCountry(countryForGuides);

    // 5. DEFINE STRATEGY TEXT
    let strategyText = "";
    const isGourmet = mode === 'stars';

    if (isGourmet) {
        strategyText = `**STRATEGY: STARS & HIGH-END**
        - **Target:** Search ONLY for restaurants listed in the provided guides that have **Stars (1-3), Toques (3+), or equivalent high awards**.
        - **Strict Filter:** Ignore places without these specific high-end distinctions.`;
    } else {
        strategyText = `**STRATEGY: AUTHENTIC & BIB GOURMAND (NO STARS)**
        - **Target:** Search ONLY for restaurants listed in the provided guides that are **"Recommended", "Bib Gourmand", "Plates", or "1 Toque"**.
        - **Strict Filter:** EXCLUDE "Star" restaurants (too expensive/formal). We want excellent food, but casual/authentic vibe.
        - **Guide Constraint:** Do NOT suggest "Local Heroes" unless they are mentioned in at least one of the guides.`;
    }

    return {
        context: {
            location_name: locationName,
            search_area: searchContext,
            guides_list: relevantGuides,
            mode: mode,
            is_adhoc: isAdHoc,
            target_language: userInputs.aiOutputLanguage || 'de'
        },
        instructions: {
            strategy: strategyText,
            role: "You are a specialized Food-Scout. You STRICTLY filter by the provided guide lists."
        }
    };
};
// --- END OF FILE 105 Zeilen ---