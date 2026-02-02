// 03.02.2026 13:30 - FIX: PASS GUIDE URLS.
// - Maps guides to "Name (URL)" so the AI can generate smart links.
// src/core/prompts/preparers/prepareFoodEnricherPayload.ts

import type { TripProject } from '../../types';
import { getGuidesForCountry } from '../../../data/countries';

export const prepareFoodEnricherPayload = (
    project: TripProject, 
    feedback: string,      
    options: any,          
    candidates: any[]      
) => {
    // 1. Safety Fallback
    let finalCandidates = candidates;
    if (!finalCandidates && Array.isArray(feedback)) {
        finalCandidates = feedback as any;
    }

    // 2. Dynamic Country Parsing
    let resolvedCountry = "Deutschland"; // Default
    if (typeof feedback === 'string') {
        const countryMatch = feedback.match(/COUNTRY:([^|]+)/);
        if (countryMatch && countryMatch[1]) {
            resolvedCountry = countryMatch[1].trim();
        }
    }

    // 3. Fetch Knowledge Base (Guides)
    const relevantGuides = getGuidesForCountry(resolvedCountry);
    
    // FIX: Pass URL to Context!
    const guideString = relevantGuides.length > 0 
        ? relevantGuides.map(g => `${g.name} (${g.searchUrl})`).join(', ') 
        : "Michelin, Gault&Millau, Varta";

    return {
        context: {
            candidates_list: finalCandidates || [],
            target_country: resolvedCountry,
            allowed_guides: guideString 
        },
        instructions: {
            role: "Du bist ein strenger Restaurant-Kritiker und Daten-Auditor."
        }
    };
};
// --- END OF FILE 50 Lines ---