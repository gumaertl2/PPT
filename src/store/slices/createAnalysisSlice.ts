// src/store/slices/createAnalysisSlice.ts
import type { StateCreator } from 'zustand';
import type { ChefPlanerResult } from '../../core/types';

export interface AnalysisSlice {
  setAnalysisResult: (task: 'chefPlaner', data: ChefPlanerResult) => void;
}

export const createAnalysisSlice: StateCreator<any, [], [], AnalysisSlice> = (set) => ({
  setAnalysisResult: (task, data) => set((state: any) => ({
    project: {
      ...state.project,
      analysis: {
        ...state.project.analysis,
        [task]: data
      }
    }
  })),
});