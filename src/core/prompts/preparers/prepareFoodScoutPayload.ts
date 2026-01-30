// 02.02.2026 23:00 - FEAT: Added Self-Healing (Dynamic Research) to existing V40 Logic.
// Base: User's 115-line "Precise Data Extraction" file.
// src/core/prompts/preparers/prepareFoodScoutPayload.ts

import type { TripProject, FoodSearchMode } from '../../types';
import { getGuidesForCountry } from '../../../data/countries';

export const prepareFoodScoutPayload = (
    project: TripProject, 
    modeInput: FoodSearchMode = 'standard',
    feedback?: string
) => {
    const { userInputs, analysis } = project;
    const logistics = userInputs?.logistics;
    
    // --- 1. DATA MINING: LOCATE TARGETS ---
    // We strictly look for "Overnight Locations" (Stages) or "City Districts" (Hubs).
    
    let targetLocations: string[] = [];
    let contextDescription = "";
    let regionHint = ""; // Used for Guide Lookup

    // PRIORITY A: Route Architect (The calculated stages)
    // Source: analysis.routeArchitect.routes[0].stages -> location_name
    const routeStages = analysis?.routeArchitect?.routes?.[0]?.stages;
    if (routeStages && Array.isArray(routeStages) && routeStages.length > 0) {
        targetLocations = routeStages.map(s => s.location_name);
        contextDescription = "Calculated Roundtrip Stages";
        regionHint = logistics?.roundtrip?.region || targetLocations[0];
    }
    
    // PRIORITY B: Geo Analyst (The recommended districts)
    // Source: analysis.geoAnalyst.recommended_hubs -> hub_name
    else if (analysis?.geoAnalyst?.recommended_hubs && analysis.geoAnalyst.recommended_hubs.length > 0) {
        targetLocations = analysis.geoAnalyst.recommended_hubs.map(h => h.hub_name);
        contextDescription = "Recommended City Districts/Hubs";
        regionHint = logistics?.stationary?.destination || targetLocations[0];
    }

    // PRIORITY C: User Inputs (Manual Fallback)
    else if (logistics?.mode === 'roundtrip' && logistics.roundtrip?.stops) {
        targetLocations = logistics.roundtrip.stops
            .map(s => s.location)
            .filter((l): l is string => !!l && l.length > 0);
        contextDescription = "User Planned Stops";
        regionHint = logistics.roundtrip.region || "";
    }
    else if (logistics?.mode === 'stationaer') {
        const dest = logistics.stationary?.destination;
        if (dest) {
            targetLocations = [dest];
            // If we have a region (e.g. "Toskana"), use that as hint too
            if (logistics.stationary.region) regionHint = logistics.stationary.region;
            else regionHint = dest;
        }
        contextDescription = "Stationary Destination";
    }

    // --- 2. COMPOSE SEARCH STRING ---
    let searchLocation = "";
    if (targetLocations.length > 0) {
        // Unique and join
        searchLocation = Array.from(new Set(targetLocations)).join(', ');
    } else {
        // Absolute Emergency Fallback
        searchLocation = "Region unbekannt";
        console.warn("[FoodScout] No locations found in Analysis or Inputs.");
    }

    // --- 3. DETERMINE GUIDES (ENHANCED SELF-HEALING) ---
    // We use the 'regionHint' to find the right country matrix. 
    // Do NOT use the comma-list 'searchLocation' here, it would break the lookup.
    
    // NEW: Robust Country Detection for Guide Lookup
    let countryForLookup = regionHint;
    if (!countryForLookup && logistics?.target_countries) {
        countryForLookup = logistics.target_countries[0];
    }
    const guideLookupKey = countryForLookup || "Welt";
    
    let relevantGuides = getGuidesForCountry(guideLookupKey);

    // FIX: Detect if we fell back to generic "Welt" list (Self-Healing Trigger)
    const isGenericFallback = relevantGuides.some(g => g.includes("Local Recommendations") || g.includes("TripAdvisor (Travelers' Choice)"));
    const dynamicGuideMode = isGenericFallback; // Enable research mode if no specific guides found

    // DACH Fix (if region name like "Baden-Württemberg" fails lookup but language is DE)
    const isGerman = userInputs?.aiOutputLanguage === 'de' || !userInputs?.aiOutputLanguage;
    if (isGerman && relevantGuides.includes("World's 50 Best Restaurants") && relevantGuides.length <= 4 && !dynamicGuideMode) {
         // Assume DACH context if fallback happened
         relevantGuides = ["Michelin", "Gault&Millau", "Feinschmecker", "Falstaff", ...relevantGuides];
    }

    // --- 4. AD-HOC OVERRIDE ---
    const isAdHoc = !!(feedback && feedback.toLowerCase().includes('adhoc'));
    let searchArea = `Scope: ${contextDescription}. Locations: ${searchLocation}`;
    let strategyMode = modeInput;

    if (isAdHoc && feedback) {
        const locMatch = feedback.match(/LOC:([^|]+)/);
        if (locMatch && locMatch[1].trim()) {
            searchLocation = locMatch[1].trim(); // Override
            searchArea = `Manual Ad-Hoc Search: ${searchLocation}`;
            relevantGuides = getGuidesForCountry(searchLocation);
        }
        
        const radMatch = feedback.match(/RAD:(\d+)/);
        if (radMatch) searchArea += ` (Radius: ${radMatch[1]}km)`;
        
        if (feedback.toLowerCase().includes('sterne') || feedback.includes('mode:stars')) strategyMode = 'stars';
    }

    // --- 5. STRATEGY TEXT ---
    let strategyText = "";
    if (strategyMode === 'stars') {
        strategyText = `**MODE: GOURMET & STARS**
        - Target: Find restaurants with **Michelin Stars (1-3)** or **Gault&Millau Toques (3+)**.
        - Strict Filter: Ignore places without these specific high-end awards.`;
    } else {
        strategyText = `**MODE: HIDDEN GEMS (NO STARS)**
        - Target: Find excellent food ("Bib Gourmand", "Plates", "1 Toque") but **casual vibe**.
        - Constraint: EXCLUDE Star restaurants. We want authentic local cuisine.`;
    }

    return {
        context: {
            location_name: searchLocation, // Contains "Stuttgart, Freiburg, ..."
            search_area: searchArea,
            // If dynamic mode is active, pass EMPTY list to force prompt research.
            guides_list: dynamicGuideMode ? [] : relevantGuides,
            mode: isAdHoc ? 'adhoc' : 'guide',
            target_language: userInputs?.aiOutputLanguage || 'de',
            target_country: countryForLookup || "Unknown Region",
            dynamic_guide_mode: dynamicGuideMode, // Explicit Flag
            _debug_source: contextDescription // Vital for debugging
        },
        instructions: {
            strategy: strategyText,
            role: `You are the 'Food-Collector'. You have a LIST of locations: "${searchLocation}". 
            TASK: Scan the allowed guides for EACH of these locations. Return candidates for ALL listed places.`
        },
        userInputs: { // Passed for Prompt Usage
             selectedInterests: userInputs?.interests || [],
             pace: userInputs?.pace || 'balanced'
        }
    };
};
// --- END OF FILE 136 Zeilen ---