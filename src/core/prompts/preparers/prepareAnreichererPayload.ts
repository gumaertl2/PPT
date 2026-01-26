// 26.01.2026 12:45 - FIX: Enhanced Geo-Context with RouteArchitect Data.
// Now prioritizes the calculated route (if available) over raw user inputs
// to give the Enricher the most precise search corridor possible.
// src/core/prompts/preparers/prepareAnreichererPayload.ts

import type { TripProject } from '../../types';

export const prepareAnreichererPayload = (
    project: TripProject,
    candidates: any[], 
    currentChunk: number = 1,
    totalChunks: number = 1
) => {
    const { meta, userInputs, analysis } = project;
    const uiLang = meta.language === 'en' ? 'en' : 'de';
    
    // 1. GLOBAL GEO CONTEXT (The Safety Net)
    // We construct a precise "Search Corridor" string.
    let globalContext = "";

    // PRIORITY A: Route Architect (Most precise for Roundtrips)
    const calculatedRoute = analysis.routeArchitect?.routes?.[0];
    
    if (userInputs.logistics.mode === 'mobil' && calculatedRoute) {
        // Use the calculated stages as the defined corridor
        const stages = calculatedRoute.stages?.map(s => s.location_name).join(" -> ");
        globalContext = `Roundtrip Route: ${stages}`;
        if (calculatedRoute.waypoints) {
            globalContext += ` (via: ${calculatedRoute.waypoints.map(w => w.location).join(", ")})`;
        }
    } 
    // PRIORITY B: User Inputs (Fallback or Stationary)
    else if (userInputs.logistics.mode === 'stationaer') {
        const dest = userInputs.logistics.stationary.destination || "";
        const reg = userInputs.logistics.stationary.region || "";
        globalContext = `Stationary Base: ${dest}, ${reg}`.replace(/^, /, "").trim();
    } 
    else {
        // Roundtrip without Architect
        const region = userInputs.logistics.roundtrip.region || "Roundtrip Region";
        globalContext = region;
        const stops = userInputs.logistics.roundtrip.stops.map(s => s.location).filter(Boolean).join(", ");
        if (stops) globalContext += ` (Stops: ${stops})`;
    }

    if (!globalContext) globalContext = "Destination of the Trip";

    // 2. DATA PREPARATION
    const itemsToEnrich = candidates.map(c => {
        // If it's a string, use it as name
        if (typeof c === 'string') return { name: c };
        
        // If it's an object, extract name and ID. 
        return { 
            name: c.name,
            id: c.id, 
            // We hint the AI to look within the global context OR specific vicinity if available
            context_hint: c.vicinity || c.region || globalContext 
        };
    });

    // 3. TARGET FIELDS DEFINITION
    const requestedFields = [
        "official_name", // Correct spelling
        "address",       // Street, ZIP, City
        "location",      // { lat, lng }
        "description",   // Factual short description (max 2 sentences)
        "openingHours",  // String representation
        "rating",        // Number or null
        "category"       // inferred category (Sight, Nature, Museum, etc.)
    ];

    const chunkInfo = `Processing Block ${currentChunk} of ${totalChunks}`;
    
    return {
        context: {
            candidates_list: itemsToEnrich,
            search_region: globalContext, // <-- NOW INCLUDES ROUTE ARCHITECT DATA
            chunk_progress: chunkInfo,
            target_language: userInputs.aiOutputLanguage || uiLang
        },
        instructions: {
            role: "You are a Data Enrichment Bot. You do not interpret user wishes. You only verify availability and location.",
            task: "For each item in 'candidates_list', identify the place within 'search_region' and find the requested fields.",
            strict_rule: "If a place is permanently closed or cannot be found in the specified region, set 'valid': false."
        }
    };
};
// --- END OF FILE 90 Zeilen ---