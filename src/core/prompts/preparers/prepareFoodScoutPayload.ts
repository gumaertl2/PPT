// 03.02.2026 10:20 - FIX: TS2339 Resolved.
// Added 'as any' casts for 'target_countries' and corrected 'interests' to 'selectedInterests'.
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
    let targetLocations: string[] = [];
    let contextDescription = "";
    let regionHint = ""; 

    // PRIORITY A: Route Architect
    const routeStages = analysis?.routeArchitect?.routes?.[0]?.stages;
    if (routeStages && Array.isArray(routeStages) && routeStages.length > 0) {
        targetLocations = routeStages.map(s => s.location_name);
        contextDescription = "Calculated Roundtrip Stages";
        regionHint = logistics?.roundtrip?.region || targetLocations[0];
    }
    // PRIORITY B: Geo Analyst
    else if (analysis?.geoAnalyst?.recommended_hubs && analysis.geoAnalyst.recommended_hubs.length > 0) {
        targetLocations = analysis.geoAnalyst.recommended_hubs.map(h => h.hub_name);
        contextDescription = "Recommended City Districts/Hubs";
        regionHint = logistics?.stationary?.destination || targetLocations[0];
    }
    // PRIORITY C: User Inputs
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
            if (logistics.stationary.region) regionHint = logistics.stationary.region;
            else regionHint = dest;
        }
        contextDescription = "Stationary Destination";
    }

    // --- 2. COMPOSE SEARCH STRING ---
    let searchLocation = "";
    if (targetLocations.length > 0) {
        searchLocation = Array.from(new Set(targetLocations)).join(', ');
    } else {
        searchLocation = "Region unbekannt";
        console.warn("[FoodScout] No locations found in Analysis or Inputs.");
    }

    // --- 3. DETERMINE GUIDES (ENHANCED) ---
    // Try to find specific guides based on region/country hint
    let countryForLookup = regionHint;
    
    // FIX: TS2339 - Cast logistics to any to access potential target_countries
    if (!countryForLookup && (logistics as any)?.target_countries) {
        countryForLookup = (logistics as any).target_countries[0];
    }
    const guideLookupKey = countryForLookup || "Welt";
    
    let relevantGuides = getGuidesForCountry(guideLookupKey);

    // FIX: Detect Generic Fallback ("Welt") -> Trigger Dynamic Mode
    const isGenericFallback = relevantGuides.some(g => g.includes("Local Recommendations") || g.includes("TripAdvisor (Travelers' Choice)"));
    const dynamicGuideMode = isGenericFallback;

    // DACH Fix
    const isGerman = userInputs?.aiOutputLanguage === 'de' || !userInputs?.aiOutputLanguage;
    if (isGerman && relevantGuides.includes("World's 50 Best Restaurants") && relevantGuides.length <= 4 && !dynamicGuideMode) {
         relevantGuides = ["Michelin", "Gault&Millau", "Feinschmecker", "Falstaff", ...relevantGuides];
    }

    // --- 4. AD-HOC OVERRIDE ---
    const isAdHoc = !!(feedback && feedback.toLowerCase().includes('adhoc'));
    let searchArea = `Scope: ${contextDescription}. Locations: ${searchLocation}`;
    let strategyMode = modeInput;

    if (isAdHoc && feedback) {
        const locMatch = feedback.match(/LOC:([^|]+)/);
        if (locMatch && locMatch[1].trim()) {
            searchLocation = locMatch[1].trim(); 
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
        - Target: Find restaurants with **Michelin Stars (1-3)** or **Gault&Millau Toques (3+)**.`;
    } else {
        strategyText = `**MODE: HIDDEN GEMS (NO STARS)**
        - Target: Find excellent food but **casual vibe**.`;
    }

    return {
        context: {
            location_name: searchLocation, 
            search_area: searchArea,
            // If dynamic mode, send EMPTY list to force AI research
            guides_list: dynamicGuideMode ? [] : relevantGuides,
            mode: isAdHoc ? 'adhoc' : 'guide',
            target_language: userInputs?.aiOutputLanguage || 'de',
            _debug_source: contextDescription,
            dynamic_guide_mode: dynamicGuideMode, // Trigger for Prompt
            target_country: countryForLookup || "Target Region"
        },
        instructions: {
            strategy: strategyText,
            role: `You are the 'Food-Collector'. You have a LIST of locations: "${searchLocation}". 
            TASK: Scan the allowed guides for EACH of these locations. Return candidates for ALL listed places.`
        },
        userInputs: { // Passed for Prompt Usage
             // FIX: TS2339 - Use 'selectedInterests' instead of 'interests'
             selectedInterests: userInputs?.selectedInterests || [],
             pace: userInputs?.pace || 'balanced'
        }
    };
};
// --- END OF FILE 135 Zeilen ---