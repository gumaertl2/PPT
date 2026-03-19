// 19.03.2026 16:30 - FEAT: Implemented Targeted Context Matrix. Generates role-specific persona directives to prevent context-loss in deep agent chains without overloading logistics agents.
// src/core/prompts/PersonaInjector.ts

import type { UserInputs } from '../types/models';

export type PersonaRole = 'basis' | 'scout' | 'planner' | 'writer';

export const buildPersonaDirective = (inputs: UserInputs, role: PersonaRole): string => {
    let directive = "=== TARGET AUDIENCE & PERSONALIZATION DIRECTIVE ===\n";
    const { vibe, budget, pace, notes, customPreferences, travelers } = inputs;
    const noGos = customPreferences?.noGos;

    let hasData = false;

    if (role === 'basis') {
        if (vibe) { directive += `- Preferred Vibe: ${vibe}\n`; hasData = true; }
        if (notes) { directive += `- User Wishes/Passions: ${notes}\n`; hasData = true; }
        if (noGos) { directive += `- STRICT NO-GOS: ${noGos}\n`; hasData = true; }
    } 
    else if (role === 'scout') {
        if (budget) { directive += `- Budget Level: ${budget}\n`; hasData = true; }
        if (vibe) { directive += `- Preferred Vibe: ${vibe}\n`; hasData = true; }
        if (notes) { directive += `- User Wishes/Passions: ${notes}\n`; hasData = true; }
        if (noGos) { directive += `- STRICT NO-GOS: ${noGos}\n`; hasData = true; }
    } 
    else if (role === 'planner') {
        if (pace) { directive += `- Travel Pace: ${pace}\n`; hasData = true; }
        if (notes) { directive += `- User Wishes/Passions: ${notes}\n`; hasData = true; }
        if (noGos) { directive += `- STRICT NO-GOS: ${noGos}\n`; hasData = true; }
    } 
    else if (role === 'writer') {
        if (travelers?.nationality) { directive += `- Target Audience Nationality: ${travelers.nationality}\n`; hasData = true; }
        if (vibe) { directive += `- Travel Vibe/Style: ${vibe}\n`; hasData = true; }
        if (notes) { directive += `- User Passions (incorporate contextually into the text!): ${notes}\n`; hasData = true; }
    }

    if (!hasData) return "";
    return directive + "====================================================\n\n";
};
// --- END OF FILE 36 Zeilen ---