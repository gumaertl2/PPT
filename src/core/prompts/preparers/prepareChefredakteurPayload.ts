// 24.01.2026 13:15 - FEAT: New Preparer Pattern. Separates Data Logic from PayloadBuilder.
// Implements Category-Clustering & Instruction-Injection for 'Chefredakteur'.
// src/core/prompts/preparers/prepareChefredakteurPayload.ts

import type { TripProject, Place } from '../../types';
import { INTEREST_DATA } from '../../../data/interests';

/**
 * Helfer: Versucht, die Kategorie eines Ortes auf eine Interest-ID zu mappen.
 */
const resolveInterestId = (category: string): string | undefined => {
    if (!category) return undefined;
    const cleanCat = category.toLowerCase().trim();
    
    // 1. Direkter Match (z.B. "museum" -> "museum")
    if (INTEREST_DATA[cleanCat]) return cleanCat;

    // 2. Fallback: Suche in Labels (z.B. "Architektur" -> "architecture")
    const foundId = Object.keys(INTEREST_DATA).find(key => {
        const def = INTEREST_DATA[key];
        return (
            def.label.de.toLowerCase() === cleanCat ||
            def.label.en.toLowerCase() === cleanCat
        );
    });

    return foundId;
};

/**
 * Der Preparer:
 * 1. Sammelt alle Orte.
 * 2. Sortiert sie nach Kategorie (Cluster-Strategie).
 * 3. Schneidet den aktuellen Chunk heraus.
 * 4. Injiziert die Schreib-Anweisungen aus INTEREST_DATA.
 */
export const prepareChefredakteurPayload = (
    project: TripProject,
    chunkIndex: number,
    limit: number
): any[] => {
    
    // A. Sammeln & Validieren
    const allPlaces = Object.values(project.data.places || {}).flat() as Place[];
    const validPlaces = allPlaces.filter(p => p.id && p.name);

    if (validPlaces.length === 0) return [];

    // B. Cluster-Strategie: Sortieren nach Kategorie
    // Damit landen z.B. alle Museen im gleichen Chunk, was den Kontext für die KI verbessert.
    validPlaces.sort((a, b) => {
        const catA = a.category || '';
        const catB = b.category || '';
        return catA.localeCompare(catB);
    });

    // C. Slicing (Chunking)
    // Wir berechnen den Slice basierend auf der sortierten Liste
    const startIndex = (chunkIndex - 1) * limit;
    const slicedPlaces = validPlaces.slice(startIndex, startIndex + limit);

    // D. Enrichment (Anweisungen injizieren)
    const lang = (project.meta.language === 'en' ? 'en' : 'de');

    return slicedPlaces.map(place => {
        // 1. Basis-Anweisung (Fallback)
        let instructions = `Create a general, useful description for '${place.name}'.`;

        // 2. Spezifische Anweisung aus Interests suchen
        const interestId = resolveInterestId(place.category);
        
        if (interestId) {
            const guideline = INTEREST_DATA[interestId]?.writingGuideline;
            if (guideline) {
                instructions = guideline[lang] || guideline['de'];
            }
        }

        // 3. User Custom Preferences (Höchste Prio)
        // Falls der User für dieses Interesse eine eigene Anweisung geschrieben hat
        if (interestId && project.userInputs.customWritingGuidelines?.[interestId]) {
            instructions += `\n\nUSER OVERRIDE: ${project.userInputs.customWritingGuidelines[interestId]}`;
        }

        // Return Mapping (Kompatibel mit buildChefredakteurPrompt)
        return {
            ...place, // Behalte alle Original-Daten (Adresse etc.) für den Context-Builder
            id: place.id,
            titel: place.name,
            typ: place.category,
            anweisung: instructions
        };
    });
};
// --- END OF FILE 86 Zeilen ---