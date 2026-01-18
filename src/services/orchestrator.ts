// 19.01.2026 18:30 - FIX: Added 'basis' Adapter to map 'kandidaten_liste' to 'candidates' (Grand Unification Phase 2).
// src/services/orchestrator.ts
// 17.01.2026 18:30 - FEAT: Initial creation. The "Brain" of the operation.
// 17.01.2026 19:20 - FEAT: Registered full suite of Zod Schemas (Zero Error Policy).
// 18.01.2026 18:30 - FEAT: Implemented Chunking-Initialization and Model-Switching Logic.
// 18.01.2026 19:30 - FIX: Corrected CONFIG path references.
// 18.01.2026 21:00 - FIX: Added detailed debug logging.
// 18.01.2026 22:30 - FEAT: Registered 'routeArchitectSchema'.
// 19.01.2026 00:30 - FEAT: Added 'normalizeResult' adapter to auto-convert English AI outputs (Gemini 2.5) to German Legacy formats (V30 UI).

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
 * MAPPING: TaskKey -> Validation Schema
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

  // 3. Spezialisten (Paket B)
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

// HELPER: ADAPTER (Englisch -> Deutsch Normalisierung)
// Wandelt moderne KI-Antworten in das Format um, das das V30-Frontend erwartet.
const normalizeResult = (task: TaskKey, data: any): any => {
    // A. Route Architect: "routes" (EN) -> "routenVorschlaege" (DE)
    if (task === 'routeArchitect' || task === 'routenArchitekt') {
        if (data.routes && Array.isArray(data.routes) && !data.routenVorschlaege) {
            console.log('[Orchestrator] ADAPTER: Converting RouteArchitect English -> German');
            return {
                routenVorschlaege: data.routes.map((r: any) => ({
                    routenName: r.title,
                    charakter: r.description || '',
                    // Mapping der Stages zu einfachen Listen für das Legacy UI
                    uebernachtungsorte: r.stages?.map((s: any) => s.location_name) || [],
                    ankerpunkte: r.stages?.map((s: any) => ({
                        standortFuerKarte: s.location_name,
                        adresse: '' // Fallback, da meist nicht im EN-Prompt
                    })) || [],
                    gesamtKilometer: 0, // Fallback
                    gesamtFahrzeitStunden: 0, // Fallback
                    anzahlHotelwechsel: Math.max(0, (r.stages?.length || 1) - 1)
                }))
            };
        }
    }
    
    // B. ChefPlaner: Keys normalisieren falls nötig
    if (task === 'chefPlaner') {
        // Hier könnte man 'plausibility_check' -> 'plausibilitaets_check' mappen
    }

    // C. Basis / Sammler: "kandidaten_liste" (DE) -> "candidates" (Intern/Store)
    if (task === 'basis' || task === 'sightCollector') {
        if (data.kandidaten_liste && Array.isArray(data.kandidaten_liste) && !data.candidates) {
             console.log('[Orchestrator] ADAPTER: Converting Basis German (kandidaten_liste) -> Internal (candidates)');
             return {
                 candidates: data.kandidaten_liste.map((name: string) => ({ name }))
             };
        }
    }

    return data;
};

/**
 * ORCHESTRATOR
 * Kapselt die Komplexität von Prompt-Bau, API-Call, Validierung UND Normalisierung.
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
    const schema = SCHEMA_MAP[task];
    const rawResult = await GeminiService.call(prompt, task, modelId);

    // --- 4. VALIDIERUNG ---
    let validatedData = rawResult;
    if (schema) {
      const validation = schema.safeParse(rawResult);
      if (!validation.success) {
        console.warn(`[Orchestrator] Validation Failed for ${task}. Model returned:`, JSON.stringify(rawResult, null, 2));
        console.error(`[Orchestrator] Schema Errors:`, validation.error);
        throw new Error(`Antwort entspricht nicht dem Schema für ${task}. (Siehe Konsole für Details)`);
      }
      validatedData = validation.data;
    }

    // --- 5. NORMALISIERUNG (NEU) ---
    // Wir wandeln Englische/Deutsche KI-Antworten in das Format um, das der Store erwartet
    const finalData = normalizeResult(task, validatedData);

    return finalData;
  }
};
// --- END OF FILE 200 Zeilen ---