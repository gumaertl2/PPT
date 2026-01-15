// src/store/slices/createProjectSlice.ts
// 14.01.2026 11:45 - FIX: Corrected setRoundtripOptions to target logistics.roundtripOptions (not roundtrip). Updated Interface types.
// 15.01.2026 22:00 - FIX: Added updateLogistics to support generic updates from RouteReviewView.

import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { 
  TripProject, 
  LanguageCode, 
  TripUserProfile, 
  RouteStop, 
  CalendarEvent, 
  DepartureDetails 
} from '../../core/types';
import {
  DEFAULT_SIGHTS_COUNT,
  DEFAULT_MIN_RATING,
  DEFAULT_MIN_DURATION
} from '../../data/constants';

// Wir definieren das Interface für diesen Slice
export interface ProjectSlice {
  project: TripProject;

  // Actions
  setProject: (project: TripProject) => void;
  loadProject: (fileOrProject: File | TripProject | any) => Promise<void> | void;
  saveProject: () => void;
  resetProject: () => void;
  setLanguage: (lang: LanguageCode) => void;

  // Specific Setters (Wizard)
  setTravelers: (data: Partial<TripUserProfile['travelers']>) => void;
  setDates: (data: Partial<TripUserProfile['dates']>) => void;
  setLogisticMode: (mode: 'stationaer' | 'mobil') => void;
  
  // FIX: Added generic setLogistics
  setLogistics: (data: Partial<TripUserProfile['logistics']>) => void;
  
  // FIX: Added generic updateLogistics (needed by RouteReviewView)
  updateLogistics: (section: 'stationary' | 'roundtrip', data: any) => void;

  updateStationary: (data: Partial<TripUserProfile['logistics']['stationary']>) => void;
  updateRoundtrip: (data: Partial<TripUserProfile['logistics']['roundtrip']>) => void;
  updateSearchSettings: (settings: Partial<TripUserProfile['searchSettings']>) => void;

  // FIX: Missing Actions requested by ProfileStep
  setDestination: (destination: string) => void;
  setStrategy: (strategyId: string) => void;
  // FIX: Updated type to match new roundtripOptions structure
  setRoundtripOptions: (data: Partial<{ waypoints: string; strictRoute: boolean }>) => void;

  // Complex Objects
  addRouteStop: () => void;
  removeRouteStop: (id: string) => void;
  updateRouteStop: (id: string, data: Partial<RouteStop>) => void;
  reorderStops: (stops: RouteStop[]) => void;

  addCalendarEvent: () => void;
  removeCalendarEvent: (id: string) => void;
  updateCalendarEvent: (id: string, data: Partial<CalendarEvent>) => void;

  setArrival: (data: Partial<TripUserProfile['dates']['arrival']>) => void;
  setDeparture: (data: Partial<DepartureDetails>) => void;

  setConfig: (key: 'pace' | 'budget' | 'vibe' | 'strategyId', value: string) => void;
  setNotes: (text: string) => void;
  toggleInterest: (id: string) => void;
  setCustomPreference: (interestId: string, text: string) => void;
  setAiOutputLanguage: (lang: string) => void;
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
    chefPlaner: null
  },
  userInputs: {
    travelers: {
      adults: 2,
      children: 0,
      origin: '',
      nationality: 'de',
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
      // FIX: Init roundtripOptions
      roundtripOptions: { waypoints: '', strictRoute: false }
    },
    searchSettings: {
      sightsCount: DEFAULT_SIGHTS_COUNT,
      minRating: DEFAULT_MIN_RATING,
      minDuration: DEFAULT_MIN_DURATION
    },
    pace: 'Ausgewogen',
    budget: 'Flexibel',
    strategyId: 'balanced_explorer',
    vibe: '',
    selectedInterests: [],
    customPreferences: {},
    notes: '',
    aiOutputLanguage: 'de'
  },
  data: { places: {}, content: {}, routes: {} },
  itinerary: { days: [] }
});

