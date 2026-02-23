// 23.02.2026 15:45 - FEAT: Added 'mergeProject' to integrate donor projects safely.
// 23.02.2026 13:25 - FIX: Added missing 'updateSearchSettings' and 'updateUserInputs'.
// 21.02.2026 15:20 - FIX: Ensured 'travelerNames' and 'expenses' map smoothly to TripProject definition.
// src/store/slices/createProjectSlice.ts

import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { TripProject, LanguageCode, UserInputs } from '../../core/types';
import type { Expense } from '../../core/types/shared';
import { mergeProjects } from '../../core/utils/projectMerger';
import {
  DEFAULT_SIGHTS_COUNT,
  DEFAULT_MIN_RATING,
  DEFAULT_MIN_DURATION
} from '../../data/constants';

export interface ProjectSlice {
  project: TripProject;

  // Actions
  setProject: (project: TripProject) => void;
  loadProject: (fileOrProject: File | TripProject | any) => Promise<void> | void;
  saveProject: (fileName?: string) => void;
  resetProject: () => void;
  setLanguage: (lang: LanguageCode) => void;
  togglePlaceVisited: (placeId: string) => void; 
  mergeProject: (donorData: any) => { addedCount: number; skippedCount: number } | void;
  
  // Settings Sync
  updateSearchSettings: (settings: Partial<UserInputs['searchSettings']>) => void;
  updateUserInputs: (inputs: Partial<UserInputs>) => void;
  
  // Trip Finance
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
}

// Helper für Initial State
const createInitialProject = (): TripProject => ({
  meta: {
    id: uuidv4(),
    version: '4.0.6',
    created: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: 'Neue Reise',
    language: 'de'
  },
  analysis: {
    chefPlaner: null,
    routeArchitect: null, 
    geoAnalyst: null      
  },
  userInputs: {
    travelers: {
      adults: 2,
      children: 0,
      origin: '',
      nationality: '',
      groupType: 'couple',
      pets: false,
      travelerNames: ''
    },
    dates: {
      start: '',
      end: '',
      duration: 7,
      flexible: false,
      fixedEvents: [],
      fixedDates: undefined,
      arrival: { type: 'suggestion' },
      departure: {}
    },
    logistics: {
      mode: 'stationaer',
      stationary: { region: '', destination: '' },
      roundtrip: { 
        region: '', 
        startLocation: '', 
        endLocation: '', 
        tripMode: 'inspiration', 
        stops: [], 
        constraints: {} 
      },
      roundtripOptions: { waypoints: '', strictRoute: false }
    },
    searchSettings: {
      sightsCount: DEFAULT_SIGHTS_COUNT,
      minRating: DEFAULT_MIN_RATING,
      minDuration: DEFAULT_MIN_DURATION
    },
    pace: 'balanced',        
    budget: 'flexible',      
    strategyId: 'classic_discovery', 
    vibe: 'explorer',        
    
    selectedInterests: [],
    customPreferences: {},
    notes: '',
    aiOutputLanguage: 'de'
  },
  data: { 
      places: {}, 
      content: {}, 
      routes: {}, 
      expenses: {}
  }, 
  itinerary: { days: [] }
});

