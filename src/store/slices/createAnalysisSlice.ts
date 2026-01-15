// src/store/slices/createAnalysisSlice.ts
// 15.01.2026 20:30 - FIX: Added 'routeArchitect' case to persist AI results in Store.

import type { StateCreator } from 'zustand';
import type { TripProject, ChefPlanerResult, RouteArchitectResult } from '../../core/types';

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
  TripProject & AnalysisSlice,
  [],
  [],
  AnalysisSlice
> = (set, get) => ({

  // --- ACTIONS ---
  
  setAnalysisResult: (task, data) => {
    set((state) => {
      // Deep Copy of analysis object to ensure immutability
      const newAnalysis = { ...state.analysis };

      if (task === 'chefPlaner') {
        newAnalysis.chefPlaner = data as ChefPlanerResult;
      } else if (task === 'routeArchitect') {
        // FIX: Persist Route Architect Data
        newAnalysis.routeArchitect = data as RouteArchitectResult;
      }

      return {
        analysis: newAnalysis,
        // Update Meta Timestamp
        meta: {
          ...state.meta,
          updatedAt: new Date().toISOString()
        }
      };
    });
  },

  clearAnalysis: () => {
    set((state) => ({
      analysis: {
        chefPlaner: null,
        routeArchitect: null 
      }
    }));
  },

  // --- SELECTORS ---
  
  getChefPlanerResult: () => {
    return get().analysis.chefPlaner;
  },

  getRouteArchitectResult: () => {
      return get().analysis.routeArchitect || null;
  }

});
// --- END OF FILE 73 Zeilen ---