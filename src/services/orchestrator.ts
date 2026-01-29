// 31.01.2026 14:00 - FIX: Return Enriched Result instead of Raw Scout Result to prevent Data Overwrite in Hook.
// 31.01.2026 13:30 - FIX: Injected "RAM-ID-Assigner" in Food Pipeline. Ensures candidates have safe IDs before reaching GeoFilter/PayloadBuilder.
// 31.01.2026 00:15 - FIX: Pure RAM Pipeline. Scout & Geo data is passed in-memory to Enricher. No intermediate Store saves.
// src/services/orchestrator.ts

import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { GeminiService } from './gemini';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { useTripStore } from '../store/useTripStore';
import { ResultProcessor } from './ResultProcessor'; 
import { CONFIG } from '../data/config';
import { APPENDIX_ONLY_INTERESTS } from '../data/constants'; 
import { applyAdaptiveGeoFilter } from '../core/utils/geo'; 
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
    const taskOverride = aiSettings.chunkOverrides?.[task]?.[mode];
    if (taskOverride) return taskOverride;
    const globalLimit = aiSettings.chunkLimits?.[mode];
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
    
    if (['dayplan', 'initialTagesplaner'].includes(task)) {
        const merged = JSON.parse(JSON.stringify(results[0])); 
        for (let i = 1; i < results.length; i++) {
             const chunk = results[i];
             const newDays = chunk.days || chunk.itinerary?.days || [];
             if (Array.isArray(newDays)) {
                 if (merged.days && Array.isArray(merged.days)) {
                     merged.days.push(...newDays);
                 } else if (merged.itinerary?.days && Array.isArray(merged.itinerary.days)) {
                     merged.itinerary.days.push(...newDays);
                 } else {
                     if (!merged.days) merged.days = [];
                     merged.days.push(...newDays);
                 }
             }
        }
        return merged;
    }

    let merged: any = {};
    if (Array.isArray(results[0])) return results.flat();

    results.forEach(chunk => {
        if (chunk.places) merged.places = { ...(merged.places || {}), ...chunk.places };
        if (chunk.content) merged.content = { ...(merged.content || {}), ...chunk.content };
        if (chunk.sights && Array.isArray(chunk.sights)) merged.sights = [...(merged.sights || []), ...chunk.sights];
        if (chunk.chapters && Array.isArray(chunk.chapters)) merged.chapters = [...(merged.chapters || []), ...chunk.chapters];

        Object.keys(chunk).forEach(key => {
            if (!['places', 'content', 'sights', 'chapters'].includes(key)) {
                const value = chunk[key];
                if (Array.isArray(value)) {
                    merged[key] = [...(merged[key] || []), ...value];
                } else if (typeof value === 'object' && value !== null) {
                    merged[key] = { ...(merged[key] || {}), ...value };
                } else {
                    merged[key] = value;
                }
            }
        });
    });
    return merged;
};

