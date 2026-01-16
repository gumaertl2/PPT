// src/store/useTripStore.ts
// 14.01.2026 13:50 - FIX: Exporting AiStrategy for external usage (SettingsModal).
// 17.01.2026 12:10 - FIX: Updated AiStrategy re-export path to SSOT (core/types).

import { create } from 'zustand';

// Importiere VALUES (Funktionen) normal
import { createProjectSlice } from './slices/createProjectSlice';
import { createUISlice } from './slices/createUISlice';
import { createSystemSlice } from './slices/createSystemSlice';
import { createAnalysisSlice } from './slices/createAnalysisSlice';

// Importiere TYPES (Interfaces) explizit mit 'type'
import type { ProjectSlice } from './slices/createProjectSlice';
import type { UISlice } from './slices/createUISlice';
import type { SystemSlice } from './slices/createSystemSlice';
import type { AnalysisSlice } from './slices/createAnalysisSlice';

// FIX: Re-export AiStrategy so components can import it from useTripStore
// KORREKTUR: Pfad zeigt jetzt auf die zentrale types.ts
export type { AiStrategy } from '../core/types';

// Der Gesamttyp des Stores ist die Summe aller Slice-Interfaces
export type TripStore = ProjectSlice & UISlice & SystemSlice & AnalysisSlice;

// Der Store wird zusammengesetzt
export const useTripStore = create<TripStore>((...a) => ({
  ...createProjectSlice(...a),
  ...createUISlice(...a),
  ...createSystemSlice(...a),
  ...createAnalysisSlice(...a),
}));
// --- END OF FILE 29 Zeilen ---