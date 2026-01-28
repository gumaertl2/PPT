// 29.01.2026 15:30 - FIX: Harmonized 'distance' property from GeoFilter (Phase 2) and added source_url passthrough.
// 28.01.2026 10:00 - FIX: Removed unused import & Added type safety for itemsToProcess.
// 27.01.2026 23:15 - FIX: V30 Feature Parity (Distance Calculation & Store Access).
// src/core/prompts/preparers/prepareFoodEnricherPayload.ts

import type { TripProject } from '../../types';
import { INTEREST_DATA } from '../../../data/interests';

export const prepareFoodEnricherPayload = (
    project: TripProject,
    candidates?: any[], 
    currentChunk: number = 1,
    totalChunks: number = 1
) => {
    const { meta, analysis, userInputs } = project;
    const lang = meta.language === 'en' ? 'en' : 'de';

    // 1. GET EDITORIAL GUIDELINE (Redaktionsanweisung)
    const foodInterest = INTEREST_DATA['food'] || INTEREST_DATA['restaurants'] || INTEREST_DATA['essen'];
    let editorialGuideline = "";
    
    if (foodInterest && foodInterest.writingGuideline) {
        editorialGuideline = (foodInterest.writingGuideline as any)[lang] || (foodInterest.writingGuideline as any)['de'] || "";
    }

    // 2. GET STRATEGIC BRIEFING (Tonality)
    const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                              (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                              "";

    // 3. GET REFERENCE LOCATION
    const destinationName = userInputs.logistics.stationary.destination || "Region";
    
    // 4. PREPARE CANDIDATES
    let itemsToProcess = candidates || [];

    if (itemsToProcess.length === 0) {
        // Fallback: Check store if passed empty (Integration Safety)
        const rawCandidates = (project.data.content as any)?.rawFoodCandidates || [];
        if (rawCandidates.length > 0) {
            console.log(`[FoodEnricher] Found ${rawCandidates.length} candidates in Store (rawFoodCandidates).`);
            itemsToProcess = rawCandidates;
        } else {
            console.warn(`[FoodEnricher] No candidates found in arguments or store.`);
            itemsToProcess = [];
        }
    }

    // Map items (TS knows itemsToProcess is an array now)
    const itemsToEnrich = itemsToProcess.map((c: any) => {
        const name = c.name || c.titel || "Unknown";
        const locationStr = c.city || c.ort || c.address || "";
        
        // Pass through source info from Phase 1
        const guideContext = c.guides && c.guides.length > 0 
            ? `Listed in: ${c.guides.join(', ')}` 
            : "Candidate from Scan";
        
        const sourceLink = c.source_url || "";

        // DISTANCE LOGIC (Phase 2 Integration)
        // Geo-Filter stores distance in 'distance' (number)
        let distValue = 0;
        let distanceInfo = `Lage: ${locationStr}`;
        
        if (typeof c.distance === 'number') {
             distValue = Number(c.distance.toFixed(1));
             distanceInfo = `${distValue} km`;
        } 
        // Legacy/Fallback check
        else if (c.dist !== undefined && c.dist !== null) {
             distValue = Number(c.dist.toFixed(1));
             distanceInfo = `${distValue} km`;
        }

        return {
            name: name,
            location_hint: distanceInfo, // Human readable string
            distance_val: distValue,     // Numeric for AI to use in strict format
            context_hint: guideContext,
            source_url: sourceLink,
            raw_address: c.address || c.location || "" 
        };
    });

    const chunkInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

    return {
        context: {
            candidates_list: itemsToEnrich,
            chunk_progress: chunkInfo,
            target_language: userInputs.aiOutputLanguage || lang,
            strategic_briefing: strategicBriefing,
            reference_location: destinationName
        },
        instructions: {
            editorial_guideline: editorialGuideline,
            role: "You are a 'Food-Enricher' & Restaurant Critic. Your job is to verify facts and write a high-quality review in specific format."
        }
    };
};
// --- END OF FILE 98 Zeilen ---