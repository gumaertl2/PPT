// 05.02.2026 16:30 - REFACTOR: RESULT UTILS (SHARED LOGIC).
// Extracted from ResultProcessor.ts to enforce Separation of Concerns.
// src/services/processors/resultUtils.ts

import { v4 as uuidv4 } from 'uuid';
import { countryGuideConfig, type GuideDef } from '../../data/countries';

// --- HELPER: LEVENSHTEIN DISTANCE ---
export const getSimilarity = (s1: string, s2: string): number => {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;

    const costs = new Array();
    for (let i = 0; i <= longer.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= shorter.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[shorter.length] = lastValue;
    }
    return (longerLength - costs[shorter.length]) / longerLength;
};

// --- HELPER: SMART ID FINDER ---
export const resolvePlaceId = (item: any, existingPlaces: Record<string, any>, debug: boolean, incomingCategory?: string): string | undefined => {
    // 1. Direct ID Match
    if (item.id && existingPlaces[item.id]) {
        if (incomingCategory === 'Restaurant') {
             const p = existingPlaces[item.id];
             const isExistingSight = ['Sight', 'Attraktion', 'Landmark', 'Sehenswürdigkeit'].includes(p.category);
             if (isExistingSight) {
                 if (debug) console.warn(`[ResultProcessor] 🛡️ ID Collision Shield: Ignored ID match for "${p.name}" (Sight) vs "${item.name}" (Restaurant).`);
                 return undefined; 
             }
        }
        return item.id;
    }

    // 2. Intelligent Name Match
    const nameToCheck = item.name || item.original_name || item.name_official;
    if (nameToCheck) {
        const searchName = nameToCheck.trim().toLowerCase();
        let bestMatchId: string | undefined = undefined;
        let bestScore = 0;

        Object.values(existingPlaces).forEach((p: any) => {
            if (!p.name) return;
            if (incomingCategory === 'Restaurant') {
                const isExistingSight = ['Sight', 'Attraktion', 'Landmark', 'Sehenswürdigkeit'].includes(p.category);
                if (isExistingSight) return;
            }
            const targetName = p.name.trim().toLowerCase();
            
            // A. Fuzzy Score
            let score = getSimilarity(searchName, targetName);
            
            // B. Substring Boost
            if (targetName.includes(searchName) || searchName.includes(targetName)) {
                if (Math.min(targetName.length, searchName.length) > 4) {
                    if (debug) console.log(`[ResultProcessor] 🔗 Substring Match detected: "${searchName}" <-> "${targetName}"`);
                    score = Math.max(score, 0.95);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatchId = p.id;
            }
        });

        if (bestScore > 0.85 && bestMatchId) { 
            if (debug) console.log(`[ResultProcessor] 🧠 Fuzzy Match: "${searchName}" ≈ "${existingPlaces[bestMatchId].name}" (${(bestScore*100).toFixed(0)}%)`);
            return bestMatchId;
        }
    }
    return undefined;
};

// --- HELPER: URL SANITIZER (DYNAMIC) ---
export const sanitizeUrl = (url: string | undefined, item: any): string => {
    const query = `${item.name || item.original_name} ${item.city || ''}`.trim().replace(/\s+/g, '+');
    const cleanFallback = `https://www.google.com/search?q=${query}`;

    if (!url || url.trim() === '') return cleanFallback;

    let safeUrl = url.trim();
    if (safeUrl.includes('gl=lk')) safeUrl = safeUrl.replace(/&?gl=lk/g, '');
    if (safeUrl.includes('gl=us')) safeUrl = safeUrl.replace(/&?gl=us/g, '');
    
    if (!safeUrl.startsWith('http')) return cleanFallback;

    return safeUrl;
};

// --- HELPER: THE VACUUM CLEANER V4 ---
export const extractItems = (data: any, allowStrings: boolean = true): any[] => {
    let items: any[] = [];
    if (!data) return [];

    if (Array.isArray(data)) {
        data.forEach(element => {
            if (typeof element === 'object' && element !== null) {
                items = items.concat(extractItems(element, allowStrings));
            } else if (typeof element === 'string') {
                if (allowStrings && element.trim().length > 0) items.push(element);
            }
        });
        return items;
    }

    if (typeof data !== 'object') return [];
    if (data.context || data.input || data.candidates_list || data.original_input) {}

    const isPlace = (data.name || data.id || data.original_name) 
        && !data.candidates && !data.enriched_places && !data.places && !data.results && !data.recommended_hubs
        && !data.context && !data.input; 

    if (isPlace) items.push(data);

    const containerKeys = ['candidates', 'enriched_candidates', 'processed_places', 'enriched_places', 'sights', 'items', 'places', 'results', 'chapters', 'recommendations', 'articles'];
    let foundContainer = false;

    for (const key of containerKeys) {
        if (data[key]) {
            items = items.concat(extractItems(data[key], allowStrings));
            foundContainer = true;
        }
    }

    if (!foundContainer && !data.recommended_hubs) {
         Object.keys(data).forEach(key => {
             if (['context', 'input', 'logs', 'meta', 'candidates_list', 'original_input', 'analysis'].includes(key)) return;
             const value = data[key];
             if (typeof value === 'object' && value !== null) {
                 items = items.concat(extractItems(value, allowStrings));
             }
         });
    }
    return items;
};

// --- BLACKLIST CHECKER ---
export const isGarbageName = (name: string): boolean => {
    if (!name) return true;
    const lower = name.toLowerCase().trim();
    const blacklist = [
        'michelin', 'falstaff', 'gault&millau', 'gault & millau', 'gault millau', 
        'feinschmecker', 'der feinschmecker', 'tripadvisor', 'travelers\' choice', 
        'google maps', 'google reviews', 'yelp', 'guide', 'restaurantführer'
    ];
    if (blacklist.includes(lower)) return true;
    if (lower.includes('michelin') && lower.length < 15) return true;
    return false;
};

// --- SSOT HELPER ---
export const isEnrichedItem = (item: any): boolean => {
    return !!(
        item.original_name || 
        (item.user_ratings_total !== undefined) || 
        item.logistics_tip ||
        item.verification_status === 'verified' ||
        (Array.isArray(item.awards) && item.awards.length > 0) ||
        (Array.isArray(item.guides) && item.guides.length > 0) || 
        item.signature_dish
    );
};

// --- DOWNLOAD GENERATOR ---
export const triggerCountriesDownload = (updatedConfig: Record<string, GuideDef[]>) => {
    const fileContent = `// src/data/countries.ts
// UPDATED AUTOMATICALLY BY FOODSCOUT HARVESTER
// ${new Date().toISOString()}

export const metadata = {
    lastUpdated: "${new Date().toISOString()}"
};

export interface GuideDef {
    name: string;
    searchUrl: string;
}

// SINGLE SOURCE OF TRUTH - SORTED BY COUNTRY
export const countryGuideConfig: Record<string, GuideDef[]> = ${JSON.stringify(updatedConfig, null, 4)};

export function getGuidesForCountry(countryName: string | undefined): GuideDef[] {
    if (!countryName) return [];
    if (countryGuideConfig[countryName]) return countryGuideConfig[countryName];
    const normalized = countryName.toLowerCase();
    const foundKey = Object.keys(countryGuideConfig).find(k => 
        k.toLowerCase() === normalized || 
        normalized.includes(k.toLowerCase()) || 
        k.toLowerCase().includes(normalized)
    );
    if (foundKey) return countryGuideConfig[foundKey];
    return [];
}
`;
    const blob = new Blob([fileContent], { type: 'application/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'countries.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
// --- END OF FILE 196 Zeilen ---