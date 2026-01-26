// 26.01.2026 17:30 - FEAT: New Preparer for IdeenScout (Batch Mode).
// Generates tasks for all overnight hubs, excluding home location.
// Collects already planned places to prevent duplicates (Blocked List).
// src/core/prompts/preparers/prepareIdeenScoutPayload.ts

import type { TripProject } from '../../types';

// --- HELPER: Normalize Strings ---
const normalize = (s: string) => s.toLowerCase().trim();

// --- HELPER: Check if locations are identical ---
const isSameLocation = (locA: string, locB: string): boolean => {
    if (!locA || !locB) return false;
    const a = normalize(locA);
    const b = normalize(locB);
    return a.includes(b) || b.includes(a);
};

export const prepareIdeenScoutPayload = (project: TripProject): any[] => {
    const { userInputs, meta, analysis, data } = project;
    
    // 1. IDENTIFY HOME (Origin)
    const origin = userInputs.logistics.origin || "";

    // 2. IDENTIFY HUBS (Where do we stay?)
    let hubs: string[] = [];
    
    if (userInputs.logistics.mode === 'stationaer') {
        // Stationary: Just the destination
        if (userInputs.logistics.stationary.destination) {
            hubs.push(userInputs.logistics.stationary.destination);
        }
    } else {
        // Roundtrip: All stops
        if (userInputs.logistics.roundtrip.stops) {
            hubs = userInputs.logistics.roundtrip.stops.map(s => s.location);
        }
        // Fallback to RouteArchitect if available
        if (analysis.routeArchitect?.routes?.[0]?.stages) {
            const routeHubs = analysis.routeArchitect.routes[0].stages.map(s => s.location_name);
            if (routeHubs.length > 0) hubs = routeHubs;
        }
    }

    // Filter: Remove empty hubs and Home Location
    const validHubs = [...new Set(hubs)].filter(hub => 
        hub && 
        hub.length > 2 && 
        !isSameLocation(hub, origin)
    );

    // 3. GENERATE BLOCKED LIST (Already planned places)
    // We send NAMES to the AI, so it knows "Don't suggest the Louvre again".
    const plannedPlaces = Object.values(data.places || {});
    const blockedNames = plannedPlaces
        .map(p => p.name)
        .filter(n => n && n.length > 2);

    // 4. GENERATE TASKS
    return validHubs.map((hub, index) => {
        return {
            id: `ideen_scout_${index}`,
            typ: 'ideas',
            titel: `Ideas for ${hub}`,
            location: hub,
            blocked: blockedNames // Pass the full list to every task (or optimized per region if needed)
        };
    });
};
// --- END OF FILE 72 Zeilen ---