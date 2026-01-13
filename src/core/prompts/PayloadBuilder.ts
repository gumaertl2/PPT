// src/core/prompts/PayloadBuilder.ts
// 10.01.2026 23:55
// V40 Update: Added 'anreicherer' (Enricher) to prompt routing.

import { useTripStore } from '../../store/useTripStore';
import { INTEREST_DATA } from '../../data/interests';
// Importiert die V40 Templates
import { buildChefPlanerPrompt } from './templates/chefPlaner';
import { buildBasisPrompt } from './templates/basis';
import { buildAnreichererPrompt } from './templates/anreicherer';

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
        label: INTEREST_DATA[id]?.label.de || id,
        prompt: INTEREST_DATA[id]?.prompt.de || '',
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