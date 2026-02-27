// 27.02.2026 13:55 - FEAT: Initial creation of TransferPlanner preparer to integrate seamlessly into V40 payload architecture.
// src/core/prompts/preparers/prepareTransferPlannerPayload.ts

import type { TripProject } from '../../types';

export const prepareTransferPlannerPayload = (project: TripProject, feedback?: string) => {
    const { userInputs, data, itinerary } = project;
    const { logistics } = userInputs;

    // 1. Base Places Context
    // We only pass places that are ACTUALLY scheduled in the itinerary to save tokens
    const scheduledPlaceIds = new Set<string>();
    (itinerary?.days || []).forEach(day => {
        (day.activities || day.aktivitaeten || []).forEach((act: any) => {
            if (act.id || act.original_sight_id) {
                scheduledPlaceIds.add(act.id || act.original_sight_id);
            }
        });
    });

    const placesToConnect = Object.values(data.places || {})
        .filter(p => scheduledPlaceIds.has(p.id))
        .map((p: any) => ({
            id: p.id,
            name: p.name,
            geo: p.geo_koordinaten || p.geo || p.location,
            category: p.category
        }));

    // 2. Logistics Context
    const contextData = {
        mode: logistics.mode,
        base: logistics.mode === 'stationaer' ? logistics.stationary.destination : null,
        stops: logistics.mode === 'mobil' || logistics.mode === 'roundtrip' ? logistics.roundtrip.stops : null,
        local_mobility: logistics.localMobility || 'car',
        places_to_connect: placesToConnect,
        itinerary_days: itinerary?.days || []
    };

    // 3. Feedback Loop
    let feedbackSection = '';
    if (feedback) {
        feedbackSection = `\n### USER FEEDBACK\nThe user requested the following transfer adjustments:\n"""\n${feedback}\n"""\nEnsure you correct the logistic paths accordingly.\n`;
    }

    return {
        context: contextData,
        meta: {
            targetLanguageName: project.meta.language === 'en' ? 'English' : 'German',
            feedbackSection
        }
    };
};
// --- END OF FILE 48 Zeilen ---