// 27.01.2026 23:15 - FIX: V30 Feature Parity (Distance Calculation & Store Access).
// Calculates distance to destination if coordinates are available.
// src/core/prompts/preparers/prepareFoodEnricherPayload.ts

import type { TripProject } from '../../types';
import { INTEREST_DATA } from '../../../data/interests';
import { calculateDistance } from '../../utils/geo'; // Import Geo Utils

export const prepareFoodEnricherPayload = (
    project: TripProject,
    candidates?: any[], // Changed to optional for robustness
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

    // 3. GET REFERENCE LOCATION (For Distance Calculation)
    // We try to find the lat/lng of the destination (from GeoAnalyst or previous steps)
    // If not found, we rely on the string "destination".
    // In V40, destination is often just a string. 
    // Ideally, we would have a 'center' coordinate.
    const destinationName = userInputs.logistics.stationary.destination || "Region";
    // Try to find coordinates for the destination (if stored in project metadata/locations)
    // For now, we assume candidates might have 'dist' property from Scout, or we calculate it if we have both points.
    
    // 4. PREPARE CANDIDATES
    // FIX: Self-Service - Check store if no candidates provided
    let itemsToProcess = candidates;

    if (!itemsToProcess || itemsToProcess.length === 0) {
        const rawCandidates = (project.data.content as any)?.rawFoodCandidates || [];
        if (rawCandidates.length > 0) {
            console.log(`[FoodEnricher] Found ${rawCandidates.length} candidates in Store (rawFoodCandidates).`);
            itemsToProcess = rawCandidates;
        } else {
            console.warn(`[FoodEnricher] No candidates found in arguments or store.`);
            itemsToProcess = [];
        }
    }

    const itemsToEnrich = itemsToProcess.map(c => {
        const name = c.name || c.titel || "Unknown";
        const locationStr = c.city || c.ort || c.address || "";
        const guideContext = c.guides ? `Listed in: ${c.guides.join(', ')}` : "Candidate";
        
        // DISTANCE LOGIC (V30 Parity)
        let distanceInfo = `Lage: ${locationStr}`;
        
        // If we have a pre-calculated distance (from Scout V30 logic), use it.
        if (c.dist !== undefined && c.dist !== null) {
             distanceInfo = `${c.dist.toFixed(1)} km von ${destinationName}`;
        } 
        // Else, simple location string
        else if (locationStr) {
             distanceInfo = `in ${locationStr}`;
        }

        return {
            name: name,
            location_hint: distanceInfo, // Passed to Prompt to fill the template
            context_hint: guideContext,
            // We pass raw address if available so AI can refine it
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
            role: "You are a culinary data enricher. Your task is to find details and write engaging descriptions."
        }
    };
};
// --- END OF FILE 98 Zeilen ---