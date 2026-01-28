// 29.01.2026 14:45 - FIX: Adapted Payload for Orchestrated Food-Collector (Scanner Mode). Strict Guide & Area Logic.
// 28.01.2026 10:10 - FIX: Removed 'currentLocation' access (TS Error) & stabilized Ad-Hoc fallback.
// 27.01.2026 00:15 - FEAT: Added Ad-Hoc Manual Location Support.
// src/core/prompts/preparers/prepareFoodScoutPayload.ts

import type { TripProject, FoodSearchMode } from '../../types';
import { getGuidesForCountry } from '../../../data/countries';

export const prepareFoodScoutPayload = (
    project: TripProject, 
    modeInput: FoodSearchMode = 'standard',
    feedback?: string
) => {
    const { userInputs } = project;
    
    // 1. ANALYSE: AD-HOC PARSING (Command Mode)
    // Commands: "ADHOC_SEARCH|LOC:Munich|RAD:20|MODE:stars"
    const isAdHoc = !!(feedback && feedback.toLowerCase().includes('adhoc'));
    
    let manualLoc = "";
    let manualRad = "";
    let forceStars = false;
    
    if (isAdHoc && feedback) {
        const locMatch = feedback.match(/LOC:([^|]+)/);
        if (locMatch) manualLoc = locMatch[1];

        const radMatch = feedback.match(/RAD:(\d+)/);
        if (radMatch) manualRad = radMatch[1];
        
        if (feedback.toLowerCase().includes('mode:stars') || feedback.toLowerCase().includes('sterne')) {
            forceStars = true;
        }
    }

    // 2. CONTEXT & AREA DEFINITION
    let locationName = "Unknown";
    let searchAreaDescription = "";
    let countryForGuides = "Welt"; 

    // --- CASE A: AD-HOC (Manual or GPS) ---
    if (isAdHoc) {
        if (manualLoc) {
            locationName = manualLoc;
            searchAreaDescription = `Center: ${manualLoc}. Radius: ${manualRad || '15'} km around center.`;
            countryForGuides = manualLoc; // Fallback, helper will search partially
        } else {
            // Fallback to Trip Data if GPS fails
            const dest = userInputs.logistics.stationary.destination || userInputs.logistics.roundtrip.region || "Region";
            locationName = dest;
            searchAreaDescription = `Center: ${dest}. Radius: ${manualRad || '20'} km around center.`;
            countryForGuides = dest;
        }
    } 
    // --- CASE B: GUIDE MODE (Trip Planning) ---
    else {
        // Here we implement the logic: Hotel/Land = 50km, City/District = City Limits
        const mode = userInputs.logistics.mode;
        
        if (mode === 'stationaer') {
            const dest = userInputs.logistics.stationary.destination || "Destination";
            const region = userInputs.logistics.stationary.region;
            
            locationName = dest;
            countryForGuides = region || dest;
            
            // Logic: Search in Destination + surrounding Region (approx 50km)
            searchAreaDescription = `Area: ${dest} and surrounding region (${region || '50km radius'}). Includes cross-border search if near border.`;
        } 
        else if (mode === 'roundtrip') {
            const region = userInputs.logistics.roundtrip.region;
            const stops = userInputs.logistics.roundtrip.stops.map(s => s.location).join(', ');
            
            locationName = region || "Roundtrip Area";
            countryForGuides = region || "Welt";
            searchAreaDescription = `Area: Along the route stops: ${stops}. Search radius ~20km around each stop.`;
        }
    }

    // 3. LOAD GUIDES (Strict Matrix)
    const relevantGuides = getGuidesForCountry(countryForGuides);

    // 4. DEFINE STRATEGY TEXT (The Filter Logic)
    let strategyText = "";

    if (isAdHoc && forceStars) {
        // AD-HOC: ALLOW STARS
        strategyText = `**MODE: GOURMET & STARS**
        - **Objective:** Find the absolute best rated restaurants in the allowed guides.
        - **Criteria:** Michelin Stars (1-3), Gault&Millau Toques (3+), or equivalent top-tier awards.
        - **Constraint:** IGNORE simple "recommendations" if better rated options exist.`;
    } else {
        // GUIDE MODE (Standard): NO STARS (Hidden Gems)
        strategyText = `**MODE: HIDDEN GEMS (NO STARS)**
        - **Objective:** Find excellent but accessible food ("Bib Gourmand", "Plates", "1 Toque").
        - **Constraint:** EXCLUDE "Star" restaurants (too expensive/formal). We want authentic, local cuisine.
        - **Constraint:** STRICTLY FILTER by the provided guide list. Do not invent places.`;
    }

    return {
        context: {
            location_name: locationName,
            search_area: searchAreaDescription,
            guides_list: relevantGuides,
            mode: isAdHoc ? 'adhoc' : 'guide',
            target_language: userInputs.aiOutputLanguage || 'de'
        },
        instructions: {
            strategy: strategyText,
            role: "You are the 'Food-Collector', a specialized scanning agent. You do not interpret, you SCAN and LIST based on strict rules."
        }
    };
};
// --- END OF FILE 105 Zeilen ---