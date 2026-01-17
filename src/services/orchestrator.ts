// src/services/orchestrator.ts
// 17.01.2026 18:30 - FEAT: Initial creation. The "Brain" of the operation.
// 17.01.2026 19:20 - FEAT: Registered full suite of Zod Schemas (Zero Error Policy).
// 17.01.2026 23:55 - FIX: Removed unused 'validateJson' import (TS6133).

import { z } from 'zod';
import { GeminiService } from './gemini';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
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

/**
 * ORCHESTRATOR
 * Kapselt die Komplexität von Prompt-Bau, API-Call und Validierung.
 */
export const TripOrchestrator = {
  
  /**
   * Führt einen einzelnen Task aus.
   */
  async executeTask(task: TaskKey, feedback?: string): Promise<any> {
    // 1. Prompt bauen
    // Der PayloadBuilder kümmert sich um den Inhalt (inkl. Chunking-State aus dem Store)
    const prompt = PayloadBuilder.buildPrompt(task, feedback);

    // 2. Schema wählen
    const schema = SCHEMA_MAP[task];

    // 3. API Call via GeminiService
    // Der Service kümmert sich um Retry, Rate-Limit und Error-Handling.
    // Wir übergeben KEIN Schema an GeminiService.call, da wir die Validierung hier kontrollieren wollen,
    // um spezifische Fehlermeldungen zu generieren oder Fallbacks zu ermöglichen.
    const rawResult = await GeminiService.call(prompt, task);

    // 4. Validierung (Post-Processing)
    if (schema) {
      // Wenn wir ein Zod-Schema haben, validieren wir strikt
      const validation = schema.safeParse(rawResult);
      
      if (!validation.success) {
        console.error(`Orchestrator Validation Error for ${task}:`, validation.error);
        // Im Fehlerfall: Wir werfen einen Fehler, der im Hook gefangen wird.
        // Der GeminiService hat bereits eine grundlegende JSON-Validierung gemacht,
        // aber hier prüfen wir die fachliche Struktur (Zod).
        throw new Error(`Antwort entspricht nicht dem Schema für ${task}. Details im Log.`);
      }
      return validation.data;
    }

    // Fallback: Wenn kein Schema definiert ist, geben wir das Ergebnis so zurück 
    // (es ist bereits valides JSON dank GeminiService).
    return rawResult;
  }
};
// --- END OF FILE 83 Zeilen ---