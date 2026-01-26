// 27.01.2026 18:45 - FIX: Added triggerAiTask to support Ad-Hoc Modal.
// Uses correct 'TripOrchestrator' import and 'executeTask' method.
// src/store/slices/createAnalysisSlice.ts

import type { StateCreator } from 'zustand';
import type { TripProject, ChefPlanerResult, RouteArchitectResult, TaskKey } from '../../core/types'; // FIX: Added TaskKey
import { TripOrchestrator } from '../../services/orchestrator'; // FIX: Correct Import Name

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

  // NEW: Action to trigger AI tasks from UI components
  triggerAiTask: (task: string, feedback?: string) => Promise<void>;
  
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

  // NEW: Implementation of triggerAiTask
  triggerAiTask: async (task, feedback) => {
      console.log(`[Store] Triggering AI Task: ${task}`, feedback ? `(Feedback: ${feedback})` : '');
      // Delegate execution to the Orchestrator Service
      // FIX: Correctly call TripOrchestrator.executeTask
      await TripOrchestrator.executeTask(task as TaskKey, feedback);
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
// --- END OF FILE 113 Zeilen ---