// 23.02.2026 13:05 - MERGE: Combined UX Storytelling with Kill-Switch Protection.
// 23.02.2026 12:30 - FIX: Added Kill-Switch Check to Chunk-Loop to stop background tasks immediately on cancel.
// 23.02.2026 11:30 - UX/FEAT: Added Storytelling & Chunk-Feedback (`updateStory`) for live UI notifications.
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

const SCHEMA_MAP: Partial<Record<TaskKey, z.ZodType<any>>> = {
  dayplan: dayPlanSchema, initialTagesplaner: dayPlanSchema, geoAnalyst: geoAnalystSchema,
  chefPlaner: chefPlanerSchema, routeArchitect: routeArchitectSchema, routenArchitekt: routeArchitectSchema,
  food: foodSchema, foodScout: foodSchema, foodEnricher: foodSchema,
  accommodation: hotelSchema, hotelScout: hotelSchema, ideenScout: ideenScoutSchema, 
  chefredakteur: chefredakteurSchema, infoAutor: infoAutorSchema, infos: infoAutorSchema, 
  details: chefredakteurSchema, tourGuide: tourGuideSchema, transferPlanner: transferPlannerSchema
};

const safetyDelay = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanTownName = (name: string): string => {
    if (!name) return "";
    return name.split('(')[0].trim();
};

