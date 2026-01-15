// src/store/slices/createAnalysisSlice.ts
// 14.01.2026 12:45
// FEATURE: Analysis Slice for ChefPlaner Results
// 15.01.2026 17:15 - UPDATE: Added 'routeArchitect' to AnalysisSlice (V30 Roundtrip Workflow).
// 15.01.2026 18:50 - FIX: Use 'import type' for StateCreator to avoid runtime SyntaxError.

import type { StateCreator } from 'zustand'; // FIX: Added 'type' keyword
import type { TripProject, ChefPlanerResult, RouteArchitectResult } from '../../core/types';

// --- INTERFACE DEFINITION ---
export interface AnalysisSlice {
  // Actions
  setAnalysisResult: (
    task: 'chefPlaner' | 'routeArchitect', 
    data: ChefPlanerResult | RouteArchitectResult
  ) => void;
  
  clearAnalysis: () => void;
  
  // Selectors (optional helper)
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
        // NEU: Speichern der Routen-Vorschläge
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
// --- END OF FILE 65 Zeilen ---