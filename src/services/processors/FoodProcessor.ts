// 05.02.2026 16:30 - REFACTOR: FOOD PROCESSOR.
// Handles Restaurants and Hotels.
// src/services/processors/FoodProcessor.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../../store/useTripStore';
import { extractItems, resolvePlaceId, isGarbageName, isEnrichedItem, sanitizeUrl, triggerCountriesDownload } from './resultUtils';
import { countryGuideConfig, type GuideDef } from '../../data/countries';

export const FoodProcessor = {
    processFoodOrHotel: (data: any, step: string, debug: boolean) => {
        const { updatePlace, project } = useTripStore.getState();
        const extractedItems = extractItems(data, false);
        
        const systemCategory = ['foodScout', 'foodEnricher'].includes(step) ? 'Restaurant' : 'Hotel';

        if (extractedItems.length > 0) {
            const rawCandidates: any[] = []; 
            const existingPlaces = project.data?.places || {};
            let savedCount = 0;

            extractedItems.forEach((item: any) => {
                if (typeof item === 'string') return;
                const name = item.name || item.name_official || item.original_name;
                
                if (isGarbageName(name)) return;
                
                if (name) {
                    if (step === 'foodEnricher' && !isEnrichedItem(item)) return; 

                    // Smart Match
                    const resolvedId = resolvePlaceId({ ...item, name }, existingPlaces, false, systemCategory);
                    const id = resolvedId || uuidv4();
                    const existingPlace = existingPlaces[id];

                    // SSOT Protection
                    const incomingIsEnriched = isEnrichedItem(item);
                    const existingIsEnriched = existingPlace && isEnrichedItem(existingPlace);
                    if (existingIsEnriched && !incomingIsEnriched) return; 

                    // Hard Gatekeeper (FoodEnricher Rule)
                    if (step === 'foodEnricher') {
                         const hasAwards = (item.awards && item.awards.length > 0);
                         const hasGuides = (item.guides && item.guides.length > 0);
                         const isVerified = item.verification_status === 'verified';
                         if (!hasAwards && !hasGuides && !isVerified) {
                             if (debug) console.warn(`[FoodProcessor] Dropped Enriched candidate "${name}" (No Awards/Guides).`);
                             return; 
                         }
                    }
                    
                    const finalName = item.name_official || name;
                    const { category: _aiCategory, source_url: _aiUrl, ...cleanItem } = item;
                    const cleanSourceUrl = sanitizeUrl(item.source_url, item);

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

            // Handover to Store (for FoodEnricher to pick up)
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

                // Guide Harvester Logic
                handleGuideHarvesting(extractedItems, project);
            }
            console.log(`[${systemCategory}] Stored/Updated ${savedCount} items.`);
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
                    searchUrl: `https://www.google.com/search?q=${encodeURIComponent(name + ' restaurant ' + targetCountry)}`
                }));
                
                newConfig[targetCountry] = [...(existingConfig || []), ...newDefs];
                triggerCountriesDownload(newConfig);
            }
        }
    }
}
// --- END OF FILE 141 Zeilen ---