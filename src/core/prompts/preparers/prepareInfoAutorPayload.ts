// 26.01.2026 16:00 - FIX: Surgical Update for InfoAutor Logic.
// Implements "Home-Filter" (No domestic travel info, no home-city info).
// Combines 'searchStrategy' AND 'writingGuideline' for maximum context.
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

    // Simple Heuristic for DACH region (expandable)
    if (h.includes('deutschland') || h.includes('germany')) {
        return destStr.includes('deutschland') || destStr.includes('germany') || destStr.includes('bayern');
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

export const prepareInfoAutorPayload = (project: TripProject) => {
    const { userInputs, meta, analysis } = project;
    const lang = meta.language === 'en' ? 'en' : 'de';
    
    // 1. GATHER LOGISTICS
    const origin = userInputs.logistics.origin || "Unknown";
    let destinationRegion = "";
    let hubs: string[] = [];

    if (userInputs.logistics.mode === 'stationaer') {
        destinationRegion = userInputs.logistics.stationary.region;
        hubs = [userInputs.logistics.stationary.destination];
    } else {
        destinationRegion = userInputs.logistics.roundtrip.region;
        // Get Hubs from RouteArchitect (Priority) or User Input
        if (analysis.routeArchitect?.routes?.[0]?.stages) {
            hubs = analysis.routeArchitect.routes[0].stages.map(s => s.location_name);
        } else {
            hubs = userInputs.logistics.roundtrip.stops.map(s => s.location);
        }
    }
    // Cleanup Hubs
    hubs = hubs.filter(h => h && h.length > 2);

    // 2. GENERATE TASKS
    const tasks: any[] = [];
    const selectedIds = userInputs.selectedInterests || [];

    // Helper to build the full instruction block
    const getInstruction = (id: string) => {
        const def = INTEREST_DATA[id];
        if (!def) return "";
        
        const strategy = resolveText(def.searchStrategy, lang);
        const guide = resolveText(def.writingGuideline, lang);
        
        return `### SEARCH STRATEGY (WHAT TO FIND)\n${strategy}\n\n### EDITORIAL GUIDELINE (HOW TO WRITE)\n${guide}`;
    };

    // A. TRAVEL INFO (Country Level) - with Domestic Filter
    if (selectedIds.includes('travel_info')) {
        if (!isDomesticTravel(origin, destinationRegion, hubs)) {
            tasks.push({
                id: 'travel_info_general',
                type: 'travel_info',
                title: lang === 'de' ? 'Wissenswertes & Reiseinfos' : 'Travel Essentials',
                context: `Destination: ${destinationRegion} (International Trip from ${origin})`,
                instruction: getInstruction('travel_info')
            });
        }
    }

    // B. CITY INFO (Hub Level) - with Home City Filter
    if (selectedIds.includes('city_info')) {
        hubs.forEach((hub, index) => {
            if (!isSameCity(hub, origin)) {
                tasks.push({
                    id: `city_info_${index}`,
                    type: 'city_info',
                    title: lang === 'de' ? `Stadt-Info: ${hub}` : `City Info: ${hub}`,
                    context: `City Focus: ${hub}`,
                    instruction: getInstruction('city_info')
                });
            }
        });
    }

    // C. GENERIC MODULES (Arrival, Budget)
    ['arrival', 'budget'].forEach(id => {
        if (selectedIds.includes(id)) {
            let contextStr = "";
            if (id === 'arrival') contextStr = `From: ${origin} To: ${hubs[0] || destinationRegion}`;
            if (id === 'budget') contextStr = `Budget Level: ${userInputs.profile.budget}. Duration: ${userInputs.dates.duration} days.`;

            tasks.push({
                id: id,
                type: id,
                title: INTEREST_DATA[id]?.label[lang] || id,
                context: contextStr,
                instruction: getInstruction(id)
            });
        }
    });

    return {
        context: {
            tasks,
            target_language: userInputs.aiOutputLanguage || lang,
            destination: destinationRegion
        },
        instructions: {
            role: "You are the 'Info-Author'. You write helpful, factual guide chapters based on strict research and editorial guidelines."
        }
    };
};
// --- END OF FILE 115 Zeilen ---