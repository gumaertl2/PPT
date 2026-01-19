// 20.01.2026 18:10 - REFACTOR: "Operation Clean Sweep" - Removed all Adapter Logic. Strict Pass-Through.
// src/services/orchestrator.ts
// 17.01.2026 18:30 - FEAT: Initial creation. The "Brain" of the operation.
// 17.01.2026 19:20 - FEAT: Registered full suite of Zod Schemas (Zero Error Policy).
// 18.01.2026 18:30 - FEAT: Implemented Chunking-Initialization and Model-Switching Logic.

import { z } from 'zod';
import { GeminiService } from './gemini';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { useTripStore } from '../store/useTripStore';
import { CONFIG } from '../data/config';
import { 
  dayPlanSchema, 
  geoAnalystSchema,
  foodSchema,
  hotelSchema,
  chefPlanerSchema,
  routeArchitectSchema
} from './validation';
import type { TaskKey } from '../core/types';

/**
 * MAPPING: TaskKey -> Validation Schema (Strict V40)
 */
const SCHEMA_MAP: Partial<Record<TaskKey, z.ZodType<any>>> = {
  // 1. Tagesplanung
  dayplan: dayPlanSchema,
  initialTagesplaner: dayPlanSchema,
  
  // 2. Strategie & Geo
  geoAnalyst: geoAnalystSchema,
  chefPlaner: chefPlanerSchema,
  routeArchitect: routeArchitectSchema,
  routenArchitekt: routeArchitectSchema,

  // 3. Spezialisten
  food: foodSchema,
  foodScout: foodSchema,
  foodEnricher: foodSchema,
  
  accommodation: hotelSchema,
  hotelScout: hotelSchema
};

// HELPER: Ermittelt das Limit dynamisch
const getTaskLimit = (task: TaskKey, isManual: boolean): number => {
    const aiSettings = useTripStore.getState().aiSettings;
    const mode = isManual ? 'manual' : 'auto';
    
    const taskOverride = aiSettings.chunkOverrides?.[task]?.[mode];
    if (taskOverride) return taskOverride;
    
    const globalLimit = aiSettings.chunkLimits?.[mode];
    if (globalLimit) return globalLimit;

    return CONFIG.taskRouting.chunkDefaults?.[task]?.[mode] || 10;
};

// HELPER: Ermittelt das KI-Modell
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

/**
 * ORCHESTRATOR
 * Kapselt die Komplexität von Prompt-Bau, API-Call und Validierung.
 * KEINE Daten-Manipulation mehr (Clean Sweep)!
 */
export const TripOrchestrator = {
  
  async executeTask(task: TaskKey, feedback?: string): Promise<any> {
    const store = useTripStore.getState();
    const { project, chunkingState, setChunkingState, apiKey } = store;

    // --- 1. CHUNKING INITIALISIERUNG ---
    const listTasks: TaskKey[] = ['anreicherer', 'chefredakteur', 'infoAutor', 'foodEnricher', 'chefPlaner'];
    
    if (listTasks.includes(task) && (!chunkingState.isActive || chunkingState.currentChunk === 0)) {
        let totalItems = 0;
        const isManual = !apiKey;
        const limit = getTaskLimit(task, isManual);

        if (task === 'anreicherer') {
            totalItems = Object.values(project.data.places || {}).flat().length;
        } 
        else if (task === 'foodEnricher') {
            const raw = (project.data.content as any)?.rawFoodCandidates || [];
            totalItems = raw.length; 
        }
        else if (task === 'chefPlaner') {
            totalItems = project.userInputs.dates.fixedEvents?.length || 0;
        }
        else if (task === 'chefredakteur') {
            totalItems = Object.values(project.data.places || {}).flat().length;
        }

        if (totalItems > limit) {
            const totalChunks = Math.ceil(totalItems / limit);
            console.log(`[Orchestrator] Starting Chunk Loop for ${task}: ${totalItems} Items / Limit ${limit} = ${totalChunks} Chunks`);
            
            setChunkingState({
                isActive: true,
                currentChunk: 1, 
                totalChunks: totalChunks,
                results: [] 
            });
            
            // Short delay to allow React state update
            await new Promise(r => setTimeout(r, 20));
        } else {
            if (chunkingState.isActive) {
                store.resetChunking();
            }
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

    // --- 4. VALIDIERUNG (Strict Schema Check) ---
    const schema = SCHEMA_MAP[task];
    let validatedData = rawResult;

    if (schema) {
      const validation = schema.safeParse(rawResult);
      if (!validation.success) {
        console.warn(`[Orchestrator] Validation Failed for ${task}. Model returned:`, JSON.stringify(rawResult, null, 2));
        console.error(`[Orchestrator] Schema Errors:`, validation.error);
        
        // "Zero Error Policy": Wir werfen den Fehler, damit er im UI ankommt
        throw new Error(`KI-Antwort entspricht nicht dem V40-Schema für ${task}. (Siehe Konsole)`);
      }
      validatedData = validation.data;
    }

    // --- 5. RESULT ---
    // Keine Normalisierung mehr nötig ("Clean Sweep" sei Dank!)
    return validatedData;
  }
};
// --- END OF FILE 140 Zeilen ---