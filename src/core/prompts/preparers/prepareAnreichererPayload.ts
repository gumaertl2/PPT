// 24.01.2026 14:35 - FEAT: Smart Enricher Preparer. Injects Geo-Context from RouteArchitect (if avail) or UserInputs.
// src/core/prompts/preparers/prepareAnreichererPayload.ts

import type { TripProject } from '../../types';

export const prepareAnreichererPayload = (
    project: TripProject, 
    candidates: any[], 
    currentChunk: number, 
    totalChunks: number
) => {
    
    const { userInputs, analysis } = project;
    const routeArchitect = analysis.routeArchitect; // <--- LEVEL 2 TRUTH
    const { logistics, dates } = userInputs;

    // 1. Basic Data
    const datesString = `${dates.start} to ${dates.end}`;
    const chunkingInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

    // 2. Strategic Guideline (V40 Key) - From ChefPlaner
    const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                              (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                              "Enrich the places with helpful information.";

    // 3. GEO CONTEXT CALCULATION (The Fix for Multiple Locations)
    let geoContext = "";
    
    if (logistics.mode === 'mobil') {
        // Case: Rundreise (Multiple Locations / Borders)
        
        let routeStr = "";
        let region = logistics.roundtrip.region || "Unknown Region";
        
        // CHECK: RouteArchitect Data available?
        const calculatedRoute = routeArchitect?.routes?.[0];

        if (calculatedRoute && calculatedRoute.stages && calculatedRoute.stages.length > 0) {
             // Use Calculated Route
             const stages = calculatedRoute.stages.map(s => s.location_name);
             routeStr = stages.join(' -> ');
             geoContext = `**TRIP CONTEXT (CALCULATED ROUNDTRIP):**\nThe trip follows this exact route: ${routeStr}.\nRegion: ${region}.\nAssign the candidates to the correct location along this path.`;
        } else {
             // Fallback: User Inputs
             const stops = logistics.roundtrip.stops?.map(s => s.location) || [];
             const start = logistics.roundtrip.startLocation;
             const end = logistics.roundtrip.endLocation;
             routeStr = [start, ...stops, end].filter(Boolean).join(' -> ');
             geoContext = `**TRIP CONTEXT (PLANNED ROUNDTRIP):**\nThe trip follows this route: ${routeStr}.\nRegion: ${region}.\nAssign the candidates to the correct location along this path.`;
        }

    } else {
        // Case: Stationär
        const dest = logistics.stationary.destination || "Unknown Destination";
        const region = logistics.stationary.region;
        
        geoContext = `**TRIP CONTEXT (STATIONARY):**\nBase Location: ${dest} (${region || ''}).\nCandidates are likely in or near this location.`;
    }

    // 4. Candidate Mapping
    // We strip unnecessary data to save tokens, but keep ID and Name
    const candidatesList = candidates.map((p: any) => ({
        id: p.id,
        name: p.name || "Unknown Place"
    }));
    
    // User Supplements
    const userNotes = userInputs.notes ? `NOTE: "${userInputs.notes}"` : "";

    return {
        context: {
            travel_period: datesString,
            strategic_guideline: strategicBriefing,
            geo_context: geoContext, // <--- ROUTE CONTEXT
            user_note: userNotes,
            places_to_process: candidatesList
        },
        meta: {
            chunk_info: chunkingInfo,
            total_count: candidatesList.length
        }
    };
};
// --- END OF FILE 84 Zeilen ---