// 08.02.2026 23:00 - FIX: FORCE ID MATCHING. Disable Fuzzy Match if ID is present.
// 05.02.2026 16:30 - REFACTOR: PLACE PROCESSOR.
// 06.02.2026 16:40 - FIX: Added 'detailContent' mapping to processDetails.
// src/services/processors/PlaceProcessor.ts

import { v4 as uuidv4 } from 'uuid';
import { resolvePlaceId, extractItems } from './resultUtils';
import { useTripStore } from '../../store/useTripStore';

export const PlaceProcessor = {
    processBasis: (data: any) => {
        const { updatePlace, project } = useTripStore.getState();
        const extractedItems = extractItems(data, true);

        if (extractedItems.length > 0) {
            extractedItems.forEach((item: any) => {
                const isString = typeof item === 'string';
                const name = isString ? item : item.name;
                if (name) {
                    const existingPlaces = project.data?.places || {};
                    const existingId = resolvePlaceId({ name }, existingPlaces, false);
                    const id = existingId || (isString ? uuidv4() : (item.id || uuidv4()));

                    updatePlace(id, {
                      id,
                      name,
                      category: 'Sight',
                      userPriority: 0,
                      visited: false,
                      ...(isString ? {} : item)
                    });
                }
            });
            console.log(`[Basis] Processed ${extractedItems.length} items.`);
        }
    },

    processAnreicherer: (data: any, debug: boolean) => {
        const { updatePlace, project } = useTripStore.getState();
        const extractedItems = extractItems(data, false);
        const existingPlaces = project.data?.places || {};

        if (extractedItems.length > 0) {
            let successCount = 0;
            extractedItems.forEach((item: any) => {
                // FIX: Strict ID Check first
                let targetId = null;
                if (item.id && typeof item.id === 'string') {
                    const cleanId = item.id.trim();
                    if (existingPlaces[cleanId]) {
                        targetId = cleanId;
                        if (debug) console.log(`[Enricher] Direct ID Match: ${cleanId}`);
                    } else {
                         if (debug) console.warn(`[Enricher] ID provided (${cleanId}) but not found in store. Skipping Fuzzy Match to prevent errors.`);
                         // CRITICAL: Do NOT fallback to fuzzy if ID was explicitly provided but wrong.
                         // This prevents "El Poblado" (District) matching "Parque El Poblado" (Sight).
                         return; 
                    }
                }

                // Fallback only if NO ID was provided
                if (!targetId && !item.id) {
                    targetId = resolvePlaceId(item, existingPlaces, debug);
                }

                if (targetId) {
                   updatePlace(targetId, {
                      ...item,
                      id: targetId,
                      category: item.category || 'Sight',
                      address: item.address,
                      location: item.location,
                      description: item.description,
                      openingHours: item.openingHours,
                      rating: item.rating,
                      user_ratings_total: item.user_ratings_total,
                      duration: item.duration,
                      website: item.website
                    });
                    successCount++;
                }
            });
            console.log(`[Enricher] Updated ${successCount} items.`);
        }
    },

    processDetails: (data: any, debug: boolean) => {
        const { updatePlace, project } = useTripStore.getState();
        const extractedItems = extractItems(data, false);
        const existingPlaces = project.data?.places || {};

        if (extractedItems.length > 0) {
            let successCount = 0;
            extractedItems.forEach((item: any) => {
                // FIX: Strict ID Check for Details/Chefredakteur
                let targetId = null;
                
                if (item.id && typeof item.id === 'string') {
                    const cleanId = item.id.trim();
                    if (existingPlaces[cleanId]) {
                        targetId = cleanId;
                        if (debug) console.log(`[Details] Direct ID Match: ${cleanId}`);
                    } else {
                         if (debug) console.warn(`[Details] ID provided (${cleanId}) but not found in store. Aborting update for this item.`);
                         return; // SAFETY ABORT
                    }
                }

                // Fallback only if NO ID provided
                if (!targetId && !item.id) {
                    targetId = resolvePlaceId(item, existingPlaces, debug);
                }

                if (targetId) {
                    // FIX: Check for 'detailContent' explicitly first
                    const content = item.detailContent || item.text || item.article || item.detailed_description || item.description || item.content;
                    
                    updatePlace(targetId, {
                        detailContent: content,
                        reasoning: item.reasoning,
                        waypoints: item.waypoints
                    });
                    successCount++;
                }
            });
            console.log(`[Details] Updated ${successCount} items.`);
        }
    }
};
// --- END OF FILE 115 Zeilen ---