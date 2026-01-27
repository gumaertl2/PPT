// 27.01.2026 22:40 - FIX: Added 'duration' & 'user_ratings_total' to requested fields.
// Also added 'NON_PHYSICAL_KEYWORDS' filter to prevent meta-info enrichment.
// src/core/prompts/preparers/prepareAnreichererPayload.ts

import type { TripProject } from '../../types';

// V40: BLACKLIST for Enricher
// These items should NEVER be enriched as "Places". They belong to InfoAutor.
const NON_PHYSICAL_KEYWORDS = [
    'reiseinfos', 'travel info', 'wissenswertes', 'budget', 
    'anreise', 'arrival', 'stadtinfos', 'city info', 
    'sicherheit', 'safety', 'klima', 'climate'
];

export const prepareAnreichererPayload = (
    project: TripProject,
    candidates: any[], 
    currentChunk: number = 1,
    totalChunks: number = 1
) => {
    const { meta, userInputs, analysis } = project;
    const uiLang = meta.language === 'en' ? 'en' : 'de';
    
    // 1. GLOBAL GEO CONTEXT
    let globalContext = "";

    // PRIORITY A: Route Architect
    const calculatedRoute = analysis.routeArchitect?.routes?.[0];
    
    if (userInputs.logistics.mode === 'mobil' && calculatedRoute) {
        const stages = calculatedRoute.stages?.map(s => s.location_name).join(" -> ");
        globalContext = `Roundtrip Route: ${stages}`;
        if (calculatedRoute.waypoints) {
            globalContext += ` (via: ${calculatedRoute.waypoints.map(w => w.location).join(", ")})`;
        }
    } 
    // PRIORITY B: Stationary
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

    // 2. DATA PREPARATION (WITH FILTERING)
    const itemsToEnrich = candidates
        .filter(c => {
            // Safety Check
            if (!c) return false;
            const nameToCheck = (typeof c === 'string' ? c : c.name || "").toLowerCase();
            
            // Filter: Ignore Meta-Infos
            if (NON_PHYSICAL_KEYWORDS.some(kw => nameToCheck.includes(kw))) {
                return false;
            }
            return true;
        })
        .map(c => {
            if (typeof c === 'string') return { name: c };
            return { 
                name: c.name,
                id: c.id, 
                context_hint: c.vicinity || c.region || globalContext 
            };
        });

    // 3. TARGET FIELDS (Updated with duration & user_ratings_total)
    const requestedFields = [
        "official_name (Correct spelling)", 
        "address (Street, ZIP, City)",       
        "location (lat, lng)",      
        "description (Factual short description, max 2 sentences)",   
        "openingHours (String representation)",  
        "rating (Number or null)",
        "user_ratings_total (Integer count of reviews)", // NEW
        "duration (Estimated visit duration in minutes)", // NEW
        "category (Inferred category)"       
    ];

    const chunkInfo = `Processing Block ${currentChunk} of ${totalChunks}`;
    
    return {
        context: {
            candidates_list: itemsToEnrich,
            search_region: globalContext,
            required_fields: requestedFields, 
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
// --- END OF FILE 109 Zeilen ---