// 26.01.2026 19:40 - FIX: RESTORED Rich Logic (No Simplification).
// Returns full object { context, instructions } with strict Fact Injection.
// Fixed only TS6196 (Unused Place import).
// src/core/prompts/preparers/prepareChefredakteurPayload.ts

import type { TripProject } from '../../types';
import { INTEREST_DATA } from '../../../data/interests';

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

export const prepareChefredakteurPayload = (
    project: TripProject,
    candidates: any[], 
    currentChunk: number = 1,
    totalChunks: number = 1
) => {
    // A. Sicherheits-Check: Wir brauchen echte Place-Objekte aus dem Store
    const validPlaces = candidates.map(c => {
        const id = typeof c === 'string' ? c : c.id;
        return project.data.places[id];
    }).filter(p => p !== undefined);

    // B. Slicing Logik (falls nötig, hier vereinfacht übernommen)
    // Wenn 'candidates' schon der Chunk ist, brauchen wir nicht slicen.
    // Wir nehmen an, der Caller (PayloadBuilder) übergibt den korrekten Chunk.
    
    // C. Enrichment (Anweisungen injizieren)
    const lang = (project.meta.language === 'en' ? 'en' : 'de');

    const editorialTasks = validPlaces.map(place => {
        // 1. Basis-Anweisung
        let instructions = `Create a general, useful description for '${place.name}'.`;

        // 2. Spezifische Anweisung aus Interests suchen
        const interestId = resolveInterestId(place.category || 'general');
        
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

        // 4. DATEN-INJEKTION (Strict Facts)
        // Wir packen die harten Fakten in ein sauberes Objekt, damit das Template sie nutzen kann.
        return {
            id: place.id,
            titel: place.name,
            typ: place.category,
            // Hier übergeben wir die Ergebnisse vom Anreicherer:
            facts: {
                address: place.address || "N/A",
                openingHours: place.openingHours || "N/A",
                location: place.location,
                description: place.description // Der kurze Faktentext vom Anreicherer
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
// --- END OF FILE 88 Zeilen ---