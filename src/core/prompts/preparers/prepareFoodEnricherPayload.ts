// 05.02.2026 14:45 - FIX: REMOVE LOCAL EXPERTS & LINTING.
// - Removed "Local Experts" from fallback guides.
// - Prefixed unused 'options' parameter with underscore.
// src/core/prompts/preparers/prepareFoodEnricherPayload.ts

import type { TripProject } from '../../types';
import { getGuidesForCountry } from '../../../data/countries';

export const prepareFoodEnricherPayload = (
    projectOrPayload: any, 
    feedback: string,      
    _options: any,          
    candidates: any[]      
) => {
    // 0. Resolve Project Input (V40/Legacy Hybrid)
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

    // 2. Determine Target Country / Region (Priority Logic)
    let targetLocation = "";

    // A: Ad-Hoc Override (Highest Priority)
    if (typeof feedback === 'string') {
        const countryMatch = feedback.match(/COUNTRY:([^|]+)/);
        if (countryMatch && countryMatch[1]) {
            targetLocation = countryMatch[1].trim();
        }
    }

    // B: Project Data (The missing link!)
    if (!targetLocation && project) {
        const log = project.userInputs?.logistics;
        if (log) {
            // Try explicit country list first
            if (Array.isArray((log as any).target_countries) && (log as any).target_countries.length > 0) {
                targetLocation = (log as any).target_countries[0];
            }
            // Try Stationary Destination
            else if (log.mode === 'stationaer' && log.stationary?.destination) {
                targetLocation = log.stationary.destination;
                // If we have a region, append it for better context (e.g. "Kopenhagen, Dänemark")
                if (log.stationary.region && log.stationary.region !== log.stationary.destination) {
                    targetLocation += `, ${log.stationary.region}`;
                }
            } 
            // Try Roundtrip Region
            else if (log.roundtrip?.region) {
                targetLocation = log.roundtrip.region;
            }
        }
    }

    // C: Default (Last Resort)
    if (!targetLocation) {
        targetLocation = "Europe"; // Better than "Deutschland" to avoid false bias
    }

    // 3. Fetch Knowledge Base (Guides)
    // We pass the detected location (e.g. "Kopenhagen" or "Dänemark") to the harvester.
    const relevantGuides = getGuidesForCountry(targetLocation);
    
    // Fallback: If no specific guides found, use International Standards ONLY.
    // FIX: Removed "Local Experts" to enforce higher quality standards.
    const guideNames = relevantGuides.length > 0 
        ? relevantGuides.map(g => g.name) 
        : ["Michelin", "Gault&Millau", "World's 50 Best"];
        
    const guideString = guideNames.join(', ');

    return {
        context: {
            candidates_list: finalCandidates || [],
            target_country: targetLocation,
            allowed_guides: guideString 
        },
        instructions: {
            role: "Du bist ein strenger Restaurant-Kritiker und Fakten-Prüfer."
        }
    };
};
// --- END OF FILE 79 Zeilen ---