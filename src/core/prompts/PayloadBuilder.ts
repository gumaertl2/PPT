// src/core/prompts/PayloadBuilder.ts
// 14.01.2026 18:40 - FIX: Added safe resolution for 'prompt' field (string vs LocalizedContent) to fix TS error.
// V40 Update: Added 'anreicherer' (Enricher) to prompt routing.

import { useTripStore } from '../../store/useTripStore';
import { INTEREST_DATA } from '../../data/interests';
// Importiert die V40 Templates
import { buildChefPlanerPrompt } from './templates/chefPlaner';
import { buildBasisPrompt } from './templates/basis';
import { buildAnreichererPrompt } from './templates/anreicherer';
// FIX: Import type for safe checking
import type { LocalizedContent } from '../types';

export const PayloadBuilder = {
  /**
   * ZENTRALE SCHNITTSTELLE FÜR USETRIPGENERATION (V40)
   * Wählt anhand des Task-Keys das richtige Prompt-Template.
   */
  buildPrompt: (task: string, feedback?: string): string => {
    const state = useTripStore.getState();
    const { project } = state;

    switch (task) {
      case 'chefPlaner':
        return buildChefPlanerPrompt(project, feedback);
      
      case 'basis':
        return buildBasisPrompt(project);
      
      case 'anreicherer':
        return buildAnreichererPrompt(project);

      // Weitere Steps (guide, dayplan, etc.) folgen hier
      default:
        throw new Error(`PayloadBuilder: Unknown task '${task}'`);
    }
  },

  /**
   * LEGACY / BACKUP METHODE
   * Falls noch benötigt, ansonsten kann diese perspektivisch entfernt werden.
   */
  buildChefPlanerPayload: () => {
    const state = useTripStore.getState();
    const { userInputs, meta } = state.project;

    const langMap: Record<string, string> = {
      de: 'Deutsch', en: 'Englisch', es: 'Spanisch', fr: 'Französisch',
      it: 'Italienisch', pt: 'Portugiesisch', nl: 'Niederländisch', pl: 'Polnisch'
    };

    // V40: Use aiOutputLanguage
    const outputLangCode = userInputs.aiOutputLanguage || 'de';
    const outputLangName = langMap[outputLangCode] || 'Deutsch';

    // FIX: Helper to safely resolve prompt which can be string or LocalizedContent
    const resolvePrompt = (p: string | LocalizedContent | undefined): string => {
        if (!p) return '';
        if (typeof p === 'string') return p;
        return p.de || '';
    };

    return {
      lang: outputLangName,
      travelers: {
        ...userInputs.travelers,
        pets: userInputs.travelers.pets // V40: Pets handling
      },
      dates: userInputs.dates,
      logistics: userInputs.logistics,
      interests: userInputs.selectedInterests.map(id => ({
        id,
        // Label ist in Types immer LocalizedContent, daher ist .de hier sicher
        label: INTEREST_DATA[id]?.label.de || id,
        // FIX: Use resolvePrompt helper instead of direct .de access
        prompt: resolvePrompt(INTEREST_DATA[id]?.prompt),
        custom: userInputs.customPreferences[id] || null
      })),
      preferences: {
        pace: userInputs.pace,
        budget: userInputs.budget,
        vibe: userInputs.vibe,
        strategy: userInputs.strategyId
      },
      notes: userInputs.notes,
      noGos: userInputs.customPreferences['noGos'] || '',
      appVersion: meta.version,
      currentDate: new Date().toISOString().split('T')[0]
    };
  }
};
// --- END OF FILE 86 Zeilen ---