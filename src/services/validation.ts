// 20.01.2026 17:45 - FIX: Relaxed validation for 'chefredakteur' & 'infoAutor' to accept Arrays or Objects.
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

// 2. ROUTE ARCHITECT (Updated for Stats)
export const routeArchitectSchema = z.object({
    routes: z.array(z.object({
      id: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      total_km: z.number().optional(), // V40 Added
      total_drive_time: z.number().optional(), // V40 Added
      hotel_changes: z.number().optional(), // V40 Added
      map_waypoints: z.array(z.string()).optional(), // V40 Added
      stages: z.array(z.object({
        location_name: z.string(),
        nights: z.union([z.number(), z.string()]),
        reasoning: z.string().optional()
      }).passthrough()).optional()
    }).passthrough()).optional()
}).passthrough();

// 3. FOOD SCOUT / ENRICHER
export const foodSchema = z.object({
    candidates: z.array(z.any()).optional()
}).passthrough();

// 4. HOTEL SCOUT
export const hotelSchema = z.object({
    candidates: z.array(z.any()).optional()
}).passthrough();

// 5. DAY PLAN (Tagesplaner - V40 Structure)
export const dayPlanSchema = z.object({
    days: z.array(z.object({
      day: z.union([z.number(), z.string()]),
      date: z.string().optional(),
      morning: z.array(z.any()).optional(),   // V40 Time Slot
      afternoon: z.array(z.any()).optional(), // V40 Time Slot
      evening: z.array(z.any()).optional(),   // V40 Time Slot
      logistics_note: z.string().optional(),
      daily_summary: z.string().optional(),
      activities: z.array(z.any()).optional() // Legacy Fallback
    }).passthrough()).optional()
}).passthrough();

// 6. GEO ANALYST
export const geoAnalystSchema = z.object({
  strategy: z.string().optional(),
  recommended_hubs: z.array(z.any()).optional()
}).passthrough();

// --- NEW SCHEMAS (MISSING IN PREVIOUS VERSION) ---

// 7. IDEEN SCOUT (Sondertage)
export const ideenScoutSchema = z.object({
    sunny_day_ideas: z.array(z.any()).optional(),
    rainy_day_ideas: z.array(z.any()).optional()
}).passthrough();

// 8. CHEFREDAKTEUR (Details) - FIX: Allow Array OR Object
export const chefredakteurSchema = z.union([
    z.array(z.any()), // Direct Array form
    z.object({ sights: z.array(z.any()).optional() }).passthrough() // Object form
]);

// 9. INFO AUTOR (Reiseinfos) - FIX: Allow Array OR Object
export const infoAutorSchema = z.union([
    z.array(z.any()), // Direct Array form
    z.object({ chapters: z.array(z.any()).optional() }).passthrough() // Object form
]);

// 10. TOUR GUIDE (Touren) - NEW
export const tourGuideSchema = z.object({
    guide: z.object({
        tours: z.array(z.any()).optional()
    })
    // FIX: .passthrough() must come BEFORE .optional()
    .passthrough()
    .optional()
}).passthrough();

// 11. TRANSFER PLANNER (Logistik) - NEW
export const transferPlannerSchema = z.object({
    transfers: z.array(z.any()).optional()
}).passthrough();
// --- END OF FILE 136 Zeilen ---