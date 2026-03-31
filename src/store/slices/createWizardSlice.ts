// 05.02.2026 18:00 - NEW: WIZARD SLICE.
// Extracted from createProjectSlice to separate UI-Input logic from Project-IO logic.
// src/store/slices/createWizardSlice.ts

import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { 
  TripUserProfile, 
  RouteStop, 
  CalendarEvent, 
  DepartureDetails 
} from '../../core/types';

export interface WizardSlice {
  // Specific Setters (Wizard)
  setTravelers: (data: Partial<TripUserProfile['travelers']>) => void;
  setDates: (data: Partial<TripUserProfile['dates']>) => void;
  setLogisticMode: (mode: 'stationaer' | 'mobil' | 'roundtrip') => void;
  
  setLogistics: (data: Partial<TripUserProfile['logistics']>) => void;
  updateLogistics: (section: 'stationary' | 'roundtrip', data: any) => void;

  updateStationary: (data: Partial<TripUserProfile['logistics']['stationary']>) => void;
  updateRoundtrip: (data: Partial<TripUserProfile['logistics']['roundtrip']>) => void;
  updateSearchSettings: (settings: Partial<TripUserProfile['searchSettings']>) => void;

  setDestination: (destination: string) => void;
  setStrategy: (strategyId: string) => void;
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
  updateProjectInput: (key: keyof TripUserProfile, value: any) => void;
  setNotes: (text: string) => void;
  toggleInterest: (id: string) => void;
  setCustomPreference: (interestId: string, text: string) => void;
  setAiOutputLanguage: (lang: string) => void;

  // Logic Linker
  assignHotelToLogistics: (placeId: string) => void;
}

export const createWizardSlice: StateCreator<any, [], [], WizardSlice> = (set) => ({

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

  setLogistics: (data) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        logistics: { ...state.project.userInputs.logistics, ...data }
      }
    }
  })),

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

  setStrategy: (strategyId) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        strategyId
      }
    }
  })),

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

  updateProjectInput: (key, value) => set((state: any) => ({
    project: {
      ...state.project,
      userInputs: {
        ...state.project.userInputs,
        [key]: value
      }
    }
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
  })),

  assignHotelToLogistics: (placeId) => set((state: any) => {
      const place = state.project.data.places[placeId];
      if (!place) return state;

      const logistics = state.project.userInputs.logistics;
      const mode = logistics.mode;

      if (mode === 'stationaer') {
          return {
              project: {
                  ...state.project,
                  userInputs: {
                      ...state.project.userInputs,
                      logistics: {
                          ...logistics,
                          stationary: { ...logistics.stationary, hotel: placeId }
                      }
                  }
              }
          };
      } 
      
      else if (mode === 'roundtrip' || mode === 'mobil') {
          const stops = logistics.roundtrip.stops || [];
          
          const matchedStopIndex = stops.findIndex((s: RouteStop) => {
              if (!s.location) return false;
              const cleanLoc = s.location.replace(/Region\s+/i, '').trim().toLowerCase();
              if (cleanLoc.length < 3) return false;

              const address = (place.address || '').toLowerCase();
              const reasoning = (place.location_match || '').toLowerCase();
              const city = (place.city || '').toLowerCase();

              return address.includes(cleanLoc) || reasoning.includes(cleanLoc) || city.includes(cleanLoc);
          });

          if (matchedStopIndex !== -1) {
              const newStops = [...stops];
              newStops[matchedStopIndex] = { ...newStops[matchedStopIndex], hotel: placeId };
              
              return {
                  project: {
                      ...state.project,
                      userInputs: {
                          ...state.project.userInputs,
                          logistics: {
                              ...logistics,
                              roundtrip: { ...logistics.roundtrip, stops: newStops }
                          }
                      }
                  }
              };
          } else {
              const firstEmptyIndex = stops.findIndex((s: RouteStop) => !s.hotel);
              if (firstEmptyIndex !== -1) {
                   const newStops = [...stops];
                   newStops[firstEmptyIndex] = { ...newStops[firstEmptyIndex], hotel: placeId };
                   return {
                        project: {
                            ...state.project,
                            userInputs: {
                                ...state.project.userInputs,
                                logistics: {
                                    ...logistics,
                                    roundtrip: { ...logistics.roundtrip, stops: newStops }
                                }
                            }
                        }
                   };
              }
          }
      }
      return state;
  })
});
// --- END OF FILE 332 Zeilen ---