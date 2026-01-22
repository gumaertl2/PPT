// 22.01.2026 21:45 - FIX: Implemented Incremental Saving via ResultProcessor to prevent data loss.
// src/services/orchestrator.ts

import { z } from 'zod';
import { GeminiService } from './gemini';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { useTripStore } from '../store/useTripStore';
import { ResultProcessor } from './ResultProcessor'; // <--- NEW IMPORT
import { CONFIG } from '../data/config';
import { APPENDIX_ONLY_INTERESTS } from '../data/constants'; 
import { 
  dayPlanSchema, 
  geoAnalystSchema,
  foodSchema,
  hotelSchema,
  chefPlanerSchema,
  routeArchitectSchema,
  ideenScoutSchema,
  chefredakteurSchema,
  infoAutorSchema,
  tourGuideSchema,
  transferPlannerSchema
} from './validation';
import type { TaskKey } from '../core/types';

// MAPPING: TaskKey -> Validation Schema
const SCHEMA_MAP: Partial<Record<TaskKey, z.ZodType<any>>> = {
  dayplan: dayPlanSchema,
  initialTagesplaner: dayPlanSchema,
  geoAnalyst: geoAnalystSchema,
  chefPlaner: chefPlanerSchema,
  routeArchitect: routeArchitectSchema,
  routenArchitekt: routeArchitectSchema,
  food: foodSchema,
  foodScout: foodSchema,
  foodEnricher: foodSchema,
  accommodation: hotelSchema,
  hotelScout: hotelSchema,
  ideenScout: ideenScoutSchema, 
  chefredakteur: chefredakteurSchema, 
  infoAutor: infoAutorSchema, 
  infos: infoAutorSchema, 
  details: chefredakteurSchema,
  tourGuide: tourGuideSchema,
  transferPlanner: transferPlannerSchema
};

const getTaskLimit = (task: TaskKey, isManual: boolean): number => {
    const aiSettings = useTripStore.getState().aiSettings;
    const mode = isManual ? 'manual' : 'auto';
    
    // 1. User Overrides
    const taskOverride = aiSettings.chunkOverrides?.[task]?.[mode];
    if (taskOverride) return taskOverride;
    
    // 2. Global Limit
    const globalLimit = aiSettings.chunkLimits?.[mode];
    
    // FIX: Check CONFIG defaults FIRST, before falling back to Global Settings default
    const configDefault = CONFIG.taskRouting.chunkDefaults?.[task]?.[mode];
    if (configDefault) return configDefault;

    if (globalLimit) return globalLimit;
    
    return 10;
};

const resolveModelId = (task: TaskKey): string => {
    const aiSettings = useTripStore.getState().aiSettings;
    const taskOverride = aiSettings.modelOverrides?.[task];
    if (taskOverride === 'pro') return CONFIG.api.models.pro;
    if (taskOverride === 'flash') return CONFIG.api.models.flash;
    if (aiSettings.strategy === 'pro') return CONFIG.api.models.pro; 
    if (aiSettings.strategy === 'fast') return CONFIG.api.models.flash; 
    const recommendedType = CONFIG.taskRouting.defaults[task] || 'flash';
    return CONFIG.api.models[recommendedType as 'pro'|'flash'] || CONFIG.api.models.flash;
};

