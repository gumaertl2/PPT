// src/store/slices/createSystemSlice.ts
// 14.01.2026 15:45 - FIX: Re-applying Phase 1 (Model Overrides) strictly on verified upload.

import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { SecurityService } from '../../services/security';
import type { FlightRecorderEntry } from '../../core/types';
// NEW: Import types for model config
import type { ModelType, TaskKey } from '../../data/config';

export type AiStrategy = 'optimal' | 'pro' | 'fast';

export interface AiSettings {
  strategy: AiStrategy;
  debug: boolean;
  // NEW: Granulare Kontrolle pro Task
  modelOverrides: Partial<Record<TaskKey, ModelType>>;
}

export interface SystemSlice {
  // API & Security
  apiKey: string | null;
  setApiKey: (key: string | null) => void;

  // AI Settings
  aiSettings: AiSettings;
  setAiSettings: (settings: Partial<AiSettings>) => void;
  // NEW: Actions für Overrides
  setTaskModel: (task: TaskKey, model: ModelType) => void;
  resetModelOverrides: () => void;

  // Stats
  usageStats: {
    tokens: number;      // Legacy Support
    calls: number;       // Legacy Support
    totalTokens: number; // New Standard
    totalCalls: number;  // New Standard
    byModel: Record<string, { tokens: number; calls: number }>;
  };
  // FIX: Explicitly defined signature accepting 1 or 2 arguments
  addUsageStats: (tokens: number, model?: string) => void;

  // Flugschreiber (Logging)
  flightRecorderLogs: FlightRecorderEntry[];
  flightRecorder: FlightRecorderEntry[]; // Alias für UI-Kompatibilität
  
  logEvent: (entry: Omit<FlightRecorderEntry, 'id' | 'timestamp'>) => void;
  addLogEntry: (entry: FlightRecorderEntry) => void; // Alias
  clearFlightRecorder: () => void;
  downloadFlightRecorder: () => void;
  exportLogs: () => void; // Alias
}

const initialAiSettings: AiSettings = {
  strategy: 'optimal',
  debug: false,
  modelOverrides: {} // Init empty
};

export const createSystemSlice: StateCreator<any, [], [], SystemSlice> = (set, get) => ({
  // --- API KEY ---
  apiKey: SecurityService.loadApiKey(),
  
  setApiKey: (key) => {
    if (key) SecurityService.saveApiKey(key);
    else SecurityService.clearApiKey();
    set({ apiKey: key });
  },

  // --- AI SETTINGS ---
  aiSettings: initialAiSettings,
  
  setAiSettings: (settings) => set((state: any) => ({
    aiSettings: { ...state.aiSettings, ...settings }
  })),

  // NEW: Setzt einen spezifischen Task auf ein Modell
  setTaskModel: (task, model) => set((state: any) => ({
    aiSettings: {
        ...state.aiSettings,
        modelOverrides: {
            ...state.aiSettings.modelOverrides,
            [task]: model
        }
    }
  })),

  // NEW: Reset aller Overrides
  resetModelOverrides: () => set((state: any) => ({
      aiSettings: { ...state.aiSettings, modelOverrides: {} }
  })),

  // --- STATS ---
  usageStats: { 
    tokens: 0, 
    calls: 0, 
    totalTokens: 0, 
    totalCalls: 0, 
    byModel: {} 
  },

  addUsageStats: (tokens, model) => set((state: any) => {
    const newStats = { ...state.usageStats };
    
    // Update both legacy and new counters
    newStats.tokens += tokens;
    newStats.calls += 1;
    newStats.totalTokens += tokens;
    newStats.totalCalls += 1;

    if (model) {
        const currentModelStats = newStats.byModel[model] || { tokens: 0, calls: 0 };
        newStats.byModel = {
            ...newStats.byModel,
            [model]: {
                tokens: currentModelStats.tokens + tokens,
                calls: currentModelStats.calls + 1
            }
        };
    }

    return { usageStats: newStats };
  }),

  // --- FLUGSCHREIBER ---
  flightRecorderLogs: [],
  flightRecorder: [], // Init empty

  logEvent: (entry) => set((state: any) => {
    const fullEntry = { ...entry, id: uuidv4(), timestamp: new Date().toISOString() };
    return {
       flightRecorderLogs: [...state.flightRecorderLogs, fullEntry],
       flightRecorder: [...state.flightRecorder, fullEntry] // Sync Alias
    };
  }),

  addLogEntry: (entry) => set((state: any) => ({
     flightRecorderLogs: [...state.flightRecorderLogs, entry],
     flightRecorder: [...state.flightRecorder, entry]
  })),

  clearFlightRecorder: () => set({ flightRecorderLogs: [], flightRecorder: [] }),

  downloadFlightRecorder: () => {
    const state = get();
    // Nutze Logs oder Alias, falls Logs leer (Sicherheitsnetz)
    const logs = state.flightRecorderLogs.length > 0 ? state.flightRecorderLogs : state.flightRecorder;
    
    if (logs.length === 0) {
      if (get().addNotification) {
         get().addNotification({ type: 'info', message: 'Flugschreiber ist leer.' });
      }
      return;
    }

    // Namensgenerierung basierend auf Projektdaten (Zugriff via get().project)
    let baseName = "Papatours_Reise";
    if (state.project && state.project.userInputs) {
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
    }

    const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_'); 
    const fileName = `${safeName}_log_${new Date().toISOString().slice(0,10)}.json`;

    const exportData = {
      meta: {
        appVersion: state.project?.meta?.version || 'unknown',
        exportDate: new Date().toISOString(),
        totalLogs: logs.length
      },
      logs: logs
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (get().addNotification) {
        get().addNotification({ type: 'success', message: 'Logs exportiert.' });
    }
  },

  exportLogs: () => {
     get().downloadFlightRecorder();
  }
});
// --- END OF FILE 192 Zeilen ---