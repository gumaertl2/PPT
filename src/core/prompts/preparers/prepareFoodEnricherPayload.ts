// 05.02.2026 18:30 - NEW STRATEGY: AUDIT PREP (STEP 3 PREP).
// - Simple pass-through of candidates to the Enricher.
// src/core/prompts/preparers/prepareFoodEnricherPayload.ts

import type { TripProject } from '../../types';

export const prepareFoodEnricherPayload = (
    project: TripProject, 
    candidates: any[]
) => {
    // Just wrap the candidates for the template
    return {
        context: {
            candidates_list: candidates,
            target_country: "Deutschland"
        },
        instructions: {
            role: "Du bist ein strenger Restaurant-Kritiker und Fakten-Prüfer."
        }
    };
};