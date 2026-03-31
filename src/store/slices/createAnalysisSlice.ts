// 27.01.2026 19:45 - FIX: triggerAiTask delegates purely to Orchestrator (SSOT).
// Sequence logic moved to Orchestrator to support both Ad-Hoc and Workflow modes.
// src/store/slices/createAnalysisSlice.ts

import type { StateCreator } from 'zustand';
import type { TripProject, ChefPlanerResult, RouteArchitectResult, TaskKey } from '../../core/types';
import { TripOrchestrator } from '../../services/orchestrator';

// Helper Type to avoid circular dependency with TripStore
type StoreState = {
  project: TripProject;
} & AnalysisSlice;

// --- INTERFACE DEFINITION ---
export interface AnalysisSlice {
  // Actions
  setAnalysisResult: (
    task: string, 
    data: any
  ) => void;
  
  clearAnalysis: () => void;

  // Trigger AI tasks from UI
  triggerAiTask: (task: string, feedback?: string) => Promise<void>;
  
  // Selectors
  getChefPlanerResult: () => ChefPlanerResult | null;
  getRouteArchitectResult: () => RouteArchitectResult | null;
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
      const newAnalysis = { ...state.project.analysis };
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
            ...({} as any) 
          }
      }
    }));
  },

  // NEW: Pure Delegate to Orchestrator
  // The Sequencing (Scout -> Enricher) is now handled internally by executeTask
  triggerAiTask: async (task, feedback) => {
      console.log(`[Store] Triggering AI Task: ${task}`, feedback ? `(Feedback: ${feedback})` : '');
      await TripOrchestrator.executeTask(task as TaskKey, feedback);
  },

  // --- SELECTORS ---
  
  getChefPlanerResult: () => {
    return get().project.analysis.chefPlaner || null;
  },

  getRouteArchitectResult: () => {
      return get().project.analysis.routeArchitect || null;
  },

  getAnalysisResult: (key: string) => {
      return (get().project.analysis as any)[key] || null;
  }

});
// --- END OF FILE 105 Zeilen ---