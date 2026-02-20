// 20.02.2026 18:15 - FIX: Added 'view' to Autosave (persist) so the app reloads directly into the active screen (no Welcome Screen shock).
// 20.02.2026 18:00 - FEAT: Added 'persist' middleware for Smart Autosave (Zero Data Loss).
// 05.02.2026 18:00 - REFACTOR: Added 'WizardSlice' to Store Composition.
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
      partialize: (state) => ({
        // SMART AUTOSAVE WHITELIST: 
        // Wir speichern nur die echten Nutzdaten und die aktuelle Ansicht.
        // Temporäre Status (wie laufende Workflows) werden absichtlich ignoriert.
        project: state.project,
        uiState: state.uiState,
        view: state.view, // NEW: Sichert, dass wir beim Neuladen nicht im Welcome Screen landen!
        apiKey: state.apiKey,
        aiSettings: state.aiSettings,
        manualPrompt: state.manualPrompt,
        manualStepId: state.manualStepId
      }),
    }
  )
);
// --- END OF FILE 49 Zeilen ---