// HELPER: Merge Results from Chunks
const mergeResults = (results: any[], task: TaskKey): any => {
    if (!results || results.length === 0) return null;
    if (results.length === 1) return results[0];

    console.log(`[Orchestrator] Merging ${results.length} chunks for ${task}...`);
    
    // Strategy A: Dayplan (Array concatenation for days)
    if (['dayplan', 'initialTagesplaner'].includes(task)) {
        const merged = JSON.parse(JSON.stringify(results[0])); // Clone first
        
        // Append days from subsequent chunks
        for (let i = 1; i < results.length; i++) {
             const chunk = results[i];
             
             // Support Schema (days) AND Legacy (itinerary.days)
             const newDays = chunk.days || chunk.itinerary?.days || [];

             if (Array.isArray(newDays)) {
                 // Try to find where to push in the merged object
                 if (merged.days && Array.isArray(merged.days)) {
                     merged.days.push(...newDays);
                 } else if (merged.itinerary?.days && Array.isArray(merged.itinerary.days)) {
                     merged.itinerary.days.push(...newDays);
                 } else {
                     // Fallback: If merged structure is unexpected, ensure we have a days array
                     if (!merged.days) merged.days = [];
                     merged.days.push(...newDays);
                 }
             }
        }
        return merged;
    }

    // Strategy B: Object Merge (Places, Content, Sights, Chapters)
    // For V40, places are often Record<string, Place>. Spreading merges them correctly.
    let merged: any = {};
    
    // If results are arrays (rare in V40 core, but possible for lists)
    if (Array.isArray(results[0])) {
        return results.flat();
    }

    // Object Deep Merge (Harmonized with Validation Schemas)
    results.forEach(chunk => {
        // 1. Maps / Records
        if (chunk.places) {
            merged.places = { ...(merged.places || {}), ...chunk.places };
        }
        if (chunk.content) {
            merged.content = { ...(merged.content || {}), ...chunk.content };
        }
        
        // 2. Lists (Validation Schema Keys)
        if (chunk.sights && Array.isArray(chunk.sights)) {
            merged.sights = [...(merged.sights || []), ...chunk.sights];
        }
        if (chunk.chapters && Array.isArray(chunk.chapters)) {
            merged.chapters = [...(merged.chapters || []), ...chunk.chapters];
        }

        // 3. Fallback: Copy other keys (Concatenate Arrays!)
        Object.keys(chunk).forEach(key => {
            if (!['places', 'content', 'sights', 'chapters'].includes(key)) {
                const value = chunk[key];
                
                // If it's an array, CONCATENATE instead of overwrite
                if (Array.isArray(value)) {
                    merged[key] = [...(merged[key] || []), ...value];
                } 
                // If it's an object, shallow merge
                else if (typeof value === 'object' && value !== null) {
                    merged[key] = { ...(merged[key] || {}), ...value };
                }
                // Primitives still overwrite (Last Wins)
                else {
                    merged[key] = value;
                }
            }
        });
    });

    return merged;
};

