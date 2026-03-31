// 23.02.2026 17:05 - FEAT: Added 'isFreeTierKey' to AiSettings.
// 05.02.2026 17:30 - REFACTOR: WORKFLOW TYPES.
// src/core/types/workflow.ts

import type { LocalizedContent } from './shared';

// --- WORKFLOW / MAGIC CHAIN ---
export type WorkflowStepId = 
  | 'chefPlaner'           
  | 'routeArchitect'       
  | 'basis'                
  | 'anreicherer'          
  | 'initialTagesplaner'   
  | 'transferPlanner'      
  | 'hotelScout'           
  | 'geoAnalyst'           
  | 'geoExpander'          
  | 'foodScout'            
  | 'foodEnricher'         
  | 'chefredakteur'        
  | 'infoAutor'            
  | 'countryScout'         
  | 'ideenScout'           
  | 'tourGuide'            
  | 'dayplan'        
  | 'guide'          
  | 'details'        
  | 'infos'          
  | 'food'           
  | 'accommodation'  
  | 'sondertage'     
  | 'transfers'      
  | 'routenArchitekt'; 

export type TaskKey = WorkflowStepId;

export interface WorkflowStepDef {
  id: WorkflowStepId;
  isMandatory: boolean;       
  requiresUserInteraction?: boolean; 
  requires?: WorkflowStepId[]; 
  label: LocalizedContent;
  description: LocalizedContent;
}

// --- AI SETTINGS ---
export type AiStrategy = 'optimal' | 'pro' | 'fast';
export type ModelType = 'pro' | 'flash' | 'thinking' | string;

export interface ChunkLimits {
    auto: number;   
    manual: number; 
}

export interface AiSettings {
  strategy: AiStrategy;
  debug: boolean;
  isFreeTierKey: boolean; // NEW: Flag for Traffic Shaping
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
// --- END OF FILE 84 Zeilen ---