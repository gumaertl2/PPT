// 04.02.2026 12:20 - FIX: Restore logic (User Selection required).
// Reverted mandatory core modules. Tasks are only generated if selected in userInputs.
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
    const { userInputs, meta, analysis } = project;
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
            hubs = analysis.routeArchitect.routes[0].stages.map(s => s.location_name);
        } else {
            hubs = userInputs.logistics.roundtrip.stops.map(s => s.location);
        }
    }
    hubs = hubs.filter(h => h && h.length > 2);

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
                tasks.push({
                    id: `city_info_${index}`,
                    typ: 'city_info',
                    titel: lang === 'de' ? `Stadt-Info: ${hub}` : `City Info: ${hub}`,
                    name: `City-Info: ${hub}`,
                    contextLocation: hub,
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
            // FIX: 'userInputs.budget' instead of 'profile.budget'
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
// --- END OF FILE 135 Zeilen ---