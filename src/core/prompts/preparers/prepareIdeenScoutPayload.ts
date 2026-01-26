// 26.01.2026 19:20 - FIX: Type Safety for Logistics & Unused Var cleanup.
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
    const { userInputs, analysis, data } = project; // Removed meta
    
    // 1. IDENTIFY HOME (Origin) - Safe Access
    const log = userInputs.logistics as any;
    const origin = log.origin || 
                   userInputs.logistics.roundtrip.startLocation || 
                   (userInputs.logistics.stationary as any)?.origin || 
                   "";

    // 2. IDENTIFY HUBS (Where do we stay?)
    let hubs: string[] = [];
    
    if (userInputs.logistics.mode === 'stationaer') {
        if (userInputs.logistics.stationary.destination) {
            hubs.push(userInputs.logistics.stationary.destination);
        }
    } else {
        if (userInputs.logistics.roundtrip.stops) {
            hubs = userInputs.logistics.roundtrip.stops.map(s => s.location);
        }
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

    // 3. GENERATE BLOCKED LIST
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
            blocked: blockedNames 
        };
    });
};
// --- END OF FILE 75 Zeilen ---