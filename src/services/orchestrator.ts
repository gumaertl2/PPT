// 18.01.2026 19:30 - FIX: Corrected CONFIG path references (CONFIG.models -> CONFIG.api.models) to resolve runtime crash.
// src/services/orchestrator.ts
// 17.01.2026 18:30 - FEAT: Initial creation. The "Brain" of the operation.
// 17.01.2026 19:20 - FEAT: Registered full suite of Zod Schemas (Zero Error Policy).
// 17.01.2026 23:55 - FIX: Removed unused 'validateJson' import (TS6133).
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
  chefPlanerSchema
} from './validation';
import type { TaskKey } from '../core/types';

/**
 * MAPPING: TaskKey -> Validation Schema
 * Hier wird definiert, wie die Antwort eines bestimmten Agents aussehen muss.
 */
const SCHEMA_MAP: Partial<Record<TaskKey, z.ZodType<any>>> = {
  // --- V40 AGENTS ---
  
  // 1. Tagesplanung
  dayplan: dayPlanSchema,
  initialTagesplaner: dayPlanSchema,
  
  // 2. Strategie & Geo
  geoAnalyst: geoAnalystSchema,
  chefPlaner: chefPlanerSchema,

  // 3. Spezialisten (Paket B)
  food: foodSchema,
  foodScout: foodSchema,
  foodEnricher: foodSchema, // Enricher liefert ähnliche Struktur
  
  accommodation: hotelSchema,
  hotelScout: hotelSchema
};

// HELPER: Ermittelt das Limit dynamisch aus den Settings (Matrix)
const getTaskLimit = (task: TaskKey, isManual: boolean): number => {
    const aiSettings = useTripStore.getState().aiSettings;
    const mode = isManual ? 'manual' : 'auto';
    
    // 1. Task Override (Matrix)
    const taskOverride = aiSettings.chunkOverrides?.[task]?.[mode];
    if (taskOverride) return taskOverride;
    
    // 2. Global Setting
    const globalLimit = aiSettings.chunkLimits?.[mode];
    if (globalLimit) return globalLimit;

    // 3. Static Default (Config)
    return CONFIG.taskRouting.chunkDefaults?.[task]?.[mode] || 10;
};

// HELPER: Ermittelt das KI-Modell basierend auf Settings & Strategie
const resolveModelId = (task: TaskKey): string => {
    const aiSettings = useTripStore.getState().aiSettings;
    
    // 1. Matrix Override (Höchste Prio)
    const taskOverride = aiSettings.modelOverrides?.[task];
    if (taskOverride === 'pro') return CONFIG.api.models.pro;
    if (taskOverride === 'flash') return CONFIG.api.models.flash;

    // 2. Globale Strategie (Mittlere Prio)
    if (aiSettings.strategy === 'pro') return CONFIG.api.models.pro; 
    if (aiSettings.strategy === 'fast') return CONFIG.api.models.flash; 

    // 3. Optimal (Default aus Config)
    const recommendedType = CONFIG.taskRouting.defaults[task] || 'flash';
    // FIX: Corrected path CONFIG.api.models (was CONFIG.models causing crash)
    return CONFIG.api.models[recommendedType as 'pro'|'flash'] || CONFIG.api.models.flash;
};

/**
 * ORCHESTRATOR
 * Kapselt die Komplexität von Prompt-Bau, API-Call und Validierung.
 */
export const TripOrchestrator = {
  
  /**
   * Führt einen einzelnen Task aus.
   */
  async executeTask(task: TaskKey, feedback?: string): Promise<any> {
    const store = useTripStore.getState();
    const { project, chunkingState, setChunkingState, apiKey } = store;

    // --- 1. CHUNKING INITIALISIERUNG ---
    // Wir prüfen VOR dem Prompt-Bau, ob wir eine Schleife brauchen.
    // Nur initialisieren, wenn wir NICHT schon mitten drin sind (currentChunk > 0)
    
    const listTasks: TaskKey[] = ['anreicherer', 'chefredakteur', 'infoAutor', 'foodEnricher', 'chefPlaner'];
    
    if (listTasks.includes(task) && (!chunkingState.isActive || chunkingState.currentChunk === 0)) {
        
        let totalItems = 0;
        const isManual = !apiKey;
        const limit = getTaskLimit(task, isManual);

        // A. Datenquelle je nach Task zählen
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
        // InfoAutor ist dynamisch, hier kein Auto-Count möglich, wir verlassen uns auf Defaults

        // B. State setzen
        if (totalItems > limit) {
            const totalChunks = Math.ceil(totalItems / limit);
            console.log(`[Orchestrator] Starting Chunk Loop for ${task}: ${totalItems} Items / Limit ${limit} = ${totalChunks} Chunks`);
            
            setChunkingState({
                isActive: true,
                currentChunk: 1, 
                totalChunks: totalChunks,
                results: [] 
            });
            
            // Kurzer Tick, damit Store update greift (Sicherheit)
            await new Promise(r => setTimeout(r, 20));
        } else {
            // Reset falls vorher noch was drin war (Clean State)
            if (chunkingState.isActive) {
                store.resetChunking();
            }
        }
    }

    // --- 2. PROMPT & MODEL ---

    // Prompt bauen (PayloadBuilder nutzt jetzt den neuen chunkingState)
    const prompt = PayloadBuilder.buildPrompt(task, feedback);

    // Modell auswählen (NEU)
    const modelId = resolveModelId(task);
    
    if (store.aiSettings.debug) {
        console.log(`[Orchestrator] Task: ${task} -> Model: ${modelId}`);
    }

    // --- 3. EXECUTION ---

    const schema = SCHEMA_MAP[task];

    // API Call (NEU: Wir übergeben die modelId)
    // Der Service kümmert sich um Retry, Rate-Limit und Error-Handling.
    const rawResult = await GeminiService.call(prompt, task, modelId);

    // --- 4. VALIDIERUNG ---
    if (schema) {
      const validation = schema.safeParse(rawResult);
      if (!validation.success) {
        console.error(`Orchestrator Validation Error for ${task}:`, validation.error);
        throw new Error(`Antwort entspricht nicht dem Schema für ${task}. Details im Log.`);
      }
      return validation.data;
    }

    return rawResult;
  }
};
// --- END OF FILE 137 Zeilen ---