// 05.02.2026 16:30 - REFACTOR: PLACE PROCESSOR.
// Handles Sights, Enrichment, and Details.
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
                const targetId = resolvePlaceId(item, existingPlaces, debug);
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
                const targetId = resolvePlaceId(item, existingPlaces, debug);
                if (targetId) {
                    const content = item.text || item.article || item.detailed_description || item.description || item.content;
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
// --- END OF FILE 86 Zeilen ---