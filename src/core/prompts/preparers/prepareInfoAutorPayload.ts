// 20.02.2026 15:30 - FEAT: Dynamically extracts all visited cities (districts/city_info) to generate complete A-Z guides.
// 20.02.2026 15:30 - FIX: Added country/region context to prevent AI from confusing cities (e.g. Wolkenstein in Sachsen vs Italien).
// 04.02.2026 12:20 - FIX: Restore logic (User Selection required).
// src/core/prompts/preparers/prepareInfoAutorPayload.ts

import type { TripProject } from '../../types';
import { INTEREST_DATA } from '../../../data/interests';

// --- HELPER: Resolve localized text ---
const resolveText = (content: any, lang: 'de' | 'en'): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return content[lang] || content['de'] || '';
};

// --- HELPER: Domestic Check (Heimatland-Filter) ---
const isDomesticTravel = (home: string, region: string, stops: string[]): boolean => {
    const normalize = (s: string) => s.toLowerCase().trim();
    const h = normalize(home);
    const destStr = (region + ' ' + stops.join(' ')).toLowerCase();

    if (h.includes('deutschland') || h.includes('germany')) {
        return destStr.includes('deutschland') || destStr.includes('germany') || destStr.includes('bayern') || destStr.includes('berlin');
    }
    if (h.includes('schweiz') || h.includes('switzerland')) {
        return destStr.includes('schweiz') || destStr.includes('switzerland') || destStr.includes('zürich');
    }
    if (h.includes('österreich') || h.includes('austria')) {
        return destStr.includes('österreich') || destStr.includes('austria') || destStr.includes('wien') || destStr.includes('tirol');
    }
    return false;
};

// --- HELPER: Same City Check (Heimatstadt-Filter) ---
const isSameCity = (cityA: string, cityB: string): boolean => {
    if (!cityA || !cityB) return false;
    return cityA.toLowerCase().trim() === cityB.toLowerCase().trim();
};

export const prepareInfoAutorPayload = (project: TripProject): any[] => {
    // FIX: Added 'data' to destructuring to access all places
    const { userInputs, meta, analysis, data } = project;
    const lang = meta.language === 'en' ? 'en' : 'de';
    
    // 1. GATHER LOGISTICS (Safe Access)
    const log = userInputs.logistics as any;
    const origin = log.origin || 
                   userInputs.logistics.roundtrip.startLocation || 
                   (userInputs.logistics.stationary as any)?.origin || 
                   "Unknown";

    let destinationRegion = "";
    let hubs: string[] = [];

    if (userInputs.logistics.mode === 'stationaer') {
        destinationRegion = userInputs.logistics.stationary.region || "";
        hubs = [userInputs.logistics.stationary.destination];
    } else {
        destinationRegion = userInputs.logistics.roundtrip.region || "";
        if (analysis.routeArchitect?.routes?.[0]?.stages) {
            hubs = analysis.routeArchitect.routes[0].stages.map((s: any) => s.location_name);
        } else {
            hubs = userInputs.logistics.roundtrip.stops.map((s: any) => s.location);
        }
    }

    // NEW FIX: Scan all generated places and add every "district" (Stadtbezirk) or "city_info" to the hubs array.
    const places = Object.values(data?.places || {});
    places.forEach((p: any) => {
        if (p.category === 'districts' || p.category === 'city_info') {
            // Extract the clean city name (removes things like "(Altstadt)")
            const cityNameMatch = p.name ? p.name.split('(')[0].trim() : '';
            if (cityNameMatch) {
                hubs.push(cityNameMatch);
            }
        }
    });

    // Remove duplicates and filter empty strings
    hubs = Array.from(new Set(hubs)).filter(h => h && h.length > 2);

    // 2. GENERATE TASKS
    const tasks: any[] = [];
    const selectedIds = userInputs.selectedInterests || [];

    const getInstruction = (id: string) => {
        const def = INTEREST_DATA[id];
        if (!def) return "";
        const strategy = resolveText(def.searchStrategy, lang);
        const guide = resolveText(def.writingGuideline, lang);
        return `### SEARCH STRATEGY (WHAT TO FIND)\n${strategy}\n\n### EDITORIAL GUIDELINE (HOW TO WRITE)\n${guide}`;
    };

    // A. TRAVEL INFO
    if (selectedIds.includes('travel_info')) {
        if (!isDomesticTravel(origin, destinationRegion, hubs)) {
            const contextLoc = destinationRegion || hubs[0] || "Destination";
            tasks.push({
                id: 'travel_info_general',
                typ: 'travel_info',
                titel: lang === 'de' ? 'Wissenswertes & Reiseinfos' : 'Travel Essentials',
                name: `Travel-Guide: ${contextLoc}`,
                contextLocation: contextLoc,
                anweisung: getInstruction('travel_info')
            });
        }
    }

    // B. CITY INFO
    if (selectedIds.includes('city_info')) {
        hubs.forEach((hub, index) => {
            if (!isSameCity(hub, origin)) {
                
                // NEW FIX: Append the Destination Region/Country to the Hub so the AI doesn't mix up cities (e.g. Wolkenstein)
                const contextualizedHub = destinationRegion ? `${hub} (${destinationRegion})` : hub;
                
                tasks.push({
                    id: `city_info_${index}`,
                    typ: 'city_info',
                    titel: lang === 'de' ? `Stadt-Info: ${hub}` : `City Info: ${hub}`,
                    name: `City-Info: ${hub}`,
                    contextLocation: contextualizedHub, 
                    anweisung: getInstruction('city_info')
                });
            }
        });
    }

    // C. GENERIC MODULES
    ['arrival', 'budget', 'ignored_places'].forEach(id => {
        if (selectedIds.includes(id)) {
            let contextStr = "";
            if (id === 'arrival') contextStr = `From: ${origin} To: ${hubs[0] || destinationRegion}`;
            if (id === 'budget') contextStr = `Budget Level: ${userInputs.budget}. Duration: ${userInputs.dates.duration} days.`;

            let title = INTEREST_DATA[id]?.label?.[lang] || id;
            if (id === 'arrival') title = lang === 'de' ? 'Anreise-Vergleich' : 'Arrival Comparison';
            if (id === 'budget') title = lang === 'de' ? 'Kosten-Schätzung' : 'Budget Estimation';

            tasks.push({
                id: id,
                typ: id,
                titel: title,
                name: title,
                contextLocation: contextStr,
                anweisung: getInstruction(id)
            });
        }
    });

    return tasks;
};
// --- END OF FILE 148 Zeilen ---