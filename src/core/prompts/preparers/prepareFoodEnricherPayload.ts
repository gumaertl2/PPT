// 02.02.2026 14:00 - FIX: GUIDE INJECTION FOR AUDITOR.
// - Extracts 'COUNTRY' from feedback string.
// - Fetches the specific guide list (Michelin, Varta...) for that country.
// - Passes this "Knowledge Base" to the Enricher template.
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
    // We try to find the country in the AdHoc string.
    let resolvedCountry = "Deutschland"; // Default
    
    if (typeof feedback === 'string') {
        const countryMatch = feedback.match(/COUNTRY:([^|]+)/);
        if (countryMatch && countryMatch[1]) {
            resolvedCountry = countryMatch[1].trim();
        }
    }

    // 3. Fetch Knowledge Base (Guides)
    // Now we arm the Auditor with the correct list of guides for this country.
    const relevantGuides = getGuidesForCountry(resolvedCountry);
    const guideNames = relevantGuides.map(g => g.name);
    const guideString = guideNames.length > 0 ? guideNames.join(', ') : "Michelin, Gault&Millau, Varta";

    return {
        context: {
            candidates_list: finalCandidates || [],
            target_country: resolvedCountry,
            allowed_guides: guideString // <-- THE KEY!
        },
        instructions: {
            role: "Du bist ein strenger Restaurant-Kritiker und Fakten-Prüfer."
        }
    };
};
// --- END OF FILE 50 Lines ---