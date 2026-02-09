// 09.02.2026 10:30 - FIX: CONTENT GUARD & STRICT ID. Prevents overwriting with empty data.
// 09.02.2026 10:15 - FIX: DISABLED FUZZY MATCHING FOR CHEFREDAKTEUR. STRICT ID ONLY.
// 08.02.2026 23:00 - FIX: FORCE ID MATCHING. Disable Fuzzy Match if ID is present.
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
                let targetId = null;
                if (item.id && typeof item.id === 'string') {
                    const cleanId = item.id.trim();
                    if (existingPlaces[cleanId]) {
                        targetId = cleanId;
                        if (debug) console.log(`[Enricher] Direct ID Match: ${cleanId}`);
                    } else {
                         if (debug) console.warn(`[Enricher] ID provided (${cleanId}) but not found in store. Skipping.`);
                         return; 
                    }
                }

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
                // 1. STRICT ID CHECK
                let targetId = null;
                
                if (item.id && typeof item.id === 'string') {
                    const cleanId = item.id.trim();
                    if (existingPlaces[cleanId]) {
                        targetId = cleanId;
                        if (debug) console.log(`[Details] Direct ID Match: ${cleanId}`);
                    } else {
                         if (debug) console.warn(`[Details] ID provided (${cleanId}) but not found. Skipping.`);
                         return; 
                    }
                }

                // NOTE: Fuzzy Fallback intentionally REMOVED for Chefredakteur.
                // We rely 100% on IDs to prevent overwriting correct data with hallucinations.
                
                if (!targetId && debug) {
                    console.warn(`[Details] Ignored item without valid ID: "${item.name || 'Unknown'}"`);
                }

                if (targetId) {
                    // 2. CONTENT MAPPING
                    const content = item.detailContent || item.text || item.article || item.detailed_description || item.description || item.content;
                    
                    // 3. CONTENT GUARD (SAFETY LOCK)
                    // Only update if we actually have meaningful content.
                    // This prevents "Ghost Items" (empty duplicates) from overwriting good data.
                    if (!content || typeof content !== 'string' || content.length < 15) {
                        if (debug) console.warn(`[Details] Skipping update for ${targetId}: Content too short or missing.`);
                        return;
                    }

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
// --- END OF FILE 130 Zeilen ---