// 28.01.2026 19:30 - FIX: Renamed 'titel' to 'name' to pass PayloadBuilder validation (sliceData requires 'name').
// 28.01.2026 19:00 - FIX: Added Fallback Region for IdeenScout if no Hubs are defined.
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
        // FIX: Extract from RouteArchitect (using location_name as confirmed in data)
        if (analysis.routeArchitect?.routes?.[0]?.stages) {
            const routeHubs = analysis.routeArchitect.routes[0].stages.map(s => s.location_name);
            if (routeHubs.length > 0) hubs = routeHubs;
        }
    }

    // Filter: Remove empty hubs and Home Location
    let validHubs = [...new Set(hubs)].filter(hub => 
        hub && 
        hub.length > 2 && 
        !isSameLocation(hub, origin)
    );

    // --- FALLBACK IF NO HUBS FOUND ---
    // Should typically not be needed if RouteArchitect ran, but prevents empty prompt crashes.
    if (validHubs.length === 0) {
        const region = userInputs.logistics.mode === 'stationaer' 
            ? userInputs.logistics.stationary.region 
            : userInputs.logistics.roundtrip.region;
            
        if (region && region.length > 2) {
            validHubs.push(region);
        }
    }

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
            // CRITICAL FIX: PayloadBuilder.sliceData requires 'name' property to be present!
            // Was 'titel' before, which caused the items to be filtered out silently.
            name: `Ideas for ${hub}`, 
            location: hub,
            blocked: blockedNames 
        };
    });
};
// --- END OF FILE 95 Zeilen ---