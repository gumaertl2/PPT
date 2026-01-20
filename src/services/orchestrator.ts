// 20.01.2026 16:25 - FIX: Registered missing TourGuide & TransferPlanner Schemas in Orchestrator.
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
  // NEW IMPORTS:
  ideenScoutSchema,
  chefredakteurSchema,
  infoAutorSchema,
  // FIX: Added missing imports
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
  // NEW MAPPINGS:
  ideenScout: ideenScoutSchema, 
  chefredakteur: chefredakteurSchema, 
  infoAutor: infoAutorSchema, 
  infos: infoAutorSchema, 
  details: chefredakteurSchema,
  // FIX: Added missing mappings
  tourGuide: tourGuideSchema,
  transferPlanner: transferPlannerSchema
};

const getTaskLimit = (task: TaskKey, isManual: boolean): number => {
    const aiSettings = useTripStore.getState().aiSettings;
    const mode = isManual ? 'manual' : 'auto';
    const taskOverride = aiSettings.chunkOverrides?.[task]?.[mode];
    if (taskOverride) return taskOverride;
    const globalLimit = aiSettings.chunkLimits?.[mode];
    if (globalLimit) return globalLimit;
    return CONFIG.taskRouting.chunkDefaults?.[task]?.[mode] || 10;
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

    // --- 1. CHUNKING INITIALISIERUNG (FIXED) ---
    // Wir erweitern die Liste der chunk-fähigen Tasks
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
            // Mindestens 1 Chunk, falls keine Appendix-Interessen gewählt sind (für Basis-Infos)
            totalItems = appendixInterests.length > 0 ? appendixInterests.length : 1;
        }

        // INIT STATE
        if (totalItems > limit) {
            const totalChunks = Math.ceil(totalItems / limit);
            console.log(`[Orchestrator] Starting Chunk Loop for ${task}: ${totalItems} Items / Limit ${limit} = ${totalChunks} Chunks`);
            
            setChunkingState({
                isActive: true,
                currentChunk: 1, 
                totalChunks: totalChunks,
                results: [] 
            });
            await new Promise(r => setTimeout(r, 20));
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
// --- END OF FILE 160 Zeilen ---