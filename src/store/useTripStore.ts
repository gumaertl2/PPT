// 19.03.2026 17:45 - FEAT: Added Zustand persist migration layer (version: 1)
// 20.02.2026 18:15 - FIX: Added 'view' to Autosave (persist)
// src/store/useTripStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware'; 

// VALUES
import { createProjectSlice } from './slices/createProjectSlice';
import { createWizardSlice } from './slices/createWizardSlice'; 
import { createUISlice } from './slices/createUISlice';
import { createSystemSlice } from './slices/createSystemSlice';
import { createAnalysisSlice } from './slices/createAnalysisSlice';

// TYPES
import type { ProjectSlice } from './slices/createProjectSlice';
import type { WizardSlice } from './slices/createWizardSlice'; 
import type { UISlice } from './slices/createUISlice';
import type { SystemSlice } from './slices/createSystemSlice';
import type { AnalysisSlice } from './slices/createAnalysisSlice';

// FIX: Restore AiStrategy Export for SettingsModal
export type { AiStrategy } from '../core/types';

// Der Gesamttyp des Stores
export type TripStore = ProjectSlice & WizardSlice & UISlice & SystemSlice & AnalysisSlice;

// Der Store wird zusammengesetzt und mit 'persist' automatisch im Hintergrund gesichert!
export const useTripStore = create<TripStore>()(
  persist(
    (...a) => ({
      ...createProjectSlice(...a),
      ...createWizardSlice(...a), 
      ...createUISlice(...a),
      ...createSystemSlice(...a),
      ...createAnalysisSlice(...a),
    }),
    {
      name: 'papatours-autosave', 
      version: 1, // VERSIONING ACTIVATED
      partialize: (state) => ({
        // SMART AUTOSAVE WHITELIST (EXACTLY AS IN YOUR ORIGINAL CODE)
        project: state.project,
        uiState: state.uiState,
        view: state.view,
        apiKey: state.apiKey,
        aiSettings: state.aiSettings,
        manualPrompt: state.manualPrompt,
        manualStepId: state.manualStepId
      }),
      // THE MIGRATION LAYER (Protects old local caches)
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migration from unversioned (v0) to v1
          if (persistedState.project) {
             if (!persistedState.project.data) persistedState.project.data = {};
             if (!persistedState.project.data.expenses) persistedState.project.data.expenses = {};
             if (!persistedState.project.data.content) persistedState.project.data.content = {};
             
             if (!persistedState.project.userInputs) persistedState.project.userInputs = {};
             if (!persistedState.project.userInputs.customPreferences) persistedState.project.userInputs.customPreferences = {};
             if (!persistedState.project.userInputs.searchSettings) {
                 persistedState.project.userInputs.searchSettings = { sightsCount: 30, minRating: 4.0, minDuration: 30 };
             }
          }
        }
        return persistedState;
      }
    }
  )
);
// --- END OF FILE 72 Zeilen ---