export const createProjectSlice: StateCreator<any, [], [], ProjectSlice> = (set, get) => ({
  project: createInitialProject(),

  setProject: (project) => set({ project }),

  loadProject: async (fileOrProject) => {
    try {
      let data: any;
      let filenameToSet: string | null = null;

      if (
        fileOrProject && 
        typeof fileOrProject === 'object' && 
        'meta' in fileOrProject && 
        'userInputs' in fileOrProject
      ) {
          data = fileOrProject;
      } 
      else if (fileOrProject instanceof File) {
          filenameToSet = fileOrProject.name; 
          const text = await new Promise<string>((resolve, reject) => {
             const reader = new FileReader();
             reader.onload = (e) => resolve(e.target?.result as string);
             reader.onerror = reject;
             reader.readAsText(fileOrProject);
          });
          data = JSON.parse(text);
      } else {
          throw new Error("Invalid input format for loadProject");
      }
      
      if (!data.data.expenses) {
          data.data.expenses = {};
      }
      
      set((state: any) => ({
        ...state,
        project: {
          ...data,
          meta: { ...data.meta, updatedAt: new Date().toISOString() }
        },
        view: 'wizard' 
      }));

      if (filenameToSet && get().setUIState) {
        get().setUIState({ currentFileName: filenameToSet });
      }

      if (get().addNotification) {
        get().addNotification({ type: 'success', message: 'Projekt geladen.' });
      }

    } catch (e) {
      console.error("Load Error:", e);
      if (get().addNotification) {
        get().addNotification({ type: 'error', message: 'Fehler beim Laden.' });
      }
    }
  },

  mergeProject: (donorData) => {
    const state = get();
    const { updatedProject, stats } = mergeProjects(state.project, donorData);
    
    set({ project: updatedProject });
    
    if (state.addNotification && stats.addedCount > 0) {
      state.addNotification({ type: 'success', message: `${stats.addedCount} neue Orte hinzugefügt (${stats.skippedCount} Duplikate).` });
    } else if (state.addNotification && stats.addedCount === 0) {
      state.addNotification({ type: 'info', message: `Keine neuen Orte gefunden (${stats.skippedCount} Duplikate).` });
    }
    
    return stats;
  },

  saveProject: (customFileName?: string) => {
    const state = get();
    const projectData = JSON.stringify(state.project, null, 2);
    
    let fileName = customFileName;

    if (!fileName) {
        let baseName = "Papatours_Reise";
        const { logistics } = state.project.userInputs;
        
        if (logistics.mode === 'stationaer') {
            const dest = logistics.stationary.destination?.trim();
            const reg = logistics.stationary.region?.trim();
            if (dest && reg) baseName = `${dest}_${reg}`;
            else if (dest) baseName = dest;
            else if (reg) baseName = reg;
        } else {
            const reg = logistics.roundtrip.region?.trim();
            if (reg) baseName = `Rundreise_${reg}`;
        }

        const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_'); 
        fileName = `${safeName}_${new Date().toISOString().slice(0,10)}.json`;
    }
    
    if (get().setUIState) {
        get().setUIState({ currentFileName: fileName });
    }
    
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (get().addNotification) {
      get().addNotification({ type: 'success', message: 'Gespeichert.' });
    }
  },

  resetProject: () => {
    const { setUIState } = get();
    if (setUIState) {
        setUIState({ currentFileName: null });
    }
    set({ project: createInitialProject(), view: 'welcome', blockingError: null });
  },

  setLanguage: (lang) => set((state: any) => ({
    project: { ...state.project, meta: { ...state.project.meta, language: lang } }
  })),

  updateSearchSettings: (settings) => set((state: any) => ({
    project: {
        ...state.project,
        userInputs: {
            ...state.project.userInputs,
            searchSettings: {
                ...state.project.userInputs.searchSettings,
                ...settings
            }
        }
    }
  })),

  updateUserInputs: (inputs) => set((state: any) => ({
    project: {
        ...state.project,
        userInputs: {
            ...state.project.userInputs,
            ...inputs
        }
    }
  })),

  togglePlaceVisited: (placeId) => set((state: any) => {
    const place = state.project.data.places[placeId];
    if (!place) return state;

    const isVisited = !place.visited;
    return {
      project: {
        ...state.project,
        data: {
          ...state.project.data,
          places: {
            ...state.project.data.places,
            [placeId]: {
              ...place,
              visited: isVisited,
              visitedAt: isVisited ? new Date().toISOString() : undefined
            }
          }
        }
      }
    };
  }),

  addExpense: (expense: Expense) => set((state: any) => ({
    project: {
      ...state.project,
      data: {
        ...state.project.data,
        expenses: {
          ...(state.project.data.expenses || {}),
          [expense.id]: expense
        }
      }
    }
  })),

  updateExpense: (id: string, updateData: Partial<Expense>) => set((state: any) => {
    const existing = state.project.data.expenses?.[id];
    if (!existing) return state;
    return {
      project: {
        ...state.project,
        data: {
          ...state.project.data,
          expenses: {
            ...state.project.data.expenses,
            [id]: { ...existing, ...updateData }
          }
        }
      }
    };
  }),

  deleteExpense: (id: string) => set((state: any) => {
    const newExpenses = { ...(state.project.data.expenses || {}) };
    delete newExpenses[id];
    return {
      project: {
        ...state.project,
        data: {
          ...state.project.data,
          expenses: newExpenses
        }
      }
    };
  }),
});
// --- END OF FILE 313 Zeilen ---