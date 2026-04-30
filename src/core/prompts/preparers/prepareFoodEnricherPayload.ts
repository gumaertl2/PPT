// 06.02.2026 10:15 - FEATURE: DYNAMIC LINK FACTORY ("The Copenhagen Trick").
// - Ignores static homepage URLs.
// - Generates fresh, location-aware Google Search URLs for every guide.
// src/core/prompts/preparers/prepareFoodEnricherPayload.ts

import type { TripProject } from '../../types';
import { getGuidesForCountry } from '../../../data/countries';

export const prepareFoodEnricherPayload = (
    projectOrPayload: any, 
    feedback: string,      
    _options: any,          
    candidates: any[]      
) => {
    // 0. Resolve Project Input
    let project: TripProject | null = null;
    if (projectOrPayload.userInputs) {
        project = projectOrPayload;
    } else if (projectOrPayload.project) {
        project = projectOrPayload.project;
    }

    // 1. Safety Fallback for Candidates
    let finalCandidates = candidates;
    if (!finalCandidates && Array.isArray(feedback)) {
        finalCandidates = feedback as any;
    }

    // 2. Determine Target Country / Region
    let targetLocation = "";
    let guideOverride = "";

    // A: Ad-Hoc Override
    if (typeof feedback === 'string') {
        const countryMatch = feedback.match(/COUNTRY:([^|]+)/);
        if (countryMatch && countryMatch[1]) {
            targetLocation = countryMatch[1].trim();
        }
        const guidesMatch = feedback.match(/GUIDES:([^|]+)/);
        if (guidesMatch && guidesMatch[1]) {
            guideOverride = guidesMatch[1].trim();
        }
    }

    // B: Project Data Fallback
    if (!targetLocation && project) {
        const log = project.userInputs.logistics;
        if (log.target_countries && log.target_countries.length > 0) {
            targetLocation = log.target_countries[0];
        } else if (log.stationary?.destination) {
            targetLocation = log.stationary.destination;
            if (log.stationary.region && log.stationary.region !== log.stationary.destination) {
                targetLocation += `, ${log.stationary.region}`;
            }
        } else if (log.roundtrip?.region) {
            targetLocation = log.roundtrip.region;
        }
    }

    if (!targetLocation) targetLocation = "Europe";

    // 3. THE LINK FACTORY
    // Determine which guide names to use
    let guideNames: string[] = [];

    if (guideOverride) {
        // Use overrides (comma separated)
        guideNames = guideOverride.split(',').map(s => s.trim());
    } else {
        // Fetch from Knowledge Base
        const relevantGuides = getGuidesForCountry(targetLocation);
        if (relevantGuides.length > 0) {
            guideNames = relevantGuides.map(g => g.name);
        } else {
            // Fallback Defaults
            guideNames = ["Michelin", "Gault&Millau", "World's 50 Best", "TripAdvisor Travelers Choice"];
        }
    }

    // Generate Dynamic Links for Context (The "Trick")
    const guideReferences = guideNames.map(name => {
        // Create a specific search query for the Target Location
        // e.g. "Feinschmecker restaurant Hamburg" instead of just "Feinschmecker"
        const query = `${name} restaurant ${targetLocation}`;
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        return `- ${name}: ${url}`;
    }).join('\n');

    const guideString = guideNames.join(', ');

    return {
        context: {
            candidates_list: finalCandidates || [],
            target_country: targetLocation,
            allowed_guides: guideString,
            guide_tools: guideReferences // Passing the links to the template
        },
        instructions: {
            role: "Du bist ein strenger Restaurant-Kritiker und Fakten-Prüfer."
        }
    };
};
// --- END OF FILE 95 Zeilen ---