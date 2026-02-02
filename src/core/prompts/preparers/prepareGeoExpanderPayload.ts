// 05.02.2026 12:00 - NEW: GEO EXPANDER PREPARER.
// - Extracts Ad-Hoc data (LOC/RAD) to feed the GeoExpander.
// src/core/prompts/preparers/prepareGeoExpanderPayload.ts

import type { TripProject } from '../../types';

export const prepareGeoExpanderPayload = (
    projectOrPayload: any,
    feedbackInput?: string
) => {
    // 1. Resolve Input
    let feedback = feedbackInput;
    if (projectOrPayload.instructions && !feedback) {
        feedback = projectOrPayload.instructions;
    }

    // 2. Default Values
    let center = "München";
    let radius = 20;

    // 3. Extract from Ad-Hoc String
    if (feedback) {
        const locMatch = feedback.match(/LOC:([^|]+)/);
        if (locMatch && locMatch[1].trim()) center = locMatch[1].trim();

        const radMatch = feedback.match(/RAD:(\d+)/);
        if (radMatch) radius = parseInt(radMatch[1]);
    }

    return {
        context: {
            center,
            radius
        }
    };
};
// --- END OF FILE 36 Zeilen ---