export const TripOrchestrator = {
  
  // Internal Loop for Auto-Mode (SEQUENTIAL EXECUTION)
  async executeInternalChunkLoop(task: TaskKey, totalItems: number, limit: number): Promise<any> {
     const store = useTripStore.getState();
     const totalChunks = Math.ceil(totalItems / limit);
     const collectedResults: any[] = [];
     const modelId = resolveModelId(task);
     const schema = SCHEMA_MAP[task];

     console.log(`[Orchestrator] Starting SEQUENTIAL Loop for ${task}: ${totalChunks} chunks.`);

     for (let i = 1; i <= totalChunks; i++) {
         console.log(`[Orchestrator] Processing Chunk ${i}/${totalChunks}...`);
         
         // UPDATE STORE (VISIBLE UI)
         store.setChunkingState({
             isActive: true, 
             currentChunk: i,
             totalChunks: totalChunks,
             results: collectedResults 
         });

         // Build Prompt via Options
         const prompt = PayloadBuilder.buildPrompt(task, undefined, {
             chunkIndex: i,
             limit: limit,
             totalChunks: totalChunks
         });

         // Execute
         const rawResult = await GeminiService.call(prompt, task, modelId);

         // Validate
         let validatedData = rawResult;
         if (schema) {
            const validation = schema.safeParse(rawResult);
            if (!validation.success) {
                console.warn(`[Orchestrator] Validation Failed for chunk ${i}.`, JSON.stringify(rawResult, null, 2));
                throw new Error(`KI-Antwort für Chunk ${i} ungültig.`);
            }
            validatedData = validation.data;
         }

         // --- NEW: INCREMENTAL SAVE ---
         // Save validated chunk immediately to store
         console.log(`[Orchestrator] Incrementally saving chunk ${i}/${totalChunks}...`);
         ResultProcessor.process(task, validatedData);
         // -----------------------------

         collectedResults.push(validatedData);

         // SAFETY DELAY
         if (i < totalChunks) {
             await new Promise(resolve => setTimeout(resolve, 500));
         }
     }

     store.resetChunking();
     return mergeResults(collectedResults, task);
  },

  async executeTask(task: TaskKey, feedback?: string): Promise<any> {
    const store = useTripStore.getState();
    const { project, chunkingState, setChunkingState, apiKey } = store;

    // --- 1. CHUNKING CHECK ---
    const chunkableTasks: TaskKey[] = [
        'anreicherer', 'chefredakteur', 'infoAutor', 'foodEnricher', 'chefPlaner',
        'dayplan', 'initialTagesplaner',
        'infos', 'details', 'basis'
    ];
    
    if (chunkableTasks.includes(task)) {
        let totalItems = 0;
        const isManual = !apiKey;
        const limit = getTaskLimit(task, isManual);

        // A. LIST BASED
        if (['anreicherer', 'chefredakteur', 'details'].includes(task)) {
            totalItems = Object.values(project.data.places || {}).flat().length;
        } 
        else if (task === 'foodEnricher') {
            const raw = (project.data.content as any)?.rawFoodCandidates || [];
            totalItems = raw.length; 
        }
        else if (task === 'chefPlaner') {
            totalItems = project.userInputs.dates.fixedEvents?.length || 0;
        }
        else if (['basis', 'sightCollector'].includes(task)) {
             totalItems = project.userInputs.selectedInterests.length;
        }
        // B. TIME BASED
        else if (['dayplan', 'initialTagesplaner'].includes(task)) {
            totalItems = project.userInputs.dates.duration || 1;
        }
        // C. TOPIC BASED
        else if (['infos', 'infoAutor'].includes(task)) {
            const appendixInterests = project.userInputs.selectedInterests.filter(id => 
                APPENDIX_ONLY_INTERESTS.includes(id)
            );
            totalItems = appendixInterests.length > 0 ? appendixInterests.length : 1;
        }

        // --- DECISION: INTERNAL LOOP (Auto) vs. UI LOOP (Manual) ---
        if (totalItems > limit) {
             if (apiKey) {
                 // AUTO MODE: Use Internal Loop (No UI State Recursion)
                 return this.executeInternalChunkLoop(task, totalItems, limit);
             } else {
                 // MANUAL MODE: Use UI Loop (Keep existing behavior)
                 if (!chunkingState.isActive || chunkingState.currentChunk === 0) {
                     const totalChunks = Math.ceil(totalItems / limit);
                     setChunkingState({
                        isActive: true,
                        currentChunk: 1, 
                        totalChunks: totalChunks,
                        results: [] 
                      });
                      await new Promise(r => setTimeout(r, 50));
                 }
             }
        } else {
            // No chunking needed
            if (chunkingState.isActive) store.resetChunking();
        }
    }

    // --- 2. STANDARD EXECUTION (Single Chunk or Manual Step) ---
    const prompt = PayloadBuilder.buildPrompt(task, feedback);
    const modelId = resolveModelId(task);
    
    if (store.aiSettings.debug) {
        console.log(`[Orchestrator] Task: ${task} -> Model: ${modelId}`);
    }

    // --- 3. EXECUTION ---
    const rawResult = await GeminiService.call(prompt, task, modelId);

    // --- 4. VALIDIERUNG ---
    const schema = SCHEMA_MAP[task];
    let validatedData = rawResult;

    if (schema) {
      const validation = schema.safeParse(rawResult);
      if (!validation.success) {
        console.warn(`[Orchestrator] Validation Failed for ${task}.`, JSON.stringify(rawResult, null, 2));
        console.error(`[Orchestrator] Schema Errors:`, validation.error);
        throw new Error(`KI-Antwort entspricht nicht dem V40-Schema für ${task}.`);
      }
      validatedData = validation.data;
    }

    return validatedData;
  }
};
// --- END OF FILE 295 Zeilen ---