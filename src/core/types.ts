// 06.02.2026 19:30 - FEAT: Added 'plan' to CockpitViewMode.
// 21.01.2026 13:30 - FIX: ProjectCore Types (Barrel File).
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

// --- WORKFLOW TYPES ---
export * from './types/workflow';

// --- SHARED UTILS ---
export * from './types/shared';

// --- COCKPIT TYPES ---
export type CockpitViewMode = 'wizard' | 'analysis' | 'sights' | 'info' | 'routeArchitect' | 'plan'; // FIX: Added 'plan'

// --- PRINT CONFIG ---
export interface PrintConfig {
  sections: {
    briefing: boolean;
    analysis: boolean;
    tours: boolean;
    categories: boolean;
    infos: boolean;
  };
  layout: 'standard' | 'compact';
  showImages: boolean;
}

// --- PROJECT ROOT ---
import type { TripProject } from './types/models';

export interface ProjectState {
  project: TripProject;
  isLoading: boolean;
  error: AppError | null;
}
// --- END OF FILE 39 Zeilen ---