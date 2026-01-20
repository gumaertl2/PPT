// 20.01.2026 16:35 - FIX: Expanded Store to accept ALL V40 Tasks (Ideen, Info, Tour, etc.) dynamically.
// src/store/slices/createAnalysisSlice.ts

import type { StateCreator } from 'zustand';
import type { TripProject, ChefPlanerResult, RouteArchitectResult } from '../../core/types';

// Helper Type to avoid circular dependency with TripStore
type StoreState = {
  project: TripProject;
} & AnalysisSlice;

// --- INTERFACE DEFINITION ---
export interface AnalysisSlice {
  // Actions
  // FIX: Allow string as task key to support all dynamic V40 tasks (e.g. 'ideenScout', 'infoAutor')
  setAnalysisResult: (
    task: string, 
    data: any
  ) => void;
  
  clearAnalysis: () => void;
  
  // Selectors
  getChefPlanerResult: () => ChefPlanerResult | null;
  getRouteArchitectResult: () => RouteArchitectResult | null;
  // NEW: Generic selector for V40 components
  getAnalysisResult: (key: string) => any;
}

// --- SLICE IMPLEMENTATION ---
export const createAnalysisSlice: StateCreator<
  StoreState, 
  [],
  [],
  AnalysisSlice
> = (set, get) => ({

  // --- ACTIONS ---
  
  setAnalysisResult: (task, data) => {
    set((state) => {
      // FIX: Access analysis via 'project' property
      const newAnalysis = { ...state.project.analysis };

      // FIX: Generic assignment for ALL tasks
      // This covers: chefPlaner, routeArchitect, ideenScout, infoAutor, tourGuide, transferPlanner, etc.
      (newAnalysis as any)[task] = data;

      return {
        ...state,
        project: {
            ...state.project,
            analysis: newAnalysis,
            meta: {
                ...state.project.meta,
                updatedAt: new Date().toISOString()
            }
        }
      };
    });
  },

  clearAnalysis: () => {
    set((state) => ({
      ...state,
      project: {
          ...state.project,
          analysis: {
            // Reset to empty object or minimal defaults if needed
            // Keeping types happy by casting or partial reset
            ...({} as any) 
          }
      }
    }));
  },

  // --- SELECTORS ---
  
  getChefPlanerResult: () => {
    return get().project.analysis.chefPlaner || null;
  },

  getRouteArchitectResult: () => {
      return get().project.analysis.routeArchitect || null;
  },

  // NEW: Generic selector implementation
  getAnalysisResult: (key: string) => {
      return (get().project.analysis as any)[key] || null;
  }

});
// --- END OF FILE 98 Zeilen ---