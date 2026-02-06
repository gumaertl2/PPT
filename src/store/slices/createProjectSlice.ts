// 06.02.2026 12:05 - FEAT: Updated saveProject to accept optional fileName.
// 05.02.2026 18:00 - REFACTOR: PROJECT CORE SLICE.
// - Reduced to Core Project IO (Load/Save/Reset).
// - Logic for Wizard inputs moved to 'createWizardSlice'.
// src/store/slices/createProjectSlice.ts

import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { TripProject, LanguageCode } from '../../core/types';
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
      pets: false
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
  data: { places: {}, content: {}, routes: {} },
  itinerary: { days: [] }
});

export const createProjectSlice: StateCreator<any, [], [], ProjectSlice> = (set, get) => ({
  project: createInitialProject(),

  setProject: (project) => set({ project }),

  loadProject: async (fileOrProject) => {
    try {
      let data: any;

      if (
        fileOrProject && 
        typeof fileOrProject === 'object' && 
        'meta' in fileOrProject && 
        'userInputs' in fileOrProject
      ) {
          data = fileOrProject;
      } 
      else if (fileOrProject instanceof File) {
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
      
      set((state: any) => ({
        ...state,
        project: {
          ...data,
          meta: { ...data.meta, updatedAt: new Date().toISOString() }
        },
        view: 'wizard' 
      }));

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

  resetProject: () => set({ project: createInitialProject(), view: 'welcome', blockingError: null }),

  setLanguage: (lang) => set((state: any) => ({
    project: { ...state.project, meta: { ...state.project.meta, language: lang } }
  })),
});
// --- END OF FILE 142 Zeilen ---