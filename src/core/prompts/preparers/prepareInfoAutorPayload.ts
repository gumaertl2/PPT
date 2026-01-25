// 25.01.2026 13:30 - FEAT: Smart Preparer for InfoAutor.
// Implements business logic:
// 1. Always generate CityInfo for stops (skip Home).
// 2. Always generate TravelInfo for international trips (skip Domestic).
// 3. Optional chapters (Budget, Arrival) only if selected.
// src/core/prompts/preparers/prepareInfoAutorPayload.ts

import type { TripProject } from '../../types';
import { INTEREST_DATA } from '../../../data/interests';

// --- HELPER: Simple Domestic Travel Check ---
const isDomesticTravel = (home: string, region: string, stops: string[]): boolean => {
    const normalize = (s: string) => s.toLowerCase().trim();
    const h = normalize(home);
    const destStr = (region + ' ' + stops.join(' ')).toLowerCase();

    // Heuristic: If home contains country name and dest contains same country/major cities
    // (This can be expanded with real geo-data later)
    if (h.includes('deutschland') || h.includes('germany')) {
        return destStr.includes('deutschland') || destStr.includes('germany') || destStr.includes('bayern') || destStr.includes('berlin') || destStr.includes('hamburg') || destStr.includes('münchen') || destStr.includes('köln');
    }
    if (h.includes('schweiz') || h.includes('switzerland')) {
        return destStr.includes('schweiz') || destStr.includes('switzerland') || destStr.includes('zürich') || destStr.includes('bern') || destStr.includes('basel');
    }
    if (h.includes('österreich') || h.includes('austria')) {
        return destStr.includes('österreich') || destStr.includes('austria') || destStr.includes('wien') || destStr.includes('salzburg') || destStr.includes('innsbruck');
    }
    
    return false; // Default to International (Show Info)
};

const cleanLocationName = (loc: string): string => {
    if (!loc) return "";
    return loc.split(',')[0].trim(); // "München, Deutschland" -> "München"
};

export const prepareInfoAutorPayload = (project: TripProject): any[] => {
    const tasks: any[] = [];
    const { userInputs, meta } = project;
    const lang = meta.language === 'en' ? 'en' : 'de';

    // 1. LOGISTICS ANALYSIS
    let homeLocation = "";
    let stops: string[] = [];
    let region = "";

    if (userInputs.logistics.mode === 'roundtrip') {
        homeLocation = userInputs.logistics.roundtrip.startLocation || "";
        region = userInputs.logistics.roundtrip.region || "";
        stops = userInputs.logistics.roundtrip.stops.map(s => s.location);
        // Include EndLocation if it's a stop and not home
        if (userInputs.logistics.roundtrip.endLocation && userInputs.logistics.roundtrip.endLocation !== homeLocation) {
            stops.push(userInputs.logistics.roundtrip.endLocation);
        }
    } else {
        homeLocation = (userInputs.logistics.stationary as any).origin || "";
        region = userInputs.logistics.stationary.destination || "";
        stops = [region];
    }

    const cleanHome = cleanLocationName(homeLocation);

    // 2. MANDATORY: CITY INFOS (For all visited places EXCEPT Home)
    const uniqueStops = Array.from(new Set(stops.filter(Boolean)));
    
    uniqueStops.forEach(stop => {
        const cleanStop = cleanLocationName(stop);
        
        // Skip if it is the home town
        if (cleanHome && cleanStop.toLowerCase() === cleanHome.toLowerCase()) {
            return;
        }

        const def = INTEREST_DATA['city_info'];
        tasks.push({
            id: `city_${cleanStop.replace(/\s/g, '_')}`,
            typ: 'StadtInfo', // Matches Template Check
            titel: `City-Check: ${stop}`,
            name: `City-Check: ${stop}`, // Required for PayloadBuilder filter
            contextLocation: stop,
            anweisung: def?.writingGuideline?.[lang] || ""
        });
    });

    // 3. MANDATORY: TRAVEL INFO (Only if NOT domestic)
    if (!isDomesticTravel(homeLocation, region, stops)) {
        const def = INTEREST_DATA['travel_info'];
        // Context is Region or first stop
        const contextLoc = region || stops[0] || "Reiseziel";

        tasks.push({
            id: 'travel_info_general',
            typ: 'Reiseinformationen', // Matches Template Check
            titel: `Travel-Guide: ${contextLoc}`,
            name: `Travel-Guide: ${contextLoc}`, // Required for PayloadBuilder filter
            contextLocation: contextLoc,
            anweisung: def?.writingGuideline?.[lang] || "" 
        });
    }

    // 4. OPTIONAL: CHECKBOX BASED (Budget, Arrival, Ignored)
    const optionalIds = ['budget', 'arrival', 'ignored_places'];

    optionalIds.forEach(id => {
        if (userInputs.selectedInterests.includes(id)) {
            const def = INTEREST_DATA[id];
            
            // Dynamic Titles
            let title = def?.label?.[lang] || id;
            if (id === 'arrival') title = lang === 'de' ? 'Anreise-Vergleich' : 'Arrival Comparison';
            if (id === 'budget') title = lang === 'de' ? 'Kosten-Schätzung' : 'Budget Estimation';

            tasks.push({
                id: id,
                typ: id === 'arrival' ? 'Anreise' : (id === 'budget' ? 'Budget' : 'Unberuecksichtigt'),
                titel: title,
                name: title, // Required for PayloadBuilder filter
                anweisung: def?.writingGuideline?.[lang] || ""
            });
        }
    });

    return tasks;
};
// --- END OF FILE 107 Zeilen ---