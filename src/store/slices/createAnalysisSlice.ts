// src/store/slices/createAnalysisSlice.ts
// 15.01.2026 20:30 - FIX: Added 'routeArchitect' case to persist AI results in Store.
// 15.01.2026 21:30 - FIX: Corrected State path to 'project.analysis' and adjusted Generic types for Store compatibility.

import type { StateCreator } from 'zustand';
import type { TripProject, ChefPlanerResult, RouteArchitectResult } from '../../core/types';

// Helper Type to avoid circular dependency with TripStore
// This represents the structure required by this slice
type StoreState = {
  project: TripProject;
} & AnalysisSlice;

// --- INTERFACE DEFINITION ---
export interface AnalysisSlice {
  // Actions
  setAnalysisResult: (
    task: 'chefPlaner' | 'routeArchitect', 
    data: ChefPlanerResult | RouteArchitectResult
  ) => void;
  
  clearAnalysis: () => void;
  
  // Selectors
  getChefPlanerResult: () => ChefPlanerResult | null;
  getRouteArchitectResult: () => RouteArchitectResult | null;
}

// --- SLICE IMPLEMENTATION ---
export const createAnalysisSlice: StateCreator<
  StoreState, // FIX: Use structural type compatible with TripStore
  [],
  [],
  AnalysisSlice
> = (set, get) => ({

  // --- ACTIONS ---
  
  setAnalysisResult: (task, data) => {
    set((state) => {
      // FIX: Access analysis via 'project' property
      // We need to update nested immutable state
      const newAnalysis = { ...state.project.analysis };

      if (task === 'chefPlaner') {
        newAnalysis.chefPlaner = data as ChefPlanerResult;
      } else if (task === 'routeArchitect') {
        newAnalysis.routeArchitect = data as RouteArchitectResult;
      }

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
            chefPlaner: null,
            routeArchitect: null 
          }
      }
    }));
  },

  // --- SELECTORS ---
  
  getChefPlanerResult: () => {
    // FIX: Access via project
    return get().project.analysis.chefPlaner;
  },

  getRouteArchitectResult: () => {
      // FIX: Access via project
      return get().project.analysis.routeArchitect || null;
  }

});
// --- END OF FILE 98 Zeilen ---