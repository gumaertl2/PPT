// 04.02.2026 14:15 - FIX: CONNECTED TO NEW COUNTRY CONFIG.
// - Uses 'countryGuideConfig' (No Fallbacks, No TripAdvisor).
// - Injects 'guide_anchors' (URLs) for AI Knowledge Grounding.
// - Removes redundant filtering (Data Source is now clean).
// src/core/prompts/preparers/prepareFoodScoutPayload.ts

import type { TripProject, FoodSearchMode } from '../../types';
import { getGuidesForCountry } from '../../../data/countries';

export const prepareFoodScoutPayload = (
    projectOrPayload: any, 
    modeInput: FoodSearchMode = 'standard',
    feedbackInput?: string
) => {
    // --- 0. RESOLVE INPUT (Project vs. Payload) ---
    let project: TripProject;
    let feedback = feedbackInput;

    if (projectOrPayload.context || projectOrPayload.instructions) {
        // Payload Mode (Ad-Hoc Call)
        project = projectOrPayload.project || projectOrPayload; // Fallback
        if (!feedback && projectOrPayload.instructions) {
            feedback = projectOrPayload.instructions;
        }
    } else {
        // Standard Mode
        project = projectOrPayload as TripProject;
    }

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

    // --- 2. AD-HOC OVERRIDE ---
    const isAdHoc = !!(feedback && feedback.toLowerCase().includes('adhoc'));
    
    if (isAdHoc && feedback) {
        const locMatch = feedback.match(/LOC:([^|]+)/);
        if (locMatch && locMatch[1].trim()) {
            const manualLoc = locMatch[1].trim(); 
            // OVERRIDE: If Ad-Hoc specifies a location, use it exclusively!
            targetLocations = [manualLoc];
            regionHint = manualLoc;
            contextDescription = "Manual Ad-Hoc Search";
            console.log(`[FoodScout] 🎯 Ad-Hoc Location detected: "${manualLoc}"`);
        }
    }

    // --- 3. COMPOSE SEARCH STRING ---
    let searchLocation = "";
    if (targetLocations.length > 0) {
        searchLocation = Array.from(new Set(targetLocations)).join(', ');
    } else {
        searchLocation = "Region unbekannt";
        console.warn("[FoodScout] No locations found in Analysis or Inputs.");
    }

    // --- 4. DETERMINE GUIDES (NEW: V40.5 KNOWLEDGE INJECTION) ---
    let countryForLookup = regionHint;
    
    if (!countryForLookup && (logistics as any)?.target_countries) {
        countryForLookup = (logistics as any).target_countries[0];
    }
    
    // FETCH CONFIG (Clean List, No TripAdvisor, No Fallbacks)
    // Returns GuideDef[]: { name: string, searchUrl: string }[]
    const relevantGuideDefs = getGuidesForCountry(countryForLookup);
    
    // TRANSFORM FOR PROMPT
    const guideNames = relevantGuideDefs.map(g => g.name);
    
    // ANCHORS: "Michelin (https://...)"
    // This helps the AI to ground its hallucinations on specific URLs.
    const guideAnchors = relevantGuideDefs.map(g => `- ${g.name}: ${g.searchUrl}`).join('\n');

    // --- 5. AD-HOC STRATEGY TEXT ---
    let searchArea = `Scope: ${contextDescription}. Locations: ${searchLocation}`;
    let strategyMode = modeInput;

    if (isAdHoc && feedback) {
        const radMatch = feedback.match(/RAD:(\d+)/);
        if (radMatch) searchArea += ` (Radius: ${radMatch[1]}km)`;
        if (feedback.toLowerCase().includes('sterne') || feedback.includes('mode:stars')) strategyMode = 'stars';
    }

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
            
            // PURE NAMES (for "Allowed List" check)
            guides_list: guideNames,
            
            // KNOWLEDGE INJECTION (URLs for "Grounding")
            guide_anchors: guideAnchors,

            mode: isAdHoc ? 'adhoc' : 'guide',
            target_language: userInputs?.aiOutputLanguage || 'de',
            _debug_source: contextDescription,
            dynamic_guide_mode: false, // STRICT MODE ALWAYS
            target_country: countryForLookup || "Target Region"
        },
        instructions: {
            strategy: strategyText,
            role: `You are the 'Food-Collector'. You have a LIST of locations: "${searchLocation}". 
            TASK: Scan the allowed guides for EACH of these locations. Return candidates for ALL listed places.`
        },
        userInputs: { 
             selectedInterests: userInputs?.selectedInterests || [],
             pace: userInputs?.pace || 'balanced'
        }
    };
};
// --- END OF FILE 135 Zeilen ---