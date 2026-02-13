// 12.02.2026 18:40 - REFACTOR: Final Cleanup. Integrated ModelSelector, LimitManager, ResultMerger.
// 12.02.2026 18:05 - REFACTOR: Delegated Food Logic to FoodWorkflow. Cleanup.
// 12.02.2026 17:05 - FIX: Added 'thinking' support to resolveModelId.
// src/services/orchestrator.ts

import { z } from 'zod';
import { GeminiService } from './gemini';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { useTripStore } from '../store/useTripStore';
import { ResultProcessor } from './ResultProcessor'; 
import { CONFIG } from '../data/config'; 
import { APPENDIX_ONLY_INTERESTS } from '../data/constants'; 
import { FoodWorkflow } from '../core/Workflow/FoodWorkflow';
import { ModelSelector } from './ModelSelector';
import { ResultMerger } from '../core/utils/resultMerger';
import { LimitManager } from '../core/utils/LimitManager';
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

const safetyDelay = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanTownName = (name: string): string => {
    if (!name) return "";
    return name.split('(')[0].trim();
};

export const TripOrchestrator = {
  
 async executeInternalChunkLoop(task: TaskKey, totalItems: number, limit: number, inputData?: any): Promise<any> {
     const store = useTripStore.getState();
     const totalChunks = Math.ceil(totalItems / limit);
     const collectedResults: any[] = [];
     
     // REFACTOR: Use ModelSelector
     const modelId = ModelSelector.resolve(task);
     const schema = SCHEMA_MAP[task];

     console.log(`[Orchestrator] Starting SEQUENTIAL Loop for ${task}: ${totalChunks} chunks using ${modelId === CONFIG.api.models.pro ? 'PRO' : 'FLASH'}.`);

     for (let i = 1; i <= totalChunks; i++) {
         console.log(`[Orchestrator] Processing Chunk ${i}/${totalChunks}...`);
         store.setChunkingState({ isActive: true, currentChunk: i, totalChunks: totalChunks, results: collectedResults });

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
         
         await safetyDelay(500); 

         collectedResults.push(validatedData);
     }
     store.resetChunking();
     
     // REFACTOR: Use ResultMerger
     return ResultMerger.merge(collectedResults, task);
 },

 // UPDATED: Accepts additionalContext
 async _executeSingleStep(task: TaskKey, feedback?: string, skipSave: boolean = false, inputData?: any, enableSearch: boolean = false, additionalContext?: any): Promise<any> {
     const store = useTripStore.getState();
     let processedInput = inputData;
     if (task === 'foodScout' && Array.isArray(inputData)) {
         processedInput = inputData.map(item => typeof item === 'string' ? cleanTownName(item) : item);
     }

     // MERGE: additionalContext contains the RAW OBJECTS now
     const payloadOptions: any = { candidates: processedInput, ...additionalContext };
     
     if (task === 'geoExpander' && Array.isArray(processedInput) && processedInput.length > 0) {
         payloadOptions.location_name = processedInput[0];
     }

     const prompt = PayloadBuilder.buildPrompt(task, feedback, payloadOptions);
     
     // REFACTOR: Use ModelSelector
     const modelId = ModelSelector.resolve(task);
     
     if (store.aiSettings.debug) console.log(`[Orchestrator] Single Step: ${task} -> Model: ${modelId === CONFIG.api.models.pro ? 'PRO' : 'FLASH'} ${skipSave ? '(NO SAVE)' : ''}`);

     const rawResult = await GeminiService.call(prompt, task, modelId, undefined, undefined, enableSearch);
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

    if (options?.mode === 'smart' && task === 'chefredakteur') {
        const places = project.data.places || {};
        const missingItems = Object.values(places).filter((p: any) => 
            !p.detailContent || p.detailContent.length < 50
        );
        if (missingItems.length === 0) {
            return { skipped: true, message: "Nothing to do" };
        }
        inputData = missingItems; 
    }

    // --- REFACTOR: DELEGATED TO WORKFLOW ---
    if (task === 'foodScout' || task === 'food') {
        // We pass 'this._executeSingleStep' bound to 'this' so the workflow can call back into the orchestrator logic
        return FoodWorkflow.execute(feedback, this._executeSingleStep.bind(this));
    }

    const chunkableTasks: TaskKey[] = [
        'anreicherer', 'chefredakteur', 'infoAutor', 'foodEnricher', 'chefPlaner',
        'dayplan', 'initialTagesplaner', 'infos', 'details', 'basis', 'hotelScout', 'ideenScout'
    ];
    
    if (chunkableTasks.includes(task)) {
        let totalItems = 0;
        const isManual = !apiKey;
        
        // REFACTOR: Use LimitManager
        let limit = LimitManager.getTaskLimit(task, isManual);

        if (['anreicherer', 'chefredakteur', 'details'].includes(task)) {
            if (inputData && Array.isArray(inputData) && inputData.length > 0) totalItems = inputData.length;
            else {
                const places = project.data.places || {};
                totalItems = Object.keys(places).length;
            }
        }
        else if (task === 'foodEnricher') {
            const raw = inputData || (project.data.content as any)?.rawFoodCandidates || [];
            totalItems = raw.length; 
        }
        else if (task === 'chefPlaner') totalItems = project.userInputs.dates.fixedEvents?.length || 0;
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
    
    return this._executeSingleStep(task, feedback, false, inputData, false);
  }
};
// --- END OF FILE 365 Lines ---