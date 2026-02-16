// 16.02.2026 21:30 - FIX: TYPE ASSIGNMENT (Vercel Build Error).
// 09.02.2026 14:15 - FIX: Integrated 'Rejected' Filter into User's Custom FoodProcessor.
// 06.02.2026 13:35 - REFACTOR: SIMPLE LINK STORAGE.
// src/services/processors/FoodProcessor.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../../store/useTripStore';
import { extractItems, resolvePlaceId, isGarbageName, isEnrichedItem, sanitizeUrl, triggerCountriesDownload } from './resultUtils';
import { countryGuideConfig, type GuideDef } from '../../data/countries';

export const FoodProcessor = {
    processFoodOrHotel: (data: any, step: string, debug: boolean) => {
        const { updatePlace, project } = useTripStore.getState();
        
        // 1. Unboxing (Standard)
        let itemsToProcess = data;
        if (data && typeof data === 'object' && Array.isArray(data.candidates)) {
            itemsToProcess = data.candidates;
            if (debug) console.log(`[FoodProcessor] Unboxed ${itemsToProcess.length} items from 'candidates' property.`);
        }

        // 2. Extraction
        let extractedItems: any[] = [];
        if (Array.isArray(itemsToProcess)) {
            extractedItems = itemsToProcess;
        } else {
            extractedItems = extractItems(itemsToProcess, false);
        }
        
        // 3. Category
        const systemCategory = ['food', 'foodScout', 'foodEnricher'].includes(step) ? 'Restaurant' : 'Hotel';

        if (extractedItems.length > 0) {
            const rawCandidates: any[] = []; 
            const existingPlaces = project.data?.places || {};
            let savedCount = 0;
            let rejectedCount = 0; // Stats

            extractedItems.forEach((item: any) => {
                if (typeof item === 'string') return;
                
                // FIX START: Reject Check (Anti-Hallucination)
                if (item.verification_status === 'rejected' || (item.address && item.address.includes('Rejected'))) {
                    rejectedCount++;
                    if (debug) console.warn(`[FoodProcessor] 🛡️ Blocked invalid candidate: "${item.name}"`);
                    return; // SKIP THIS ITEM
                }
                // FIX END

                const name = item.name || item.name_official || item.original_name;
                
                if (isGarbageName(name)) return;
                
                if (name) {
                    if (step === 'foodEnricher' && !isEnrichedItem(item)) return; 

                    // Smart Match
                    const resolvedId = resolvePlaceId({ ...item, name }, existingPlaces, false, systemCategory);
                    const id = resolvedId || item.id || uuidv4(); 
                    const existingPlace = existingPlaces[id];

                    // SSOT Protection
                    const incomingIsEnriched = isEnrichedItem(item);
                    const existingIsEnriched = existingPlace && isEnrichedItem(existingPlace);
                    if (existingIsEnriched && !incomingIsEnriched) return; 

                    const finalName = item.name_official || name;
                    
                    // --- SIMPLE LINK LOGIC ---
                    const cleanGuideLink = sanitizeUrl(item.guide_link, item);
                    const cleanSourceUrl = sanitizeUrl(item.source_url || item.website, item);

                    const { category: _aiCategory, source_url: _unused, guide_link: _unused2, ...cleanItem } = item;

                    updatePlace(id, {
                        id,
                        name: finalName,
                        category: systemCategory, 
                        awards: (item.awards && item.awards.length > 0) ? item.awards : (existingPlace ? (existingPlace as any).awards : []),
                        phone: item.phone,
                        website: item.website,
                        openingHours: item.openingHours,
                        vibe: item.vibe,
                        signature_dish: item.signature_dish,
                        cuisine: item.cuisine,
                        priceLevel: item.priceLevel,
                        
                        // New Fields
                        rating: item.rating,
                        user_ratings_total: item.user_ratings_total,
                        guide_link: cleanGuideLink, // Store the AI proof
                        
                        source_url: cleanSourceUrl,
                        ...cleanItem 
                    });
                    savedCount++;

                    if (step === 'foodScout') {
                        rawCandidates.push({
                            id,
                            name: finalName,
                            city: item.city || item.ort,
                            address: item.address,
                            location: item.location 
                        });
                    }
                }
            });

            // Handover to Store (Scout Mode)
            if (step === 'foodScout' && rawCandidates.length > 0) {
                console.log(`[FoodProcessor] 🤝 Handing over ${rawCandidates.length} candidates.`);
                useTripStore.setState((s) => ({
                    project: {
                        ...s.project,
                        data: {
                            ...s.project.data,
                            content: {
                                ...s.project.data.content,
                                rawFoodCandidates: rawCandidates 
                            }
                        }
                    }
                }));

                handleGuideHarvesting(extractedItems, project);
            }
            console.log(`[${systemCategory}] Stored ${savedCount} valid items. Blocked ${rejectedCount} invalid items.`);
        } else {
            if (debug) console.warn(`[FoodProcessor] Warning: No items extracted from data.`, data);
        }
    }
};

function handleGuideHarvesting(items: any[], project: any) {
    const foundGuides = new Set<string>();
    items.forEach((item: any) => {
        const sources = [...(item.awards || []), ...(item.guides || [])];
        if (Array.isArray(sources)) {
            sources.forEach((g: string) => {
                if (g && g.length > 3 && !g.includes("Google") && !g.includes("Unknown")) {
                    foundGuides.add(g);
                }
            });
        }
    });

    if (foundGuides.size > 0) {
        const targetCountry = (project.userInputs?.logistics as any)?.target_countries?.[0] || 
                              project.userInputs?.logistics?.stationary?.destination || 
                              "Unknown";
        
        const existingConfig = countryGuideConfig[targetCountry] || [];
        const existingNames = existingConfig.map(g => g.name);
        
        const newGuideNames = Array.from(foundGuides).filter(g => !existingNames.includes(g));

        if (newGuideNames.length > 0) {
            const guideList = newGuideNames.join("\n- ");
            const userConfirmed = window.confirm(
                `📍 UPDATE FÜR ${targetCountry.toUpperCase()}\n\n` +
                `Der FoodScout hat neue Quellen gefunden:\n- ${guideList}\n\n` +
                `Soll die Datei "countries.ts" aktualisiert heruntergeladen werden?`
            );

            if (userConfirmed) {
                const newConfig = { ...countryGuideConfig };
                const newDefs: GuideDef[] = newGuideNames.map(name => ({
                    name,
                    searchUrl: `https://www.google.com/search?q=${encodeURIComponent(name + ' restaurant ' + targetCountry)}`,
                    searchTerms: '' // FIX: Added missing property to satisfy GuideDef interface
                }));
                
                newConfig[targetCountry] = [...(existingConfig || []), ...newDefs];
                triggerCountriesDownload(newConfig);
            }
        }
    }
}
// --- END OF FILE 177 Zeilen ---