export const TripOrchestrator = {
  
  // FIX: Added 'inputData' to pass data in-memory (RAM Pipeline)
  async executeInternalChunkLoop(task: TaskKey, totalItems: number, limit: number, inputData?: any): Promise<any> {
     const store = useTripStore.getState();
     const totalChunks = Math.ceil(totalItems / limit);
     const collectedResults: any[] = [];
     const modelId = resolveModelId(task);
     const schema = SCHEMA_MAP[task];

     console.log(`[Orchestrator] Starting SEQUENTIAL Loop for ${task}: ${totalChunks} chunks.`);

     for (let i = 1; i <= totalChunks; i++) {
         console.log(`[Orchestrator] Processing Chunk ${i}/${totalChunks}...`);
         store.setChunkingState({ isActive: true, currentChunk: i, totalChunks: totalChunks, results: collectedResults });

         // PASS inputData to PayloadBuilder (Important for Enricher receiving RAM data)
         const prompt = PayloadBuilder.buildPrompt(task, undefined, { 
             chunkIndex: i, 
             limit: limit, 
             totalChunks: totalChunks,
             candidates: inputData // <--- HERE IS THE RAM HANDOVER
         });

         const rawResult = await GeminiService.call(prompt, task, modelId);

         let validatedData = rawResult;
         if (schema) {
            const validation = schema.safeParse(rawResult);
            if (!validation.success) throw new Error(`KI-Antwort für Chunk ${i} ungültig.`);
            validatedData = validation.data;
         }

         console.log(`[Orchestrator] Incrementally saving chunk ${i}/${totalChunks}...`);
         ResultProcessor.process(task, validatedData);
         collectedResults.push(validatedData);

         if (i < totalChunks) await new Promise(resolve => setTimeout(resolve, 500));
     }

     store.resetChunking();
     return mergeResults(collectedResults, task);
 },

 async _executeSingleStep(task: TaskKey, feedback?: string, skipSave: boolean = false): Promise<any> {
     const store = useTripStore.getState();
     const prompt = PayloadBuilder.buildPrompt(task, feedback);
     const modelId = resolveModelId(task);
     
     if (store.aiSettings.debug) console.log(`[Orchestrator] Single Step: ${task} -> Model: ${modelId} ${skipSave ? '(NO SAVE)' : ''}`);

     const rawResult = await GeminiService.call(prompt, task, modelId);
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

     if (!skipSave) {
        ResultProcessor.process(task, validatedData);
     }
     return validatedData;
 },

 // FIX: Added 'inputData' to support RAM pipelines
 async executeTask(task: TaskKey, feedback?: string, inputData?: any): Promise<any> {
    const store = useTripStore.getState();
    const { project, chunkingState, setChunkingState, apiKey } = store;

    // --- A. SEQUENTIAL CHAINING: FOOD SCOUT + GEO + ENRICHER (ORCHESTRATED) ---
    if (task === 'foodScout' || task === 'food') {
        console.log(`[Orchestrator] Detected Food Task. Starting Pipeline: Scout (RAM) -> Geo (RAM) -> Enricher (Store)`);
        
        try {
            // 1. UI: Start
            store.setChunkingState({ isActive: true, currentChunk: 1, totalChunks: 3, results: [] });
            
            // 2. PHASE 1: SCANNER (AI) - NO SAVE
            console.log("[Orchestrator] Phase 1: Scanner (AI)");
            const scoutResult = await this._executeSingleStep('foodScout', feedback, true); // true = skipSave
            let candidates = scoutResult.candidates || [];
            
            // FIX: RAM-Pipeline ID Injection & Category Shield
            // We must ensure every candidate has a safe unique ID before passing to RAM-Filter/Enricher.
            // Otherwise PayloadBuilder drops them.
            const existingPlaces = project.data?.places || {};
            candidates = candidates.map((c: any) => {
                let safeId = c.id;
                // Collision Check: If ID exists but is a Sight -> Force new ID
                if (safeId && existingPlaces[safeId]) {
                    const existing = existingPlaces[safeId];
                    if (['Sight', 'Attraktion', 'Landmark', 'Sehenswürdigkeit'].includes(existing.category)) {
                        safeId = undefined;
                    }
                }
                if (!safeId) safeId = uuidv4();
                return { ...c, id: safeId };
            });
            
            // FIX: Persist the ID-injected candidates back to the result object
            scoutResult.candidates = candidates;

            console.log(`[Orchestrator] Scanner found ${candidates.length} candidates. Handing to Geo-Filter (In-Memory).`);

            // 3. UI: Update
            store.setChunkingState({ currentChunk: 2 });

            // 4. PHASE 2: GEO-FILTER (Code Logic) - NO SAVE
            console.log("[Orchestrator] Phase 2: Geo-Filter (Code Logic)");
            
            const isAdHoc = feedback?.toLowerCase().includes('adhoc') || false;
            let contextType: 'district' | 'region' | 'adhoc' = 'region'; 
            if (isAdHoc) contextType = 'adhoc';
            
            let centers: string[] = [];
            if (scoutResult.resolved_search_locations?.length > 0) centers = scoutResult.resolved_search_locations;
            else if (project.analysis?.geoAnalyst?.recommended_hubs?.length) {
                centers = project.analysis.geoAnalyst.recommended_hubs.map(h => h.hub_name);
                contextType = 'district';
            } else {
                 centers = [project.userInputs.logistics.stationary.destination || "Region"];
            }

            // PURE RAM FILTERING
            const filteredCandidates = await applyAdaptiveGeoFilter(candidates, centers, contextType);
            
            console.log(`[Orchestrator] Geo-Filter Result: ${filteredCandidates.length} items. Handing to Enricher (In-Memory).`);
            
            // NOTE: We REMOVED the intermediate save to store here!
            
            // 6. UI: Update
            store.setChunkingState({ currentChunk: 3 });

            // 7. PHASE 3: ENRICHER (AI) - FINAL SAVE
            // We pass the filtered list directly to the task executor
            console.log("[Orchestrator] Phase 3: Enricher (AI) -> FINAL SAVE");
            
            // FIX: Capture and return the ENRICHED result, not the raw scout result!
            const enricherResult = await this.executeTask('foodEnricher', undefined, filteredCandidates); 

            return enricherResult; 

        } catch (err) {
            console.error("[Orchestrator] Food Sequence Failed", err);
            throw err;
        } finally {
            store.resetChunking();
        }
    }

    // --- B. CHUNKING CHECK (Standard Logic) ---
    const chunkableTasks: TaskKey[] = [
        'anreicherer', 'chefredakteur', 'infoAutor', 'foodEnricher', 'chefPlaner',
        'dayplan', 'initialTagesplaner', 'infos', 'details', 'basis'
    ];
    
    if (chunkableTasks.includes(task)) {
        let totalItems = 0;
        const isManual = !apiKey;
        const limit = getTaskLimit(task, isManual);

        if (['anreicherer', 'chefredakteur', 'details'].includes(task)) {
            totalItems = Object.values(project.data.places || {}).flat().length;
        } 
        else if (task === 'foodEnricher') {
            // FIX: If inputData is provided (from Pipeline), use it! Otherwise fallback to store.
            const raw = inputData || (project.data.content as any)?.rawFoodCandidates || [];
            totalItems = raw.length; 
        }
        else if (task === 'chefPlaner') {
            totalItems = project.userInputs.dates.fixedEvents?.length || 0;
        }
        else if (['basis', 'sightCollector'].includes(task)) {
             totalItems = project.userInputs.selectedInterests.length;
        }
        else if (['dayplan', 'initialTagesplaner'].includes(task)) {
            totalItems = project.userInputs.dates.duration || 1;
        }
        else if (['infos', 'infoAutor'].includes(task)) {
            const appendixInterests = project.userInputs.selectedInterests.filter(id => APPENDIX_ONLY_INTERESTS.includes(id));
            totalItems = appendixInterests.length > 0 ? appendixInterests.length : 1;
        }

        if (totalItems > limit) {
             if (apiKey) {
                 // Pass inputData through to the loop
                 return this.executeInternalChunkLoop(task, totalItems, limit, inputData);
             } else {
                 if (!chunkingState.isActive || chunkingState.currentChunk === 0) {
                     const totalChunks = Math.ceil(totalItems / limit);
                     setChunkingState({ isActive: true, currentChunk: 1, totalChunks: totalChunks, results: [] });
                     await new Promise(r => setTimeout(r, 50));
                 }
             }
        } else {
            if (chunkingState.isActive && chunkingState.totalChunks <= 1) { 
                store.resetChunking(); 
            }
        }
    }

    // Fallback for non-chunked tasks, passing inputData if supported by PromptBuilder (usually mostly for context)
    return this._executeSingleStep(task, feedback);
  }
};
// --- END OF FILE 283 Zeilen ---