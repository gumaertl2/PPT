// src/core/prompts/PayloadBuilder.ts
// 14.01.2026 19:20 - FIX: Added safe resolution for 'prompt' field (string vs LocalizedContent) to fix TS error.
// 15.01.2026 20:20 - FIX: Standardized task key to 'routeArchitect' (English) to match Frontend calls.
// 16.01.2026 04:35 - FIX: Using TaskKey type from core/types to prevent TS2345 build errors.

import { useTripStore } from '../../store/useTripStore';
import { INTEREST_DATA } from '../../data/interests';
import { buildChefPlanerPrompt } from './templates/chefPlaner';
import { buildBasisPrompt } from './templates/basis';
import { buildAnreichererPrompt } from './templates/anreicherer';
import { buildRouteArchitectPrompt } from './templates/routeArchitect';

// FIX: Import consolidated types
import type { LocalizedContent, TaskKey } from '../types';

export const PayloadBuilder = {
  /**
   * ZENTRALE SCHNITTSTELLE FÜR USETRIPGENERATION (V40)
   * Wählt anhand des Task-Keys das richtige Prompt-Template.
   */
  // FIX: Explicit TaskKey type for task parameter
  buildPrompt: (task: TaskKey, feedback?: string): string => {
    const state = useTripStore.getState();
    const { project } = state;

    switch (task) {
      case 'chefPlaner':
        return buildChefPlanerPrompt(project, feedback);
      
      case 'routeArchitect':
        return buildRouteArchitectPrompt(project, feedback);

      case 'basis':
        return buildBasisPrompt(project);
      
      case 'anreicherer':
        return buildAnreichererPrompt(project);

      // Workflow Fallbacks (using the same logic for dayplan/guide etc. if they are defined as TaskKey)
      default:
        // Optional: If specific templates exist for 'dayplan' etc., add cases here.
        throw new Error(`PayloadBuilder: Unknown task '${task}'`);
    }
  },

  buildChefPlanerPayload: () => {
    const state = useTripStore.getState();
    const { userInputs, meta } = state.project;
    const langMap: Record<string, string> = { de: 'Deutsch', en: 'Englisch' };
    const outputLangCode = userInputs.aiOutputLanguage || 'de';
    const outputLangName = langMap[outputLangCode] || 'Deutsch';

    const resolvePrompt = (p: string | LocalizedContent | undefined): string => {
        if (!p) return '';
        if (typeof p === 'string') return p;
        return p.de || '';
    };

    return {
      lang: outputLangName,
      travelers: userInputs.travelers,
      dates: userInputs.dates,
      logistics: userInputs.logistics,
      interests: userInputs.selectedInterests.map(id => ({
        id,
        label: INTEREST_DATA[id]?.label.de || id,
        prompt: resolvePrompt(INTEREST_DATA[id]?.prompt),
        custom: userInputs.customPreferences[id] || null
      })),
      preferences: { pace: userInputs.pace, budget: userInputs.budget, vibe: userInputs.vibe, strategy: userInputs.strategyId },
      notes: userInputs.notes,
      appVersion: meta.version
    };
  }
};
// --- END OF FILE 98 Zeilen ---