// 05.02.2026 17:00 - REFACTOR: WORKFLOW TYPES.
// Cleaned up V30 legacy keys.
// src/core/types/workflow.ts

import { LocalizedContent } from './shared';

// --- WORKFLOW / MAGIC CHAIN ---
export type WorkflowStepId = 
  // --- V40 Primary Keys (Agent Based) ---
  | 'chefPlaner'           // Fundamentalanalyse
  | 'routeArchitect'       // Routenplaner
  | 'basis'                // Sight Collector (Merged)
  | 'anreicherer'          // Data Enricher
  | 'initialTagesplaner'   // Day Planner
  | 'transferPlanner'      // Logistics
  | 'hotelScout'           // Accommodation
  | 'geoAnalyst'           // Location Analysis
  | 'geoExpander'          // Geo Expansion (New V40.5)
  | 'foodScout'            // Food Collector
  | 'foodEnricher'         // Food Auditor
  | 'chefredakteur'        // Content Details
  | 'infoAutor'            // A-Z Infos
  | 'countryScout'         // Country Info
  | 'ideenScout'           // Wildcards / Special Days
  | 'tourGuide'            // Tours

  // --- UI / Legacy Aliases (Supported for backward compatibility) ---
  | 'dayplan'        // Alias: initialTagesplaner
  | 'guide'          // Alias: tourGuide
  | 'details'        // Alias: chefredakteur
  | 'infos'          // Alias: infoAutor
  | 'food'           // Alias: foodScout
  | 'accommodation'  // Alias: hotelScout
  | 'sondertage'     // Alias: ideenScout
  | 'transfers'      // Alias: transferPlanner
  | 'routenArchitekt'; // Alias: routeArchitect

export type TaskKey = WorkflowStepId;

export interface WorkflowStepDef {
  id: WorkflowStepId;
  isMandatory: boolean;       
  requiresUserInteraction?: boolean; 
  requires?: WorkflowStepId[]; 
  label: { de: string; en: string; };
  description: { de: string; en: string; };
}

// --- AI SETTINGS ---
export type AiStrategy = 'optimal' | 'pro' | 'fast';
export type ModelType = 'pro' | 'flash' | string;

export interface ChunkLimits {
    auto: number;   
    manual: number; 
}

export interface AiSettings {
  strategy: AiStrategy;
  debug: boolean;
  modelOverrides: Partial<Record<TaskKey, ModelType>>;
  chunkLimits: ChunkLimits;
  chunkOverrides: Partial<Record<TaskKey, Partial<ChunkLimits>>>;
}

export interface ChunkingState {
    isActive: boolean;
    currentChunk: number;
    totalChunks: number;
    dataChunks: any[]; 
    results: any[];     
}

// --- PAYLOAD INTERFACES ---
export type FoodSearchMode = 'standard' | 'stars';

export interface FoodSearchPayload {
  context: {
    town_list?: string[];
    location_name?: string;
    [key: string]: any;
  };
  instructions: {
    role?: string;
    [key: string]: any;
  };
  userInputs?: any;
}
// --- END OF FILE 80 Zeilen ---