// 08.02.2026 21:30 - FIX: Slice inputData for chunks to prevent processing full list in every chunk.
// 08.02.2026 20:00 - FIX: Removed invalid APP_CONFIG usage. Restored standard CONFIG access.
// src/services/orchestrator.ts

import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { GeminiService } from './gemini';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { useTripStore } from '../store/useTripStore';
import { ResultProcessor } from './ResultProcessor'; 
import { CONFIG } from '../data/config'; 
import { APPENDIX_ONLY_INTERESTS } from '../data/constants'; 
import { getGuidesForCountry } from '../data/countries'; 
import { 
  dayPlanSchema, geoAnalystSchema, foodSchema, hotelSchema, chefPlanerSchema,
  routeArchitectSchema, ideenScoutSchema, chefredakteurSchema, infoAutorSchema,
  tourGuideSchema, transferPlannerSchema
} from './validation';
import type { TaskKey } from '../core/types';

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
    // FIX: FORCE PRO FOR BASIS (Stability)
    if (task === 'basis' || task === 'anreicherer') return CONFIG.api.models.pro;

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

// HELPER: Safety Delay to prevent Race Conditions
const safetyDelay = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const TripOrchestrator = {
  
 async executeInternalChunkLoop(task: TaskKey, totalItems: number, limit: number, inputData?: any): Promise<any> {
     const store = useTripStore.getState();
     const totalChunks = Math.ceil(totalItems / limit);
     const collectedResults: any[] = [];
     const modelId = resolveModelId(task);
     const schema = SCHEMA_MAP[task];

     console.log(`[Orchestrator] Starting SEQUENTIAL Loop for ${task}: ${totalChunks} chunks using ${modelId === CONFIG.api.models.pro ? 'PRO' : 'FLASH'}.`);

     for (let i = 1; i <= totalChunks; i++) {
         console.log(`[Orchestrator] Processing Chunk ${i}/${totalChunks}...`);
         store.setChunkingState({ isActive: true, currentChunk: i, totalChunks: totalChunks, results: collectedResults });

         // FIX: SLICE INPUT DATA FOR EXPLICIT CANDIDATES (Smart Mode)
         // If we don't slice, the PayloadBuilder receives the full list for every chunk.
         let chunkCandidates = inputData;
         if (Array.isArray(inputData) && ['chefredakteur', 'anreicherer', 'details'].includes(task)) {
             const start = (i - 1) * limit;
             const end = start + limit;
             chunkCandidates = inputData.slice(start, end);
             console.log(`[Orchestrator] Sliced ${task} input to ${chunkCandidates.length} items for chunk ${i}`);
         }

         const prompt = PayloadBuilder.buildPrompt(task, undefined, { 
             chunkIndex: i, limit: limit, totalChunks: totalChunks, candidates: chunkCandidates 
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
         
         // FIX: Wait for Store Update
         await safetyDelay(500); 

         collectedResults.push(validatedData);
     }
     store.resetChunking();
     return mergeResults(collectedResults, task);
 },

 async _executeSingleStep(task: TaskKey, feedback?: string, skipSave: boolean = false, inputData?: any): Promise<any> {
     const store = useTripStore.getState();
     const prompt = PayloadBuilder.buildPrompt(task, feedback, { candidates: inputData });
     const modelId = resolveModelId(task);
     
     if (store.aiSettings.debug) console.log(`[Orchestrator] Single Step: ${task} -> Model: ${modelId === CONFIG.api.models.pro ? 'PRO' : 'FLASH'} ${skipSave ? '(NO SAVE)' : ''}`);

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
         // FIX: Critical Wait after saving single step results (e.g. Basis)
         // FIX: Removed invalid 'sightCollector' check
         if (task === 'basis') {
             console.log("[Orchestrator] Waiting for store consistency after Basis...");
             await safetyDelay(2000);
         }
     }
     return validatedData;
 },

 async executeTask(task: TaskKey, feedback?: string, inputData?: any, options?: { mode: 'smart' | 'force' }): Promise<any> {
    const store = useTripStore.getState();
    const { project, chunkingState, setChunkingState, apiKey } = store;

    // --- SMART MODE PRE-PROCESSING ---
    if (options?.mode === 'smart' && task === 'chefredakteur') {
        const places = project.data.places || {};
        const missingItems = Object.values(places).filter((p: any) => 
            !p.detailContent || p.detailContent.length < 50
        );
        
        if (missingItems.length === 0) {
            console.log("[Orchestrator] Smart Mode: No items missing content. Skipping.");
            return { skipped: true, message: "Nothing to do" };
        }
        
        console.log(`[Orchestrator] Smart Mode: Filtered to ${missingItems.length} items (from ${Object.keys(places).length}).`);
        inputData = missingItems; // Override inputData with filtered list
    }

    // --- FOOD PIPELINE (V40.5) ---
    if (task === 'foodScout' || task === 'food') {
        console.log(`[Orchestrator] Detected Food Task. Starting INVERTED SEARCH PIPELINE V40.5`);
        try {
            // Setup Progress
            store.setChunkingState({ isActive: true, currentChunk: 0, totalChunks: 4, results: [] });
            
            const targetLoc = store.project.userInputs.logistics.target_countries?.[0] 
                              || store.project.userInputs.logistics.stationary?.destination 
                              || "Europe";
            
            // PHASE 0: GUIDES
            const existingGuides = getGuidesForCountry(targetLoc);
            let dynamicGuides = "";
            if (!existingGuides || existingGuides.length === 0) {
                 try {
                     const scoutResult = await this._executeSingleStep('countryScout', undefined, false, { country: targetLoc });
                     if (scoutResult && scoutResult.recommended_guides) {
                         dynamicGuides = scoutResult.recommended_guides.join(', ');
                     }
                 } catch (e) { console.warn("CountryScout failed", e); }
            }

            // PHASE 1: GEO
            let townList: string[] = [];
            const geoResult = await this._executeSingleStep('geoExpander', feedback, true);
            if (geoResult && Array.isArray(geoResult.candidates)) townList = geoResult.candidates;
            else if (Array.isArray(geoResult)) townList = geoResult;

            // FIX: SEQUENTIAL SCOUTING (PHASE 2)
            console.log(`[Orchestrator] Starting Sequential Food Scouting for ${townList.length} towns...`);
            let allScoutCandidates: any[] = [];
            
            const totalSteps = townList.length + 1;
            
            for (let i = 0; i < townList.length; i++) {
                const town = townList[i];
                store.setChunkingState({ isActive: true, currentChunk: i + 1, totalChunks: totalSteps });
                console.log(`[Orchestrator] FoodScout Scanning Town ${i+1}/${townList.length}: ${town}`);
                
                try {
                    // Call Scout for SINGLE town
                    const stepResult = await this._executeSingleStep('foodScout', feedback, true, [town]);
                    if (stepResult && Array.isArray(stepResult.candidates)) {
                        const tagged = stepResult.candidates.map((c: any) => ({
                            ...c,
                            city: town,
                            id: c.id || uuidv4()
                        }));
                        allScoutCandidates.push(...tagged);
                    }
                    await safetyDelay(500); 
                } catch (e) {
                    console.warn(`[Orchestrator] Failed to scout food for ${town}`, e);
                }
            }

            if (allScoutCandidates.length === 0) return;

            // PHASE 3: ENRICHER (Bulk/Chunked)
            store.setChunkingState({ isActive: true, currentChunk: totalSteps, totalChunks: totalSteps });
            console.log(`[Orchestrator] Sending ${allScoutCandidates.length} candidates to Auditor...`);

            let enricherFeedback = feedback || "";
            if (dynamicGuides) enricherFeedback = enricherFeedback ? `${enricherFeedback}|GUIDES:${dynamicGuides}` : `GUIDES:${dynamicGuides}`;

            const enricherResult = await this.executeTask('foodEnricher', enricherFeedback, allScoutCandidates); 
            
            let finalCandidates: any[] = [];
            if (enricherResult.enriched_candidates) finalCandidates = enricherResult.enriched_candidates;
            else if (enricherResult.candidates) finalCandidates = enricherResult.candidates;
            else if (enricherResult.places) finalCandidates = Object.values(enricherResult.places);
            else if (Array.isArray(enricherResult)) finalCandidates = enricherResult;

            let validCandidates = finalCandidates.filter((c: any) => c.verification_status !== 'rejected');
            validCandidates = validCandidates.map((c: any) => ({ ...c, id: c.id || uuidv4() }));
            return { candidates: validCandidates };

        } catch (err) {
            console.error("[Orchestrator] Food Sequence Failed", err);
            throw err;
        } finally {
            store.resetChunking();
        }
    }

    // --- STANDARD CHUNKING LOGIC ---
    const chunkableTasks: TaskKey[] = [
        'anreicherer', 'chefredakteur', 'infoAutor', 'foodEnricher', 'chefPlaner',
        'dayplan', 'initialTagesplaner', 'infos', 'details', 'basis', 'hotelScout', 'ideenScout'
    ];
    
    if (chunkableTasks.includes(task)) {
        let totalItems = 0;
        const isManual = !apiKey;
        let limit = getTaskLimit(task, isManual);

        if (['anreicherer', 'chefredakteur', 'details'].includes(task)) {
            if (inputData && Array.isArray(inputData) && inputData.length > 0) {
                totalItems = inputData.length;
            } else {
                const places = project.data.places || {};
                const keys = Object.keys(places);
                console.log(`[Orchestrator] ${task}: Found ${keys.length} places in store.`);
                totalItems = keys.length;
            }
        }
        else if (task === 'foodEnricher') {
            const raw = inputData || (project.data.content as any)?.rawFoodCandidates || [];
            totalItems = raw.length; 
        }
        else if (task === 'chefPlaner') totalItems = project.userInputs.dates.fixedEvents?.length || 0;
        // FIX: Removed invalid 'sightCollector' check
        else if (task === 'basis') totalItems = project.userInputs.selectedInterests.length;
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
// --- END OF FILE 534 Zeilen ---