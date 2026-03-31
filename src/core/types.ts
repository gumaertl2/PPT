// 23.02.2026 15:15 - FIX: Added 'UserInputs' alias to TripUserProfile to resolve TS2305.
// 06.02.2026 21:40 - FIX: Removed duplicate PrintConfig to use definition from models.ts.
// 06.02.2026 19:30 - FEAT: Added 'plan' to CockpitViewMode.
// src/core/types.ts

// --- SHARED TYPES & ENUMS ---
export type LanguageCode = 'de' | 'en';

export type UserRole = 'guest' | 'user' | 'admin';

export type ProcessingStatus = 'idle' | 'generating' | 'success' | 'error';

export type AppError = {
  code: string;
  message: string;
  details?: any;
};

// --- DOMAIN MODELS ---
export * from './types/models';
import type { TripUserProfile } from './types/models';
export type UserInputs = TripUserProfile;

// --- WORKFLOW TYPES ---
export * from './types/workflow';

// --- SHARED UTILS ---
export * from './types/shared';

// --- COCKPIT TYPES ---
export type CockpitViewMode = 'wizard' | 'analysis' | 'sights' | 'info' | 'routeArchitect' | 'plan'; 

// --- PROJECT ROOT ---
import type { TripProject } from './types/models';

export interface ProjectState {
  project: TripProject;
  isLoading: boolean;
  error: AppError | null;
}
// --- END OF FILE 36 Zeilen ---