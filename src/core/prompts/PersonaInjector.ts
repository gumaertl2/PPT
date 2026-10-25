// [2026-10-25] [13:47] - FIX: Resolved custom pen overrides (cat_vibe, cat_budget, cat_pace) and rich promptInstructions from options.ts instead of raw IDs.
// 19.03.2026 16:30 - FEAT: Implemented Targeted Context Matrix. Generates role-specific persona directives.
// src/core/prompts/PersonaInjector.ts

import type { TripUserProfile as UserInputs } from '../types/models';
import { VIBE_OPTIONS, BUDGET_OPTIONS, PACE_OPTIONS } from '../../data/options';

export type PersonaRole = 'basis' | 'scout' | 'planner' | 'writer';

const resolveOptionDirective = (
    key: 'vibe' | 'budget' | 'pace',
    optionId: string | undefined,
    customPreferences: Record<string, any> | undefined,
    optionsMap: Record<string, any>
): string => {
    if (!optionId) return '';
    const customText = customPreferences?.[`cat_${key}`] || customPreferences?.[`saved_${key}_${optionId}`];
    if (customText && typeof customText === 'string' && customText.trim().length > 0) {
        return `${optionId} — 🚨 [USER OVERRIDE]: ${customText.trim()}`;
    }
    const opt = optionsMap?.[optionId];
    const defaultInst = opt?.promptInstruction?.en || opt?.promptInstruction?.de || '';
    return defaultInst ? `${optionId} (${defaultInst})` : optionId;
};

export const buildPersonaDirective = (inputs: UserInputs, role: PersonaRole): string => {
    let directive = "=== TARGET AUDIENCE & PERSONALIZATION DIRECTIVE ===\n";
    const { vibe, budget, pace, notes, customPreferences, travelers } = inputs;
    const noGos = customPreferences?.noGos;

    const resolvedVibe = resolveOptionDirective('vibe', vibe, customPreferences, VIBE_OPTIONS);
    const resolvedBudget = resolveOptionDirective('budget', budget, customPreferences, BUDGET_OPTIONS);
    const resolvedPace = resolveOptionDirective('pace', pace, customPreferences, PACE_OPTIONS);

    let hasData = false;

    if (role === 'basis') {
        if (resolvedVibe) { directive += `- Preferred Vibe: ${resolvedVibe}\n`; hasData = true; }
        if (notes) { directive += `- User Wishes/Passions: ${notes}\n`; hasData = true; }
        if (noGos) { directive += `- STRICT NO-GOS: ${noGos}\n`; hasData = true; }
    } 
    else if (role === 'scout') {
        if (resolvedBudget) { directive += `- Budget Level: ${resolvedBudget}\n`; hasData = true; }
        if (resolvedVibe) { directive += `- Preferred Vibe: ${resolvedVibe}\n`; hasData = true; }
        if (notes) { directive += `- User Wishes/Passions: ${notes}\n`; hasData = true; }
        if (noGos) { directive += `- STRICT NO-GOS: ${noGos}\n`; hasData = true; }
    } 
    else if (role === 'planner') {
        if (resolvedPace) { directive += `- Travel Pace: ${resolvedPace}\n`; hasData = true; }
        if (notes) { directive += `- User Wishes/Passions: ${notes}\n`; hasData = true; }
        if (noGos) { directive += `- STRICT NO-GOS: ${noGos}\n`; hasData = true; }
    } 
    else if (role === 'writer') {
        if (travelers?.nationality) { directive += `- Target Audience Nationality: ${travelers.nationality}\n`; hasData = true; }
        if (resolvedVibe) { directive += `- Travel Vibe/Style: ${resolvedVibe}\n`; hasData = true; }
        if (notes) { directive += `- User Passions (incorporate contextually into the text!): ${notes}\n`; hasData = true; }
    }

    if (!hasData) return "";
    return directive + "====================================================\n\n";
};
// --- END OF FILE 62 Zeilen ---