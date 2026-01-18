// 18.01.2026 16:15 - FIX: Resolved TS6133 by renaming unused parameter 'logWarning' to '_logWarning'.
// src/services/validation.ts

import { z } from 'zod';

// --- HELPER: JSON REPAIR & VALIDATION ---
export const validateJson = <T>(
  text: string, 
  schema?: z.ZodType<T> | any, 
  _logWarning?: (msg: string) => void
): { valid: boolean; data?: T; error?: string } => {
  try {
    let cleanText = text.trim();
    if (cleanText.includes('```')) {
      const match = cleanText.match(/```(?:json)?([\s\S]*?)```/);
      if (match && match[1]) cleanText = match[1].trim();
    }
    const parsed = JSON.parse(cleanText);

    if (schema && typeof schema.safeParse === 'function') {
      const validation = schema.safeParse(parsed);
      if (!validation.success) {
        return { valid: false, error: validation.error.toString() };
      }
      return { valid: true, data: validation.data };
    }
    return { valid: true, data: parsed };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
};

// --- SCHEMAS (DUAL MODE: LOGS & LEGACY) ---

// 1. CHEF PLANER
export const chefPlanerSchema = z.union([
  // Variante A: Englisch (aus Logs)
  z.object({
    _thought_process: z.array(z.string()).optional(),
    plausibility_check: z.string().nullable().optional(),
    strategic_briefing: z.any().optional(),
    smart_limit_recommendation: z.any().optional(),
    corrections: z.any().optional(),
    validated_appointments: z.array(z.any()).optional(),
    validated_hotels: z.array(z.any()).optional()
  }).passthrough(),
  
  // Variante B: Deutsch (Legacy Vermutung)
  z.object({
    gedankenschritte: z.array(z.string()).optional(),
    plausibilitaets_check: z.string().nullable().optional(),
    strategisches_briefing: z.any().optional()
  }).passthrough()
]);

// 2. ROUTE ARCHITECT
export const routeArchitectSchema = z.union([
  // Variante A: Englisch (aus Logs) - "routes"
  z.object({
    routes: z.array(z.object({
      id: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      stages: z.array(z.object({
        location_name: z.string(),
        nights: z.union([z.number(), z.string()]),
        reasoning: z.string().optional()
      })).optional()
    })).optional()
  }).passthrough(),

  // Variante B: Deutsch (Legacy File) - "routenVorschlaege"
  z.object({
    routenVorschlaege: z.array(z.object({
      routenName: z.string(),
      charakter: z.string().optional(),
      gesamtKilometer: z.any().optional(),
      uebernachtungsorte: z.array(z.string()).optional()
    })).optional()
  }).passthrough()
]);

// 3. FOOD SCOUT / ENRICHER
export const foodSchema = z.union([
  // Variante A: Array (Legacy V30 Style)
  z.array(z.object({
    id: z.string().optional(),
    vorschlaege: z.array(z.any()).optional()
  })),
  // Variante B: Objekt Wrapper (V40 Style)
  z.object({
    candidates: z.array(z.any()).optional()
  }).passthrough()
]);

// 4. HOTEL SCOUT
export const hotelSchema = z.object({
    // Akzeptiert beides optional
    ergebnisse: z.array(z.any()).optional(), // Rundreise
    hotel_vorschlaege: z.array(z.any()).optional(), // Stationär
    candidates: z.array(z.any()).optional() // Fallback Englisch
}).passthrough();

// 5. DAY PLAN (Tagesplaner)
export const dayPlanSchema = z.union([
  // Variante A: Deutsch (Legacy)
  z.object({
    tage: z.array(z.object({
      tagNummer: z.union([z.number(), z.string()]),
      aktivitaeten: z.array(z.any()).optional()
    })).optional()
  }).passthrough(),
  // Variante B: Englisch (Modern)
  z.object({
    days: z.array(z.object({
      day: z.union([z.number(), z.string()]),
      activities: z.array(z.any()).optional()
    })).optional()
  }).passthrough()
]);

// 6. GEO ANALYST
export const geoAnalystSchema = z.object({
  // Hier akzeptieren wir einfach jedes flache Objekt, da GeoAnalyst neu ist
  strategy: z.string().optional(),
  optimale_stadtviertel: z.array(z.any()).optional(),
  suggested_hubs: z.array(z.any()).optional()
}).passthrough();
// --- END OF FILE 137 Zeilen ---