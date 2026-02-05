// 05.02.2026 21:40 - FIX: Surgical Insertion of Selective Logic (preserving V40 logic).
// 06.02.2026 16:35 - FEATURE: Respect 'customCategory' in Prompt Generation.
// 28.01.2026 17:20 - FIX: Added 'Walking Tour' instruction logic for districts.
// 26.01.2026 19:40 - FIX: RESTORED Rich Logic (No Simplification).
// Returns full object { context, instructions } with strict Fact Injection.
// Fixed only TS6196 (Unused Place import).
// src/core/prompts/preparers/prepareChefredakteurPayload.ts

import type { TripProject } from '../../types';
import { INTEREST_DATA, VALID_POI_CATEGORIES } from '../../../data/interests'; // ADDED SSOT

/**
 * Helfer: Versucht, die Kategorie eines Ortes auf eine Interest-ID zu mappen.
 * (Deine Original-Funktion)
 */
const resolveInterestId = (category: string): string | undefined => {
    if (!category) return undefined;
    const cleanCat = category.toLowerCase().trim();
    
    // 1. Direkter Match
    if (INTEREST_DATA[cleanCat]) return cleanCat;

    // 2. Fallback: Suche in Labels
    const foundId = Object.keys(INTEREST_DATA).find(key => {
        const def = INTEREST_DATA[key];
        return (
            def.label.de.toLowerCase() === cleanCat ||
            def.label.en.toLowerCase() === cleanCat
        );
    });

    return foundId;
};

// Helper to detect districts/areas
const isDistrict = (cat: string) => {
    const c = cat.toLowerCase();
    return c === 'districts' || c === 'stadtbezirke' || c === 'citydistricts' || c === 'neighborhood';
};

// MODIFIED SIGNATURE to support options object from Orchestrator V2
export const prepareChefredakteurPayload = (
    context: any, // Was: project: TripProject
    options: any = {} // Was: candidates: any[], ...
) => {
    // Unpack context
    const project = context.project || context as TripProject;
    
    // 1. SELECTIVE LOGIC (Surgical Insert)
    // Determine which IDs to process. 
    // If options.candidates (from "Text aktualisieren" button) is set, use ONLY those.
    // Otherwise, grab ALL valid places from the store.
    let targetCandidates: any[] = [];

    if (options.candidates && Array.isArray(options.candidates) && options.candidates.length > 0) {
        // Explicit Request (Button Click)
        // Map IDs to full objects if necessary
        targetCandidates = options.candidates.map((c: any) => {
            const id = typeof c === 'string' ? c : c.id;
            return project.data.places[id];
        }).filter((p: any) => p !== undefined);
        console.log(`[Chefredakteur] Selective Run: Processing ${targetCandidates.length} specific items.`);
    } else {
        // Auto-Mode: Process ALL places that match our SSOT criteria
        targetCandidates = Object.values(project.data.places || {}).filter((p: any) => {
            if (!p.valid) return false; // Basic validity check
            // Use SSOT to verify category relevance
            if (VALID_POI_CATEGORIES.includes(p.category)) return true;
            // Legacy/Fallback check
            return resolveInterestId(p.category) !== undefined;
        });
    }

    // Chunking Logic (Preserved but adapted to new variable name)
    let processedCandidates = targetCandidates;
    const currentChunk = options.chunkIndex || 1;
    const totalChunks = options.totalChunks || 1;
    const limit = options.limit || 10;

    // If Orchestrator handles chunking via options.limit, slice here
    if (options.limit && targetCandidates.length > limit) {
         const start = (currentChunk - 1) * limit;
         const end = start + limit;
         processedCandidates = targetCandidates.slice(start, end);
    }

    // A. Sicherheits-Check: Wir brauchen echte Place-Objekte aus dem Store
    const validPlaces = processedCandidates; // Already resolved above

    // C. Enrichment (Anweisungen injizieren)
    const lang = (project.meta.language === 'en' ? 'en' : 'de');

    const editorialTasks = validPlaces.map((place: any) => {
        // 1. Basis-Anweisung
        let instructions = `Create a general, useful description for '${place.name}'.`;

        // 2. Spezifische Anweisung aus Interests suchen
        // FEATURE: Priority for manual 'customCategory' over detected 'category'
        const category = place.userSelection?.customCategory || place.category || 'general';
        const interestId = resolveInterestId(category);
        
        if (interestId) {
            const guideline = INTEREST_DATA[interestId]?.writingGuideline;
            if (guideline) {
                const text = (guideline as any)[lang] || (guideline as any)['de'];
                if (text) instructions = text;
            }
        }

        // 3. User Custom Preferences (Höchste Prio)
        if (interestId && project.userInputs.customWritingGuidelines?.[interestId]) {
            instructions += `\n\nUSER OVERRIDE: ${project.userInputs.customWritingGuidelines[interestId]}`;
        }

        // 4. NEW: Automatic Walking Tour Instruction for Districts
        if (isDistrict(category)) {
            instructions += `\n\n**SPECIAL FORMAT: WALKING TOUR.** This is a district/neighborhood. Do NOT write a static description. Instead, guide the user through the area. Mention 3-5 specific highlights/stops in a logical order (Start -> End).`;
        }

        // 5. DATEN-INJEKTION (Strict Facts)
        // Wir packen die harten Fakten in ein sauberes Objekt, damit das Template sie nutzen kann.
        return {
            id: place.id,
            titel: place.name,
            typ: category, // Pass effective category (custom or original)
            // Hier übergeben wir die Ergebnisse vom Anreicherer:
            facts: {
                address: place.address || "N/A",
                openingHours: place.openingHours || "N/A",
                location: place.location,
                description: place.description, // Der kurze Faktentext vom Anreicherer
                // ADDED: Logistics & Price for Template V2 (if available)
                logistics: place.logistics,
                price_estimate: place.price_estimate,
                originalCategory: place.category // Context for AI if needed
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
            role: "You are the 'Editor-in-Chief'. You turn provided facts into inspiring content."
        }
    };
};
// --- END OF FILE 140 Zeilen ---