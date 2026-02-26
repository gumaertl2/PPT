// 26.02.2026 12:05 - FEAT: Added 'mapLayer' to support different map styles (Standard, Topo, Cycle, Satellite).
// 25.02.2026 13:10 - FEAT: Added 'priority' to sortMode for Sight filtering.
// src/store/slices/createUISlice.ts

import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AppError, PrintConfig } from '../../core/types'; 

export type NotificationType = 'success' | 'error' | 'info' | 'loading';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline';
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  autoClose?: boolean | number;
  actions?: NotificationAction[];
}

export interface UIState {
  searchTerm: string;
  categoryFilter: string[];
  selectedCategory: string;
  selectedPrio: number | null;
  detailLevel: 'kompakt' | 'standard' | 'details';
  viewMode: 'list' | 'map';
  sortMode: 'category' | 'tour' | 'alphabetical' | 'priority';
  selectedPlaceId: string | null;
  isPrintMode: boolean;
  printConfig: PrintConfig | null;
  currentFileName: string | null; 
  showPlanningMode: boolean;
  mapMode: 'live' | 'offline'; 
  isMapManagerOpen: boolean; 
  mapLayer: 'standard' | 'topo' | 'cycle' | 'satellite'; // NEU
}

export type AppView = 'welcome' | 'wizard' | 'results' | 'analysis_review';

export interface UISlice {
  view: AppView;
  setView: (view: AppView) => void;

  isWorkflowModalOpen: boolean;
  setWorkflowModalOpen: (isOpen: boolean) => void;

  isInfoViewOpen: boolean;
  setInfoViewOpen: (isOpen: boolean) => void;

  manualPrompt: string | null;
  manualStepId: string | null;
  setManualMode: (prompt: string | null, stepId: string | null) => void;

  blockingError: AppError | null;
  setBlockingError: (error: AppError | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;

  uiState: UIState;
  setUIState: (updates: Partial<UIState>) => void;
  resetUIFilter: () => void;
  updatePlace: (id: string, data: Partial<any>) => void;
  deletePlace: (id: string) => void; 

  isSightFilterOpen: boolean;
  toggleSightFilter: () => void;

  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id'> & { id?: string }) => string;
  dismissNotification: (id: string) => void;
  removeNotification: (id: string) => void; 
  updateNotification: (id: string, updates: Partial<AppNotification>) => void;
}

const initialUIState: UIState = {
  searchTerm: '',
  categoryFilter: [],
  selectedCategory: 'all',
  selectedPrio: null,
  detailLevel: 'standard',
  viewMode: 'list',
  sortMode: 'category',
  selectedPlaceId: null,
  isPrintMode: false,
  printConfig: null,
  currentFileName: null, 
  showPlanningMode: false,
  mapMode: 'live',
  isMapManagerOpen: false,
  mapLayer: 'standard'
};

export const createUISlice: StateCreator<any, [], [], UISlice> = (set, get) => ({
  view: 'welcome',
  setView: (view) => set({ view }),

  isWorkflowModalOpen: false,
  setWorkflowModalOpen: (isOpen) => set({ isWorkflowModalOpen: isOpen }),

  isInfoViewOpen: false,
  setInfoViewOpen: (isOpen) => set({ isInfoViewOpen: isOpen }),

  manualPrompt: null,
  manualStepId: null,
  setManualMode: (prompt, stepId) => set({ manualPrompt: prompt, manualStepId: stepId }),

  blockingError: null,
  setBlockingError: (error) => set({ blockingError: error }),
  
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  uiState: initialUIState,
  
  setUIState: (updates) => set((state: any) => ({
    uiState: { ...state.uiState, ...updates }
  })),

  resetUIFilter: () => set((state: any) => ({
    uiState: {
      ...state.uiState,
      searchTerm: '',
      categoryFilter: [],
      selectedPlaceId: null
    }
  })),

  updatePlace: (id, data) => set((state: any) => {
    const newPlaces = { ...state.project.data.places };
    if (!newPlaces[id]) {
      newPlaces[id] = { id, ...data };
    } else {
      const isHotel = newPlaces[id].category === 'hotel';
      newPlaces[id] = { ...newPlaces[id], ...data };
      if (isHotel) {
         newPlaces[id].category = 'hotel'; 
      }
    }
    return {
      project: {
        ...state.project,
        data: { ...state.project.data, places: newPlaces },
        meta: { ...state.project.meta, updatedAt: new Date().toISOString() }
      }
    };
  }),

  deletePlace: (id) => set((state: any) => {
    const newPlaces = { ...state.project.data.places };
    delete newPlaces[id];
    return {
      project: {
        ...state.project,
        data: { ...state.project.data, places: newPlaces },
        meta: { ...state.project.meta, updatedAt: new Date().toISOString() }
      }
    };
  }),

  isSightFilterOpen: false,
  toggleSightFilter: () => set((state: any) => ({ isSightFilterOpen: !state.isSightFilterOpen })),

  notifications: [],

  addNotification: (notification) => {
    const id = notification.id || uuidv4();
    set((state: any) => ({
      notifications: [{ ...notification, id }, ...state.notifications].slice(0, 5)
    }));
    
    if (notification.autoClose !== false) {
      const timeout = typeof notification.autoClose === 'number' ? notification.autoClose : 3000;
      setTimeout(() => {
        get().dismissNotification(id);
      }, timeout);
    }
    return id;
  },

  dismissNotification: (id) => set((state: any) => ({
    notifications: state.notifications.filter((n: AppNotification) => n.id !== id)
  })),

  removeNotification: (id) => set((state: any) => ({
    notifications: state.notifications.filter((n: AppNotification) => n.id !== id)
  })),

  updateNotification: (id, updates) => set((state: any) => ({
    notifications: state.notifications.map((n: AppNotification) => n.id === id ? { ...n, ...updates } : n)
  }))
});
// --- END OF FILE 212 Zeilen ---