// 30.01.2026 00:30 - FEAT: Orchestrator uses 'resolved_search_locations' from AI (FoodScout) to fix Geocoding errors.
// 29.01.2026 22:15 - FIX: Correct Radius Context Logic (District vs Region).
// src/services/orchestrator.ts

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
  
  async executeInternalChunkLoop(task: TaskKey, totalItems: number, limit: number): Promise<any> {
     const store = useTripStore.getState();
     const totalChunks = Math.ceil(totalItems / limit);
     const collectedResults: any[] = [];
     const modelId = resolveModelId(task);
     const schema = SCHEMA_MAP[task];

     console.log(`[Orchestrator] Starting SEQUENTIAL Loop for ${task}: ${totalChunks} chunks.`);

     for (let i = 1; i <= totalChunks; i++) {
         console.log(`[Orchestrator] Processing Chunk ${i}/${totalChunks}...`);
         store.setChunkingState({ isActive: true, currentChunk: i, totalChunks: totalChunks, results: collectedResults });

         const prompt = PayloadBuilder.buildPrompt(task, undefined, { chunkIndex: i, limit: limit, totalChunks: totalChunks });
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

 async _executeSingleStep(task: TaskKey, feedback?: string): Promise<any> {
     const store = useTripStore.getState();
     const prompt = PayloadBuilder.buildPrompt(task, feedback);
     const modelId = resolveModelId(task);
     
     if (store.aiSettings.debug) console.log(`[Orchestrator] Single Step: ${task} -> Model: ${modelId}`);

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

     ResultProcessor.process(task, validatedData);
     return validatedData;
 },

 async executeTask(task: TaskKey, feedback?: string): Promise<any> {
    const store = useTripStore.getState();
    const { project, chunkingState, setChunkingState, apiKey } = store;

    // --- A. SEQUENTIAL CHAINING: FOOD SCOUT + GEO + ENRICHER (ORCHESTRATED) ---
    if (task === 'foodScout' || task === 'food') {
        console.log(`[Orchestrator] Detected Food Task. Starting Sequence: Scout -> Geo-Logic -> Enricher`);
        
        try {
            // 1. UI: Start
            store.setChunkingState({ isActive: true, currentChunk: 1, totalChunks: 3, results: [] });
            
            // 2. PHASE 1: SCANNER (AI)
            console.log("[Orchestrator] Phase 1: Scanner (AI)");
            const scoutResult = await this._executeSingleStep('foodScout', feedback);
            const candidates = scoutResult.candidates || [];
            console.log(`[Orchestrator] Scanner found ${candidates.length} candidates.`);

            // 3. UI: Update
            store.setChunkingState({ currentChunk: 2 });

            // 4. PHASE 2: GEO-FILTER (Code Logic)
            console.log("[Orchestrator] Phase 2: Geo-Filter (Code Logic)");
            
            const isAdHoc = feedback?.toLowerCase().includes('adhoc') || false;
            let contextType: 'district' | 'region' | 'adhoc' = 'region'; // Default
            
            if (isAdHoc) contextType = 'adhoc';
            
            // --- FIX: DETERMINE CENTERS (Multi-Stop Support) ---
            let centers: string[] = [];
            
            // Strategy A: AI-Resolved Locations (NEW: The "Smart Dolmetscher")
            if (scoutResult.resolved_search_locations && Array.isArray(scoutResult.resolved_search_locations) && scoutResult.resolved_search_locations.length > 0) {
                centers = scoutResult.resolved_search_locations;
                console.log("[Orchestrator] Using AI-Resolved Search Locations for Geo-Filter:", centers);
                // Keep contextType = 'region' to allow sufficient radius (15km) for cities
            }
            // Strategy B: Calculated Roundtrip Stages (Fallback)
            else if (project.analysis?.routeArchitect?.routes?.[0]?.stages?.length) {
                const stages = project.analysis.routeArchitect.routes[0].stages;
                if (stages && Array.isArray(stages)) {
                    centers = stages.map(s => s.location_name);
                    console.log("[Orchestrator] Using Route Stages as Geo-Centers:", centers);
                }
            }
            // Strategy C: GeoAnalyst Hubs (District Level)
            else if (project.analysis?.geoAnalyst?.recommended_hubs?.length) {
                centers = project.analysis.geoAnalyst.recommended_hubs.map(h => h.hub_name);
                contextType = 'district'; 
                console.log("[Orchestrator] Using GeoAnalyst Hubs as Geo-Centers (District Radius):", centers);
            }
            // Strategy D: User Inputs
            else {
                if (project.userInputs.logistics.mode === 'roundtrip') {
                    centers = project.userInputs.logistics.roundtrip.stops.map(s => s.location).filter(Boolean);
                } else {
                    const dest = project.userInputs.logistics.stationary.destination;
                    if (dest) centers = [dest];
                }
            }
            
            // Fallback
            if (centers.length === 0) {
                centers = [project.userInputs.logistics.roundtrip.region || "Region"];
                console.warn("[Orchestrator] No specific centers found. Using Region fallback:", centers[0]);
            }

            // CALL GEO FILTER
            const filteredCandidates = await applyAdaptiveGeoFilter(candidates, centers, contextType);
            console.log(`[Orchestrator] Geo-Filter result: ${filteredCandidates.length} items (from ${candidates.length}).`);

            // 5. SAVE FILTERED LIST FOR ENRICHER
            const tempStoreData = { ...store.project.data.content, rawFoodCandidates: filteredCandidates };
            useTripStore.setState((state) => ({
                project: { ...state.project, data: { ...state.project.data, content: tempStoreData } }
            }));

            // 6. UI: Update
            store.setChunkingState({ currentChunk: 3 });

            // 7. PHASE 3: ENRICHER (AI)
            console.log("[Orchestrator] Phase 3: Enricher (AI)");
            await this.executeTask('foodEnricher'); 

            return scoutResult; 

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
            const raw = (project.data.content as any)?.rawFoodCandidates || [];
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
                 return this.executeInternalChunkLoop(task, totalItems, limit);
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

    return this._executeSingleStep(task, feedback);
  }
};
// --- END OF FILE 383 Zeilen ---