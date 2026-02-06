// 06.02.2026 15:10 - FEAT: Added 'currentFileName' to UIState.
// 29.01.2026 12:45 - FIX: Added 'selectedCategory' and 'selectedPrio' to UIState to resolve Vercel TS2339 build error.
// 23.01.2026 18:45 - FIX: Moved print states to UIState for setUIState compatibility (192 lines).
// src/store/slices/createUISlice.ts

import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AppError, PrintConfig } from '../../core/types'; 

// --- Types für Notifications ---
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

// --- Types für Anreicherer UI ---
export interface UIState {
  searchTerm: string;
  categoryFilter: string[];
  // FIX: Added missing fields for filtering (29.01.2026)
  selectedCategory: string;
  selectedPrio: number | null;
  detailLevel: 'kompakt' | 'standard' | 'details';
  viewMode: 'list' | 'map';
  sortMode: 'category' | 'tour' | 'alphabetical';
  selectedPlaceId: string | null;
  // FIX: Moved here for setUIState compatibility (resolves TS2353)
  isPrintMode: boolean;
  printConfig: PrintConfig | null;
  currentFileName: string | null; // <-- NEU
}

export type AppView = 'welcome' | 'wizard' | 'results' | 'analysis_review';

// --- Slice Interface ---
export interface UISlice {
  view: AppView;
  setView: (view: AppView) => void;

  isWorkflowModalOpen: boolean;
  setWorkflowModalOpen: (isOpen: boolean) => void;

  // NEW: Info View Modal State
  isInfoViewOpen: boolean;
  setInfoViewOpen: (isOpen: boolean) => void;

  // REMOVED: Top-level print fields to avoid redundancy and type errors

  // --- MANUAL MODE STATE (Neu) ---
  manualPrompt: string | null;
  manualStepId: string | null;
  setManualMode: (prompt: string | null, stepId: string | null) => void;

  // Global Error & Loading
  blockingError: AppError | null;
  setBlockingError: (error: AppError | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;

  // Anreicherer / Sights View State & Logic
  uiState: UIState;
  setUIState: (updates: Partial<UIState>) => void;
  resetUIFilter: () => void;
  updatePlace: (id: string, data: Partial<any>) => void;
  deletePlace: (id: string) => void; 

  // NEW: Controls visibility of the filter panel in SightsView
  isSightFilterOpen: boolean;
  toggleSightFilter: () => void;

  // Notifications
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id'> & { id?: string }) => string;
  dismissNotification: (id: string) => void;
  removeNotification: (id: string) => void; 
  updateNotification: (id: string, updates: Partial<AppNotification>) => void;
}

const initialUIState: UIState = {
  searchTerm: '',
  categoryFilter: [],
  // FIX: Initialized new fields (29.01.2026)
  selectedCategory: 'all',
  selectedPrio: null,
  detailLevel: 'standard',
  viewMode: 'list',
  sortMode: 'category',
  selectedPlaceId: null,
  isPrintMode: false,
  printConfig: null,
  currentFileName: null // <-- NEU
};

export const createUISlice: StateCreator<any, [], [], UISlice> = (set, get) => ({
  view: 'welcome',
  setView: (view) => set({ view }),

  isWorkflowModalOpen: false,
  setWorkflowModalOpen: (isOpen) => set({ isWorkflowModalOpen: isOpen }),

  // NEW: Info View Modal Implementation
  isInfoViewOpen: false,
  setInfoViewOpen: (isOpen) => set({ isInfoViewOpen: isOpen }),

  // IMPLEMENTATION: Print states are now part of initialUIState

  // --- MANUAL MODE IMPL (Neu) ---
  manualPrompt: null,
  manualStepId: null,
  setManualMode: (prompt, stepId) => set({ manualPrompt: prompt, manualStepId: stepId }),

  blockingError: null,
  setBlockingError: (error) => set({ blockingError: error }),
  
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // --- ANREICHERER ---

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
      newPlaces[id] = { ...newPlaces[id], ...data };
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

  // --- NOTIFICATIONS ---

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
// --- END OF FILE 198 Zeilen ---