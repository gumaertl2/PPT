// 20.01.2026 18:05 - REFACTOR: "Operation Clean Sweep" - Removed Legacy German Keys. Strict V40 Enforce.
// 19.01.2026 17:10 - FIX: Updated Schemas to explicitly validate German V30 Keys (Grand Unification).
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

// --- SCHEMAS (STRICT V40 ENGLISH ONLY) ---

// 1. CHEF PLANER
export const chefPlanerSchema = z.object({
    _thought_process: z.array(z.string()).optional(),
    plausibility_check: z.string().nullable().optional(),
    strategic_briefing: z.any().optional(),
    smart_limit_recommendation: z.any().optional(),
    corrections: z.any().optional(),
    validated_appointments: z.array(z.any()).optional(),
    validated_hotels: z.array(z.any()).optional()
}).passthrough();

// 2. ROUTE ARCHITECT
export const routeArchitectSchema = z.object({
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
}).passthrough();

// 3. FOOD SCOUT / ENRICHER
export const foodSchema = z.object({
    candidates: z.array(z.any()).optional()
}).passthrough();

// 4. HOTEL SCOUT
export const hotelSchema = z.object({
    candidates: z.array(z.any()).optional()
}).passthrough();

// 5. DAY PLAN (Tagesplaner)
export const dayPlanSchema = z.object({
    days: z.array(z.object({
      day: z.union([z.number(), z.string()]),
      activities: z.array(z.any()).optional()
    })).optional()
}).passthrough();

// 6. GEO ANALYST
export const geoAnalystSchema = z.object({
  strategy: z.string().optional(),
  recommended_hubs: z.array(z.any()).optional()
}).passthrough();
// --- END OF FILE 82 Zeilen ---