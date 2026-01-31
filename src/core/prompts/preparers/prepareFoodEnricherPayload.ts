// 03.02.2026 20:10 - FIX: PAYLOAD SUPPORT FOR AD-HOC.
// - Now correctly extracts candidates from Payload object wrapper.
// - Preserves all logic (Distance, ID, Editorial Guideline).
// src/core/prompts/preparers/prepareFoodEnricherPayload.ts

import type { TripProject } from '../../types';
import { INTEREST_DATA } from '../../../data/interests';

export const prepareFoodEnricherPayload = (
    projectOrPayload: any, // Changed type to allow Payload wrapper
    candidatesArg?: any[], 
    currentChunk: number = 1,
    totalChunks: number = 1
) => {
    // --- 0. RESOLVE INPUT (Project vs. Payload) ---
    let project: TripProject;
    let candidatesFromPayload: any[] | undefined;

    if (projectOrPayload.context || projectOrPayload.project) {
        // Payload Mode (Ad-Hoc Call)
        project = projectOrPayload.project || projectOrPayload; 
        // Ad-Hoc Pipeline passes candidates inside context
        if (projectOrPayload.context && Array.isArray(projectOrPayload.context.candidates)) {
            candidatesFromPayload = projectOrPayload.context.candidates;
        }
    } else {
        // Standard Mode
        project = projectOrPayload as TripProject;
    }

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
    // Priority: 1. Argument (Direct Call) -> 2. Payload Context (Ad-Hoc) -> 3. Store (Wizard)
    let itemsToProcess = candidatesArg || candidatesFromPayload || [];

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
    } else {
        console.log(`[FoodEnricher] Processing ${itemsToProcess.length} candidates from Input/Pipeline.`);
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
            id: c.id, // <--- CRITICAL FIX: Pass ID to AI so it can return it!
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
// Lines: 115