// 19.03.2026 17:45 - FEAT: Added Zustand persist migration layer (version: 1) to ensure backwards compatibility with older local caches. Protects against crashes when new models (expenses, customPreferences) are introduced.
// 27.02.2026 19:55 - FIX: Exported type for global SSOT.
// src/store/useTripStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createProjectSlice, type ProjectSlice } from './slices/createProjectSlice';
import { createUISlice, type UISlice } from './slices/createUISlice';
import { createWizardSlice, type WizardSlice } from './slices/createWizardSlice';
import { createAnalysisSlice, type AnalysisSlice } from './slices/createAnalysisSlice';
import { createSystemSlice, type SystemSlice } from './slices/createSystemSlice';

export type TripStore = ProjectSlice & UISlice & WizardSlice & AnalysisSlice & SystemSlice;

export const useTripStore = create<TripStore>()(
  persist(
    (...a) => ({
      ...createProjectSlice(...a),
      ...createUISlice(...a),
      ...createWizardSlice(...a),
      ...createAnalysisSlice(...a),
      ...createSystemSlice(...a),
    }),
    {
      name: 'papatours-storage',
      version: 1, // VERSIONING ACTIVATED
      partialize: (state) => ({
        project: state.project,
        uiState: state.uiState,
        wizard: state.wizard,
        apiKey: state.apiKey,
        usageStats: state.usageStats
      }),
      // THE MIGRATION LAYER (Protects old local caches)
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migration from unversioned (v0) to v1
          if (persistedState.project) {
             // Ensure data objects exist
             if (!persistedState.project.data) persistedState.project.data = {};
             if (!persistedState.project.data.expenses) persistedState.project.data.expenses = {};
             if (!persistedState.project.data.content) persistedState.project.data.content = {};
             
             // Ensure userInputs exist
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
// --- END OF FILE 48 Zeilen ---