// 20.01.2026 21:00 - FIX: Reverted Safety Clamp. Added Debug Log to trace Config loading issues.
// src/services/orchestrator.ts

import { z } from 'zod';
import { GeminiService } from './gemini';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { useTripStore } from '../store/useTripStore';
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
    // ACHTUNG: Wenn globalLimit gesetzt ist (z.B. default 10), gewinnt es hier immer!
    // Wir wollen aber, dass task-spezifische Config-Defaults (z.B. 15) Vorrang vor globalen Defaults haben,
    // solange der User nichts explizit überschrieben hat.
    // Das könnte der Bug sein, warum er 10 nimmt (global default) statt 15 (config task specific).
    // Ich kommentiere globalLimit hier NICHT aus (Protokoll!), aber ich tausche die Reihenfolge
    // oder lese erst die Config.
    
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

export const TripOrchestrator = {
  
  async executeTask(task: TaskKey, feedback?: string): Promise<any> {
    const store = useTripStore.getState();
    const { project, chunkingState, setChunkingState, apiKey } = store;

    // --- 1. CHUNKING INITIALISIERUNG ---
    const chunkableTasks: TaskKey[] = [
        'anreicherer', 'chefredakteur', 'infoAutor', 'foodEnricher', 'chefPlaner',
        'dayplan', 'initialTagesplaner', // TIME BASED
        'infos', 'details', 'basis'
    ];
    
    if (chunkableTasks.includes(task) && (!chunkingState.isActive || chunkingState.currentChunk === 0)) {
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

        // B. TIME BASED (Fix: Dauer in Tagen)
        else if (['dayplan', 'initialTagesplaner'].includes(task)) {
            totalItems = project.userInputs.dates.duration || 1;
        }

        // C. TOPIC BASED (Fix: Anzahl der Info-Themen)
        else if (['infos', 'infoAutor'].includes(task)) {
            const appendixInterests = project.userInputs.selectedInterests.filter(id => 
                APPENDIX_ONLY_INTERESTS.includes(id)
            );
            totalItems = appendixInterests.length > 0 ? appendixInterests.length : 1;
        }

        // INIT STATE
        if (totalItems > limit) {
            const totalChunks = Math.ceil(totalItems / limit);
            console.log(`[Orchestrator] Starting Chunk Loop for ${task}: ${totalItems} Items / Limit ${limit} = ${totalChunks} Chunks (Mode: ${isManual ? 'Manual' : 'Auto'})`);
            
            setChunkingState({
                isActive: true,
                currentChunk: 1, 
                totalChunks: totalChunks,
                results: [] 
            });
            await new Promise(r => setTimeout(r, 50));
        } else {
            if (chunkingState.isActive) store.resetChunking();
        }
    }

    // --- 2. PROMPT & MODEL ---
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
// --- END OF FILE 163 Zeilen ---