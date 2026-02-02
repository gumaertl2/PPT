// 03.02.2026 15:30 - FIX: ADHOC INPUT SUPPORT.
// - Enables GeoExpander to read 'LOC:Name' from Ad-Hoc feedback string.
// - Fixes the "undefined" location error when project destination is empty.
// src/core/prompts/preparers/prepareGeoExpanderPayload.ts

import type { TripProject } from '../../types';

export const prepareGeoExpanderPayload = (
    project: TripProject, 
    feedback: string, 
    options: any
) => {
    const { userInputs } = project;
    
    // 1. Default Location from Database
    let location = userInputs?.logistics?.stationary?.destination || "München";
    let country = "Deutschland"; 
    let radius = 20;

    // 2. Override from Ad-Hoc Feedback (THE MISSING LINK)
    if (feedback && typeof feedback === 'string') {
        const locMatch = feedback.match(/LOC:([^|]+)/);
        if (locMatch && locMatch[1]) {
            location = locMatch[1].trim();
        }

        const countryMatch = feedback.match(/COUNTRY:([^|]+)/);
        if (countryMatch && countryMatch[1]) {
            country = countryMatch[1].trim();
        }

        const radMatch = feedback.match(/RAD:(\d+)/);
        if (radMatch && radMatch[1]) {
            radius = parseInt(radMatch[1], 10);
        }
    }

    return {
        context: {
            location,
            country,
            radius
        },
        instructions: {
            role: "Du bist ein Geographie-Experte."
        }
    };
};
// --- END OF FILE 48 Lines ---