// 05.02.2026 17:00 - FIX: GEO-INTEGRITY ENFORCEMENT.
// - Added strict "Town-Address-Match" rule to prevent city-shifting.
// - Explicitly forbids merging separate locations.
// src/core/prompts/preparers/prepareFoodScoutPayload.ts

import type { TripProject, FoodSearchMode } from '../../types';
import { getGuidesForCountry } from '../../../data/countries';

export const prepareFoodScoutPayload = (
    projectOrPayload: any, 
    modeInput: FoodSearchMode = 'standard',
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
    
    // --- 1. DETECT INPUT MODE (CHAIN VS SINGLE) ---
    const townList: string[] = Array.isArray(options?.candidates) ? options.candidates : [];
    const isChainMode = townList.length > 0;

    // --- 2. PARSE AD-HOC DATA ---
    const isAdHoc = !!(feedback && feedback.toLowerCase().includes('adhoc'));
    let adhocCountry = ""; 
    let searchLocation = "Region";
    let searchRadiusVal = 20;

    if (isAdHoc && feedback) {
        const locMatch = feedback.match(/LOC:([^|]+)/);
        if (locMatch) searchLocation = locMatch[1].trim();
        
        const countryMatch = feedback.match(/COUNTRY:([^|]+)/);
        if (countryMatch) adhocCountry = countryMatch[1].trim();

        const radMatch = feedback.match(/RAD:(\d+)/);
        if (radMatch) searchRadiusVal = parseInt(radMatch[1]);
    } else {
        searchLocation = userInputs?.logistics?.stationary?.destination || "Target Region";
    }

    // --- 3. DETERMINE GUIDES ---
    let relevantGuideDefs: any[] = [];
    let resolvedCountry = adhocCountry || "Deutschland"; 

    if (adhocCountry) relevantGuideDefs = getGuidesForCountry(adhocCountry);
    else relevantGuideDefs = getGuidesForCountry("Deutschland");

    const guideNames = relevantGuideDefs.map(g => g.name);
    const guideListString = guideNames.join(', ');
    const guideAnchors = relevantGuideDefs.map(g => `- ${g.name}: ${g.searchUrl}`).join('\n');

    // --- 4. STRATEGY GENERATION ---
    let strategyText = "";
    let strategyMode = modeInput;

    if (isAdHoc && feedback) {
        if (feedback.toLowerCase().includes('sterne') || feedback.includes('mode:stars')) strategyMode = 'stars';
    }
    
    // COMMON RULES
    const commonRules = `
    # SOURCE DISCIPLINE (STRICT)
    - **ONLY** return restaurants listed in: [${guideListString}].
    - ⛔️ **FORBIDDEN:** Random "Local Favorites" or "Google Maps High Rated" places.
    - **STATUS:** 'verification_status' MUST be 'verified_memory'. 'ai_estimate' is BANNED.

    # EXCLUSION PROTOCOL
    - **IF A RESTAURANT HAS A MICHELIN STAR (1, 2, or 3), DELETE IT.**
    - **IF A RESTAURANT HAS > 16 GAULT&MILLAU POINTS, DELETE IT.**
    - We WANT: Bib Gourmand, The Plate, Slow Food, Tips.`;

    if (strategyMode === 'stars') {
        strategyText = `**MODE: GOURMET & STARS (GLOBAL)**
        - Target: Find restaurants with **Michelin Stars (1-3)**.
        - Radius: ${searchRadiusVal}km around ${searchLocation}.`;
    } 
    else if (isChainMode) {
        const townsString = townList.join(', ');
        strategyText = `**MODE: SYSTEMATIC TOWN CHECK (CHAIN EXECUTION)**
        
        # INPUT DATA
        List of ${townList.length} locations to scan:
        [${townsString}]

        # TASK: EXECUTE CHECKLIST
        1. Go through the list above ONE BY ONE.
        2. For **EACH** town (e.g. "Dachau"), query your internal knowledge for entries in: [${guideListString}].
        
        # ⛔️ GEO-INTEGRITY RULES (CRITICAL)
        - **ADDRESS MATCH:** If you check "Dachau", the restaurant's address MUST be in "Dachau" (or 85221). 
        - **NO SHIFTING:** Do NOT list a Munich restaurant just to fill the "Dachau" slot.
        - **EMPTY IS OKAY:** If "Adelshofen" has no guide entry, return NOTHING for Adelshofen. Do not invent "Gasthof Adelshofen".
        
        ${commonRules}

        # COMPLETENESS
        - Output ONE combined list of all valid hits found.`;
    } else {
        strategyText = `**MODE: RADIUS SCAN (FALLBACK)**
        - Search Center: ${searchLocation} (${searchRadiusVal}km).
        - Scan the *entire* area.
        
        ${commonRules}`;
    }

    return {
        context: {
            location_name: searchLocation, 
            search_area: isChainMode ? `Explicit Check of ${townList.length} Towns` : `Radius ${searchRadiusVal}km`,
            guides_list: guideNames,
            guide_anchors: guideAnchors,
            mode: isAdHoc ? 'adhoc' : 'guide',
            target_country: resolvedCountry
        },
        instructions: {
            strategy: strategyText,
            role: `You are the 'Food-Collector'. TASK: Check list. No Hallucinations.`
        },
        userInputs: { 
             selectedInterests: userInputs?.selectedInterests || []
        }
    };
};
// --- END OF FILE 135 Zeilen ---