export const TripOrchestrator = {
  
  // UX STORYTELLING HELPER
  updateStory(task: string, current: number, total: number, customText?: string) {
      const state = useTripStore.getState();
      const loadingNotif = state.notifications.find((n: any) => n.type === 'loading');
      if (!loadingNotif) return;

      const lang = state.project.meta?.language || 'de';
      const isDe = lang === 'de';

      let baseText = customText;
      if (!baseText) {
          const TASK_MAP: Record<string, {de: string, en: string}> = {
            anreicherer: { de: "🔍 Recherchiere Details für Orte", en: "🔍 Researching place details" },
            chefredakteur: { de: "✍️ Schreibe Reiseführer-Artikel", en: "✍️ Writing guide articles" },
            details: { de: "✍️ Schreibe Reiseführer-Artikel", en: "✍️ Writing guide articles" },
            foodEnricher: { de: "👨‍🍳 Verifiziere Restaurant-Daten", en: "👨‍🍳 Verifying restaurant data" },
            foodScout: { de: "🍔 Suche kulinarische Highlights", en: "🍔 Scouting culinary highlights" },
            food: { de: "🍔 Suche kulinarische Highlights", en: "🍔 Scouting culinary highlights" },
            infos: { de: "ℹ️ Sammle praktische Reise-Infos", en: "ℹ️ Gathering practical infos" },
            infoAutor: { de: "ℹ️ Verfasse Reise-Informationen", en: "ℹ️ Writing travel information" },
            basis: { de: "🏗️ Erstelle Fundament", en: "🏗️ Building foundation" },
            hotelScout: { de: "🏨 Suche passende Unterkünfte", en: "🏨 Scouting accommodations" },
            accommodation: { de: "🏨 Suche passende Unterkünfte", en: "🏨 Scouting accommodations" },
            ideenScout: { de: "💡 Sammle Sondertage & Ideen", en: "💡 Gathering special days & ideas" },
            chefPlaner: { de: "🧠 Analysiere Logistik & Termine", en: "🧠 Analyzing logistics & dates" },
            routeArchitect: { de: "🗺️ Berechne optimale Routen", en: "🗺️ Calculating optimal routes" },
            routenArchitekt: { de: "🗺️ Berechne optimale Routen", en: "🗺️ Calculating optimal routes" },
            tourGuide: { de: "🚶‍♂️ Plane sinnvolle Touren", en: "🚶‍♂️ Planning logical tours" },
            dayplan: { de: "📅 Erstelle initialen Tagesplan", en: "📅 Creating initial day plan" },
            initialTagesplaner: { de: "📅 Erstelle initialen Tagesplan", en: "📅 Creating initial day plan" },
            geoAnalyst: { de: "📍 Analysiere geografische Lage", en: "📍 Analyzing geographic location" },
            transferPlanner: { de: "🚗 Plane Transfers & Fahrzeiten", en: "🚗 Planning transfers & drive times" }
          };
          const mapped = TASK_MAP[task];
          baseText = mapped ? (isDe ? mapped.de : mapped.en) : (isDe ? `Verarbeite ${task}` : `Processing ${task}`);
      }

      const msg = total > 1 ? `${baseText} (${current} ${isDe ? 'von' : 'of'} ${total})...` : `${baseText}...`;
      state.updateNotification(loadingNotif.id, { message: msg });
  },

 async executeInternalChunkLoop(task: TaskKey, totalItems: number, limit: number, inputData?: any): Promise<any> {
     const store = useTripStore.getState();
     const totalChunks = Math.ceil(totalItems / limit);
     const collectedResults: any[] = [];
     
     const modelId = ModelSelector.resolve(task);
     const schema = SCHEMA_MAP[task];

     console.log(`[Orchestrator] Starting SEQUENTIAL Loop for ${task}: ${totalChunks} chunks using ${modelId === CONFIG.api.models.pro ? 'PRO' : 'FLASH'}.`);

     try {
         for (let i = 1; i <= totalChunks; i++) {
             // --- KILL-SWITCH CHECK ---
             if (useTripStore.getState().workflow.status !== 'generating') {
                 console.log(`[Orchestrator] Loop for ${task} ABORTED by user.`);
                 return null; 
             }

             console.log(`[Orchestrator] Processing Chunk ${i}/${totalChunks}...`);
             store.setChunkingState({ isActive: true, currentChunk: i, totalChunks: totalChunks, results: collectedResults });
             
             // UX UPDATE: Push Visual Storytelling to UI
             this.updateStory(task, i, totalChunks);

             let chunkCandidates = inputData;
             if (Array.isArray(inputData) && inputData.length > 0 && ['chefredakteur', 'anreicherer', 'details'].includes(task)) {
                 const start = (i - 1) * limit;
                 const end = start + limit;
                 chunkCandidates = inputData.slice(start, end);
                 console.log(`[Orchestrator] Sliced ${task} input to ${chunkCandidates.length} items for chunk ${i}`);
             }

             const prompt = PayloadBuilder.buildPrompt(task, undefined, { 
                 chunkIndex: i, limit: limit, totalChunks: totalChunks, candidates: chunkCandidates 
             });

             const rawResult = await GeminiService.call(prompt, task, modelId);
             
             // Check again after long API call
             if (useTripStore.getState().workflow.status !== 'generating') return null;

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
         
         return ResultMerger.merge(collectedResults, task);

     } catch (error) {
         console.error(`[Orchestrator] Error in Chunk Loop for ${task}:`, error);
         throw error;
     } finally {
         console.log(`[Orchestrator] Finalizing Loop for ${task}. Resetting state.`);
         store.resetChunking();
     }
 },

 async _executeSingleStep(task: TaskKey, feedback?: string, skipSave: boolean = false, inputData?: any, enableSearch: boolean = false, additionalContext?: any): Promise<any> {
     const store = useTripStore.getState();
     console.log(`[FLIGHT RECORDER] _executeSingleStep START: ${task}`);
     
     // Set Loading State Manually if not chunking
     if (!store.chunkingState.isActive) {
         store.setChunkingState({ isActive: true, currentChunk: 1, totalChunks: 1, results: [] });
         // UX UPDATE: Push Icon to single tasks too
         this.updateStory(task, 1, 1);
     }

     try {
         // --- KILL-SWITCH CHECK ---
         if (useTripStore.getState().workflow.status !== 'generating') return null;

         let processedInput = inputData;
         if (task === 'foodScout' && Array.isArray(inputData)) {
             processedInput = inputData.map(item => typeof item === 'string' ? cleanTownName(item) : item);
         }

         const payloadOptions: any = { candidates: processedInput, ...additionalContext };

         const prompt = PayloadBuilder.buildPrompt(task, feedback, payloadOptions);
         const modelId = ModelSelector.resolve(task);
         
         if (store.aiSettings.debug) console.log(`[Orchestrator] Single Step: ${task} -> Model: ${modelId === CONFIG.api.models.pro ? 'PRO' : 'FLASH'} ${skipSave ? '(NO SAVE)' : ''}`);

         const rawResult = await GeminiService.call(prompt, task, modelId, undefined, undefined, enableSearch);
         
         // Check again after API call
         if (useTripStore.getState().workflow.status !== 'generating') return null;

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
         console.log(`[FLIGHT RECORDER] _executeSingleStep SUCCESS: ${task}`);
         return validatedData;

     } catch (error) {
         console.error(`[FLIGHT RECORDER] _executeSingleStep ERROR: ${task}`, error);
         throw error;
     } finally {
         store.resetChunking(); // Ensure loading stops
     }
 },

 async executeTask(task: TaskKey, feedback?: string, inputData?: any, options?: { mode: 'smart' | 'force' }): Promise<any> {
    const store = useTripStore.getState();
    const { project, chunkingState, setChunkingState, apiKey } = store;

    console.log(`[FLIGHT RECORDER] executeTask CALLED: ${task}`, options);

    // SMART MODE CHECKS
    if (options?.mode === 'smart' && task === 'chefredakteur') {
        const places = project.data.places || {};
        const missingItems = Object.values(places).filter((p: any) => 
            !p.detailContent || p.detailContent.length < 50
        );
        if (missingItems.length === 0) {
            console.log(`[FLIGHT RECORDER] Smart Mode: Nothing to do for ${task}`);
            return { skipped: true, message: "Nothing to do" };
        }
        inputData = missingItems; 
    }

    if (task === 'foodScout' || task === 'food') {
        return FoodWorkflow.execute(feedback, this._executeSingleStep.bind(this));
    }

    // LIST OF CHUNKABLE TASKS
    const chunkableTasks: TaskKey[] = [
        'anreicherer', 'chefredakteur', 'infoAutor', 'foodEnricher', 'chefPlaner',
        'infos', 'details', 'basis', 'hotelScout', 'ideenScout'
    ];
    
    if (chunkableTasks.includes(task)) {
        let totalItems = 0;
        const isManual = !apiKey;
        let limit = LimitManager.getTaskLimit(task, isManual);

        if (['anreicherer', 'chefredakteur', 'details'].includes(task)) {
            if (inputData && Array.isArray(inputData) && inputData.length > 0) {
                totalItems = inputData.length;
            } else {
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
    
    // Fallback for non-chunked tasks (like initialTagesplaner)
    console.log(`[FLIGHT RECORDER] Routing to Single Step: ${task}`);
    return this._executeSingleStep(task, feedback, false, inputData, false);
  }
};
// --- END OF FILE 412 Lines ---