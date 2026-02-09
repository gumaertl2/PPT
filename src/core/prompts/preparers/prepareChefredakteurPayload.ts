// 08.02.2026 22:00 - FIX: Prevent double slicing & enforce ID return.
// 05.02.2026 21:40 - FIX: Surgical Insertion of Selective Logic.
// 06.02.2026 16:35 - FEATURE: Respect 'customCategory' in Prompt Generation.
// 28.01.2026 17:20 - FIX: Added 'Walking Tour' instruction logic for districts.
// 26.01.2026 19:40 - FIX: RESTORED Rich Logic.
// src/core/prompts/preparers/prepareChefredakteurPayload.ts

import type { TripProject } from '../../types';
import { INTEREST_DATA, VALID_POI_CATEGORIES } from '../../../data/interests'; 

const resolveInterestId = (category: string): string | undefined => {
    if (!category) return undefined;
    const cleanCat = category.toLowerCase().trim();
    if (INTEREST_DATA[cleanCat]) return cleanCat;
    const foundId = Object.keys(INTEREST_DATA).find(key => {
        const def = INTEREST_DATA[key];
        return (
            def.label.de.toLowerCase() === cleanCat ||
            def.label.en.toLowerCase() === cleanCat
        );
    });
    return foundId;
};

const isDistrict = (cat: string) => {
    const c = cat.toLowerCase();
    return c === 'districts' || c === 'stadtbezirke' || c === 'citydistricts' || c === 'neighborhood';
};

export const prepareChefredakteurPayload = (
    context: any, 
    options: any = {} 
) => {
    const project = context.project || context as TripProject;
    
    let targetCandidates: any[] = [];

    if (options.candidates && Array.isArray(options.candidates) && options.candidates.length > 0) {
        // Explicit Request (Smart Mode / Selective)
        targetCandidates = options.candidates.map((c: any) => {
            const id = typeof c === 'string' ? c : c.id;
            return project.data.places[id] || c; // Fallback to c if not found in project (rare)
        }).filter((p: any) => p !== undefined);
        console.log(`[Chefredakteur] Selective Run: Processing ${targetCandidates.length} specific items.`);
    } else {
        // Auto-Mode
        targetCandidates = Object.values(project.data.places || {}).filter((p: any) => {
            if (!p.valid) return false; 
            if (VALID_POI_CATEGORIES.includes(p.category)) return true;
            return resolveInterestId(p.category) !== undefined;
        });
    }

    // Chunking Logic
    let processedCandidates = targetCandidates;
    const currentChunk = options.chunkIndex || 1;
    const totalChunks = options.totalChunks || 1;
    const limit = options.limit || 10;

    // FIX: Only slice if we are NOT already working on a pre-sliced chunk.
    // Heuristic: If candidates were explicitly passed (Smart Mode), assume they are the chunk.
    // If we are in Auto-Mode (candidates undefined), then we slice.
    const isExplicitChunk = options.candidates && Array.isArray(options.candidates);
    
    if (!isExplicitChunk && options.limit && targetCandidates.length > limit) {
         const start = (currentChunk - 1) * limit;
         const end = start + limit;
         processedCandidates = targetCandidates.slice(start, end);
    }

    const validPlaces = processedCandidates; 

    const lang = (project.meta.language === 'en' ? 'en' : 'de');

    const editorialTasks = validPlaces.map((place: any) => {
        let instructions = `Create a general, useful description for '${place.name}'.`;
        const category = place.userSelection?.customCategory || place.category || 'general';
        const interestId = resolveInterestId(category);
        
        if (interestId) {
            const guideline = INTEREST_DATA[interestId]?.writingGuideline;
            if (guideline) {
                const text = (guideline as any)[lang] || (guideline as any)['de'];
                if (text) instructions = text;
            }
        }

        if (interestId && project.userInputs.customWritingGuidelines?.[interestId]) {
            instructions += `\n\nUSER OVERRIDE: ${project.userInputs.customWritingGuidelines[interestId]}`;
        }

        if (isDistrict(category)) {
            instructions += `\n\n**SPECIAL FORMAT: WALKING TOUR.** This is a district/neighborhood. Do NOT write a static description. Instead, guide the user through the area. Mention 3-5 specific highlights/stops in a logical order (Start -> End).`;
        }

        return {
            id: place.id,
            titel: place.name,
            typ: category, 
            facts: {
                address: place.address || "N/A",
                openingHours: place.openingHours || "N/A",
                location: place.location,
                description: place.description, 
                logistics: place.logistics,
                price_estimate: place.price_estimate,
                originalCategory: place.category 
            },
            anweisung: instructions
        };
    });

    const chunkInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

    return {
        context: {
            editorial_tasks: editorialTasks,
            chunk_progress: chunkInfo,
            target_language: project.userInputs.aiOutputLanguage || lang
        },
        instructions: {
            role: "You are the 'Editor-in-Chief'. You turn provided facts into inspiring content.",
            // FIX: STRICT OUTPUT CONSTRAINT
            output_rules: "CRITICAL: You MUST return a JSON object/array where each item includes the exact 'id' from the input task. Use the 'id' field to map your response back to the correct place. Do NOT invent new IDs or names."
        }
    };
};
// --- END OF FILE 145 Zeilen --- 