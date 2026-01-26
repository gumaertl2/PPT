// 27.01.2026 22:00 - FIX: Robust Candidate Fetching (Self-Service).
// Looks into 'rawFoodCandidates' to find work, even if caller provides nothing.
// src/core/prompts/preparers/prepareFoodEnricherPayload.ts

import type { TripProject } from '../../types';
import { INTEREST_DATA } from '../../../data/interests';

export const prepareFoodEnricherPayload = (
    project: TripProject,
    candidates?: any[], // Changed to optional for robustness
    currentChunk: number = 1,
    totalChunks: number = 1
) => {
    const { meta, analysis, userInputs } = project;
    const lang = meta.language === 'en' ? 'en' : 'de';

    // 1. GET EDITORIAL GUIDELINE (Redaktionsanweisung)
    // We look for the 'food' interest to get the specific writing style.
    // Falls 'food' nicht existiert, prüfen wir Fallbacks.
    const foodInterest = INTEREST_DATA['food'] || INTEREST_DATA['restaurants'] || INTEREST_DATA['essen'];
    let editorialGuideline = "";
    
    if (foodInterest && foodInterest.writingGuideline) {
        editorialGuideline = (foodInterest.writingGuideline as any)[lang] || (foodInterest.writingGuideline as any)['de'] || "";
    }

    // 2. GET STRATEGIC BRIEFING (Tonality)
    const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                              (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                              "";

    // 3. PREPARE CANDIDATES
    // FIX: Self-Service - Check store if no candidates provided
    let itemsToProcess = candidates;

    if (!itemsToProcess || itemsToProcess.length === 0) {
        // Look into the Store for the handover list from ResultProcessor
        const rawCandidates = (project.data.content as any)?.rawFoodCandidates || [];
        if (rawCandidates.length > 0) {
            console.log(`[FoodEnricher] Found ${rawCandidates.length} candidates in Store (rawFoodCandidates).`);
            itemsToProcess = rawCandidates;
        } else {
            console.warn(`[FoodEnricher] No candidates found in arguments or store.`);
            itemsToProcess = [];
        }
    }

    // Candidates usually come from FoodScout (structured) or are raw strings/objects.
    const itemsToEnrich = itemsToProcess.map(c => {
        // Safe access to properties
        const name = c.name || c.titel || "Unknown";
        // Location Hint: City or Lat/Lng
        const location = c.city || c.ort || (c.location ? `${c.location.lat}, ${c.location.lng}` : "");
        // Context Hint: Which Guide recommended it?
        const context = c.guides ? `Listed in: ${c.guides.join(', ')}` : "Candidate";
        
        return {
            name: name,
            location_hint: location,
            context_hint: context
        };
    });

    const chunkInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

    return {
        context: {
            candidates_list: itemsToEnrich,
            chunk_progress: chunkInfo,
            target_language: userInputs.aiOutputLanguage || lang,
            strategic_briefing: strategicBriefing
        },
        instructions: {
            editorial_guideline: editorialGuideline,
            role: "You are a culinary data enricher. Your task is to find details and write engaging descriptions."
        }
    };
};
// --- END OF FILE 79 Zeilen ---