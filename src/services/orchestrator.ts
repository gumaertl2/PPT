// 05.02.2026 19:00 - FIX: REMOVE REDUNDANT GEO-FILTER.
// - Implements "Inverted Search" logic fully: Trust the AI Auditor.
// - REMOVED Phase 3 (Code Geo-Filter) which was killing valid results.
// - Directly returns enriched candidates.
// src/services/orchestrator.ts

import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { GeminiService } from './gemini';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { useTripStore } from '../store/useTripStore';
import { ResultProcessor } from './ResultProcessor'; 
import { CONFIG } from '../data/config';
import { APPENDIX_ONLY_INTERESTS } from '../data/constants'; 
import { 
  dayPlanSchema, geoAnalystSchema, foodSchema, hotelSchema, chefPlanerSchema,
  routeArchitectSchema, ideenScoutSchema, chefredakteurSchema, infoAutorSchema,
  tourGuideSchema, transferPlannerSchema
} from './validation';
import type { TaskKey } from '../core/types';

// FIX: Standardize GeoExpander Schema
const geoExpanderSchema = z.object({
    _thought_process: z.string().optional(),
    candidates: z.array(z.string())
});

const SCHEMA_MAP: Partial<Record<TaskKey, z.ZodType<any>>> = {
  dayplan: dayPlanSchema, initialTagesplaner: dayPlanSchema, geoAnalyst: geoAnalystSchema,
  chefPlaner: chefPlanerSchema, routeArchitect: routeArchitectSchema, routenArchitekt: routeArchitectSchema,
  food: foodSchema, foodScout: foodSchema, foodEnricher: foodSchema,
  accommodation: hotelSchema, hotelScout: hotelSchema, ideenScout: ideenScoutSchema, 
  chefredakteur: chefredakteurSchema, infoAutor: infoAutorSchema, infos: infoAutorSchema, 
  details: chefredakteurSchema, tourGuide: tourGuideSchema, transferPlanner: transferPlannerSchema,
  geoExpander: geoExpanderSchema 
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

const mergeResults = (results: any[], task: TaskKey): any => {
    if (!results || results.length === 0) return null;
    if (results.length === 1) return results[0];
    console.log(`[Orchestrator] Merging ${results.length} chunks for ${task}...`);
    
    // Dayplan special merge logic
    if (['dayplan', 'initialTagesplaner'].includes(task)) {
        const merged = JSON.parse(JSON.stringify(results[0])); 
        for (let i = 1; i < results.length; i++) {
             const chunk = results[i];
             const newDays = chunk.days || chunk.itinerary?.days || [];
             if (Array.isArray(newDays)) {
                 if (merged.days && Array.isArray(merged.days)) merged.days.push(...newDays);
                 else if (merged.itinerary?.days && Array.isArray(merged.itinerary.days)) merged.itinerary.days.push(...newDays);
                 else { if (!merged.days) merged.days = []; merged.days.push(...newDays); }
             }
        }
        return merged;
    }

    // Standard Object/Array Merge
    let merged: any = {};
    if (Array.isArray(results[0])) return results.flat();
    
    results.forEach(chunk => {
        // Generic Merge for keys like places, content, etc.
        Object.keys(chunk).forEach(key => {
            const value = chunk[key];
            if (Array.isArray(value)) {
                merged[key] = [...(merged[key] || []), ...value];
            } else if (typeof value === 'object' && value !== null) {
                merged[key] = { ...(merged[key] || {}), ...value };
            } else {
                merged[key] = value;
            }
        });
    });
    return merged;
};

export const TripOrchestrator = {
  
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

         const prompt = PayloadBuilder.buildPrompt(task, undefined, { 
             chunkIndex: i, limit: limit, totalChunks: totalChunks, candidates: inputData 
         });

         // --- DATA LOSS INSPECTION (LOOP) ---
         if (task === 'foodEnricher' && i === 1) {
             try {
                 if (inputData && Array.isArray(inputData) && inputData.length > 0) {
                     const sample = inputData[0];
                     console.log(`[Orchestrator] 🔍 Inspection for foodEnricher Input (RAM Loop): Item '${sample.name}' has guides:`, sample.guides);
                 }
             } catch (e) { console.warn("Log inspection failed", e); }
         }

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

 async _executeSingleStep(task: TaskKey, feedback?: string, skipSave: boolean = false, inputData?: any): Promise<any> {
     const store = useTripStore.getState();
     // FIX: Pass inputData to PayloadBuilder options
     const prompt = PayloadBuilder.buildPrompt(task, feedback, { candidates: inputData });
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
     if (!skipSave) ResultProcessor.process(task, validatedData);
     return validatedData;
 },

 async executeTask(task: TaskKey, feedback?: string, inputData?: any): Promise<any> {
    const store = useTripStore.getState();
    const { project, chunkingState, setChunkingState, apiKey } = store;

    // --- FOOD PIPELINE (V40.5 "INVERTED SEARCH": Expander -> Scout -> Enricher (Auditor)) ---
    if (task === 'foodScout' || task === 'food') {
        console.log(`[Orchestrator] Detected Food Task. Starting INVERTED SEARCH PIPELINE V40.5`);
        try {
            store.setChunkingState({ isActive: true, currentChunk: 0, totalChunks: 3, results: [] });
            
            // --- PHASE 0: GEO EXPANSION (The "Surveyor") ---
            console.log("[Orchestrator] Phase 0: Geo Expansion (Resolving Towns)");
            let townList: string[] = [];
            
            const geoResult = await this._executeSingleStep('geoExpander', feedback, true);
            
            if (geoResult && Array.isArray(geoResult.candidates)) {
                townList = geoResult.candidates;
                console.log(`[Orchestrator] GeoExpander found ${townList.length} towns.`);
            } else if (Array.isArray(geoResult)) {
                 townList = geoResult;
            } else {
                console.warn("[Orchestrator] GeoExpander returned invalid data. Falling back.");
            }

            // --- PHASE 1: SCOUT (The "Collector") ---
            store.setChunkingState({ currentChunk: 1 });
            console.log("[Orchestrator] Phase 1: Scanner (AI) - With Explicit Town List");
            
            // Pass town list -> Scout returns RAW candidates (Broad Recall)
            const scoutResult = await this._executeSingleStep('foodScout', feedback, true, townList); 
            let candidates = scoutResult.candidates || [];
            
            // ID Injection (RAM)
            candidates = candidates.map((c: any) => ({ ...c, id: c.id || uuidv4() }));
            
            // Overwrite candidates in result for next step
            scoutResult.candidates = candidates;
            console.log(`[Orchestrator] Scanner found ${candidates.length} raw candidates. Sending to Auditor...`);

            if (candidates.length === 0) {
                 console.warn("[Orchestrator] Scout found 0 candidates. Aborting Pipeline.");
                 return;
            }

            // --- PHASE 2: ENRICHER (The "Auditor") ---
            store.setChunkingState({ currentChunk: 2 });
            console.log("[Orchestrator] Phase 2: Enricher (AI) - The Auditor");
            
            // Execute Enricher (Chunks handled internally)
            const enricherResult = await this.executeTask('foodEnricher', undefined, candidates); 
            
            // --- PHASE 3: RESULT EXTRACTION (NO GEO-FILTER) ---
            // We trust the Auditor. We just grab the result.
            console.log(`[Orchestrator] Pipeline Finished. Trusting Auditor Results.`);
            
            // Extract the list from the result object (could be 'candidates', 'places', or 'enriched_candidates')
            let finalCandidates: any[] = [];
            
            if (enricherResult.enriched_candidates) finalCandidates = enricherResult.enriched_candidates;
            else if (enricherResult.candidates) finalCandidates = enricherResult.candidates;
            else if (enricherResult.places) finalCandidates = Object.values(enricherResult.places);
            else if (Array.isArray(enricherResult)) finalCandidates = enricherResult;

            // Optional: Filter out items explicitly marked as 'rejected' by the Auditor
            const validCandidates = finalCandidates.filter((c: any) => c.verification_status !== 'rejected');

            console.log(`[Orchestrator] Final Result: ${validCandidates.length} validated places (from Auditor).`);
            
            return { candidates: validCandidates };

        } catch (err) {
            console.error("[Orchestrator] Food Sequence Failed", err);
            throw err;
        } finally {
            store.resetChunking();
        }
    }

    // --- STANDARD CHUNKING LOGIC (Unchanged) ---
    const chunkableTasks: TaskKey[] = [
        'anreicherer', 'chefredakteur', 'infoAutor', 'foodEnricher', 'chefPlaner',
        'dayplan', 'initialTagesplaner', 'infos', 'details', 'basis', 'hotelScout', 'ideenScout'
    ];
    
    if (chunkableTasks.includes(task)) {
        let totalItems = 0;
        const isManual = !apiKey;
        let limit = getTaskLimit(task, isManual);

        if (['anreicherer', 'chefredakteur', 'details'].includes(task)) totalItems = Object.values(project.data.places || {}).flat().length;
        else if (task === 'foodEnricher') {
            const raw = inputData || (project.data.content as any)?.rawFoodCandidates || [];
            totalItems = raw.length; 
        }
        else if (task === 'chefPlaner') totalItems = project.userInputs.dates.fixedEvents?.length || 0;
        else if (['basis', 'sightCollector'].includes(task)) totalItems = project.userInputs.selectedInterests.length;
        else if (['dayplan', 'initialTagesplaner'].includes(task)) totalItems = project.userInputs.dates.duration || 1;
        else if (['infos', 'infoAutor'].includes(task)) {
            const appendixInterests = project.userInputs.selectedInterests.filter(id => APPENDIX_ONLY_INTERESTS.includes(id));
            totalItems = appendixInterests.length > 0 ? appendixInterests.length : 1;
        }
        else if (['hotelScout', 'ideenScout'].includes(task)) {
            const logistics = project.userInputs.logistics;
            const isRoundtrip = logistics.mode === 'roundtrip' || logistics.mode === 'mobil';
            if (isRoundtrip) {
                const stops = logistics.roundtrip?.stops || [];
                totalItems = stops.length > 0 ? stops.length : 1;
                limit = 1; 
            } else {
                totalItems = 1;
            }
        }

        if (totalItems > limit) {
             if (apiKey) return this.executeInternalChunkLoop(task, totalItems, limit, inputData);
             else {
                 if (!chunkingState.isActive || chunkingState.currentChunk === 0) {
                     const totalChunks = Math.ceil(totalItems / limit);
                     setChunkingState({ isActive: true, currentChunk: 1, totalChunks: totalChunks, results: [] });
                     await new Promise(r => setTimeout(r, 50));
                 }
             }
        } else {
            if (chunkingState.isActive && chunkingState.totalChunks <= 1) store.resetChunking(); 
        }
    }
    
    return this._executeSingleStep(task, feedback, false, inputData);
  }
};
// --- END OF FILE 380 Zeilen ---