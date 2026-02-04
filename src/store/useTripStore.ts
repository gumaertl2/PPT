// src/store/useTripStore.ts
// 05.02.2026 18:00 - REFACTOR: Added 'WizardSlice' to Store Composition.

import { create } from 'zustand';

// VALUES
import { createProjectSlice } from './slices/createProjectSlice';
import { createWizardSlice } from './slices/createWizardSlice'; // NEU
import { createUISlice } from './slices/createUISlice';
import { createSystemSlice } from './slices/createSystemSlice';
import { createAnalysisSlice } from './slices/createAnalysisSlice';

// TYPES
import type { ProjectSlice } from './slices/createProjectSlice';
import type { WizardSlice } from './slices/createWizardSlice'; // NEU
import type { UISlice } from './slices/createUISlice';
import type { SystemSlice } from './slices/createSystemSlice';
import type { AnalysisSlice } from './slices/createAnalysisSlice';

export type { AiStrategy } from '../core/types';

// Der Gesamttyp des Stores
export type TripStore = ProjectSlice & WizardSlice & UISlice & SystemSlice & AnalysisSlice;

// Der Store wird zusammengesetzt
export const useTripStore = create<TripStore>((...a) => ({
  ...createProjectSlice(...a),
  ...createWizardSlice(...a), // NEU
  ...createUISlice(...a),
  ...createSystemSlice(...a),
  ...createAnalysisSlice(...a),
}));
// --- END OF FILE 33 Zeilen ---