// Slice Implementation
export const createProjectSlice: StateCreator<any, [], [], ProjectSlice> = (set, get) => ({
  project: createInitialProject(),

  setProject: (project) => set({ project }),

  loadProject: async (fileOrProject) => {
    try {
      let data: any;

      // Case A: Input ist bereits JSON
      if (
        fileOrProject && 
        typeof fileOrProject === 'object' && 
        'meta' in fileOrProject && 
        'userInputs' in fileOrProject
      ) {
         data = fileOrProject;
      } 
      // Case B: Input ist File Objekt
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
      
      // Update State
      set((state: any) => ({
        ...state,
        project: {
          ...data,
          meta: { ...data.meta, updatedAt: new Date().toISOString() }
        },
        view: 'wizard' 
      }));

      // Benachrichtigung (Optional Chaining für Sicherheit)
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

  saveProject: () => {
    const state = get();
    const projectData = JSON.stringify(state.project, null, 2);
    
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
    const fileName = `${safeName}_${new Date().toISOString().slice(0,10)}.json`;
    
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

  // --- SETTERS ---

  setTravelers: (data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        travelers: { ...state.project.userInputs.travelers, ...data }
      }
    }
  })),

  setDates: (data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        dates: { ...state.project.userInputs.dates, ...data }
      }
    }
  })),

  setLogisticMode: (mode) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: { ...state.project.userInputs.logistics, mode }
      }
    }
  })),

  // FIX: Implemented setLogistics
  setLogistics: (data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: { ...state.project.userInputs.logistics, ...data }
      }
    }
  })),

  // FIX: Implemented updateLogistics
  updateLogistics: (section, data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: {
           ...state.project.userInputs.logistics,
           [section]: { ...state.project.userInputs.logistics[section], ...data }
        }
      }
    }
  })),

  updateStationary: (data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: {
          ...state.project.userInputs.logistics,
          stationary: { ...state.project.userInputs.logistics.stationary, ...data }
        }
      }
    }
  })),

  updateRoundtrip: (data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: {
          ...state.project.userInputs.logistics,
          roundtrip: { ...state.project.userInputs.logistics.roundtrip, ...data }
        }
      }
    }
  })),

  updateSearchSettings: (settings) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        searchSettings: { ...state.project.userInputs.searchSettings, ...settings }
      }
    }
  })),

  // FIX: Implemented setDestination
  setDestination: (destination) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: {
          ...state.project.userInputs.logistics,
          stationary: { 
            ...state.project.userInputs.logistics.stationary, 
            destination 
          }
        }
      }
    }
  })),

  // FIX: Implemented setStrategy
  setStrategy: (strategyId) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        strategyId
      }
    }
  })),

  // FIX: Implemented setRoundtripOptions correctly pointing to logistics.roundtripOptions
  setRoundtripOptions: (data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: {
          ...state.project.userInputs.logistics,
          roundtripOptions: { 
            ...state.project.userInputs.logistics.roundtripOptions, 
            ...data 
          }
        }
      }
    }
  })),

  addRouteStop: () => set((state: any) => {
    const newStop: RouteStop = { id: uuidv4(), location: '', duration: 0 };
    return {
      project: {
        ...state.project,
        userInputs: {
          ...state.project.userInputs,
          logistics: {
            ...state.project.userInputs.logistics,
            roundtrip: {
              ...state.project.userInputs.logistics.roundtrip,
              stops: [...state.project.userInputs.logistics.roundtrip.stops, newStop]
            }
          }
        }
      }
    };
  }),

  removeRouteStop: (id) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: {
          ...state.project.userInputs.logistics,
          roundtrip: {
            ...state.project.userInputs.logistics.roundtrip,
            stops: state.project.userInputs.logistics.roundtrip.stops.filter((s: RouteStop) => s.id !== id)
          }
        }
      }
    }
  })),

  updateRouteStop: (id, data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: {
          ...state.project.userInputs.logistics,
          roundtrip: {
            ...state.project.userInputs.logistics.roundtrip,
            stops: state.project.userInputs.logistics.roundtrip.stops.map((s: RouteStop) => 
              s.id === id ? { ...s, ...data } : s
            )
          }
        }
      }
    }
  })),

  reorderStops: (stops) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: {
          ...state.project.userInputs.logistics,
          roundtrip: { ...state.project.userInputs.logistics.roundtrip, stops }
        }
      }
    }
  })),

  addCalendarEvent: () => set((state: any) => {
    const newEvent: CalendarEvent = { id: uuidv4(), date: '', title: '', description: '' };
    return {
      project: {
        ...state.project,
        userInputs: {
          ...state.project.userInputs,
          dates: {
            ...state.project.userInputs.dates,
            fixedEvents: [...state.project.userInputs.dates.fixedEvents, newEvent]
          }
        }
      }
    };
  }),

  removeCalendarEvent: (id) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        dates: {
          ...state.project.userInputs.dates,
          fixedEvents: state.project.userInputs.dates.fixedEvents.filter((e: CalendarEvent) => e.id !== id)
        }
      }
    }
  })),

  updateCalendarEvent: (id, data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        dates: {
          ...state.project.userInputs.dates,
          fixedEvents: state.project.userInputs.dates.fixedEvents.map((e: CalendarEvent) => 
            e.id === id ? { ...e, ...data } : e
          )
        }
      }
    }
  })),

  setArrival: (data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        dates: {
          ...state.project.userInputs.dates,
          arrival: { ...state.project.userInputs.dates.arrival, ...data }
        }
      }
    }
  })),

  setDeparture: (data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        dates: {
          ...state.project.userInputs.dates,
          departure: { ...state.project.userInputs.dates.departure, ...data }
        }
      }
    }
  })),

  setConfig: (key, value) => set((state: any) => ({
    project: { ...state.project, userInputs: { ...state.project.userInputs, [key]: value } }
  })),

  setNotes: (text) => set((state: any) => ({
    project: { ...state.project, userInputs: { ...state.project.userInputs, notes: text } }
  })),

  toggleInterest: (id) => set((state: any) => {
    const current = state.project.userInputs.selectedInterests;
    const isSelected = current.includes(id);
    return {
      project: {
        ...state.project,
        userInputs: {
          ...state.project.userInputs,
          selectedInterests: isSelected ? current.filter((i: string) => i !== id) : [...current, id]
        }
      }
    };
  }),

  setCustomPreference: (interestId, text) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        customPreferences: { ...state.project.userInputs.customPreferences, [interestId]: text }
      }
    }
  })),

  setAiOutputLanguage: (lang) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: { ...state.project.userInputs, aiOutputLanguage: lang }
    }
  }))
});
// --- END OF FILE 423 Zeilen ---