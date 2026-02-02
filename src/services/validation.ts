// 02.02.2026 20:10 - FIX: RELAXED FOOD SCHEMA (Permissive Mode).
// - Changed 'awards', 'vibe', 'openingHours' to accept String OR Array.
// - This prevents Zod from dropping valid AI results due to minor format mismatches.
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
        // Log warning but don't crash flow? For now just return error.
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
      total_km: z.number().optional(),
      total_drive_time: z.number().optional(),
      hotel_changes: z.number().optional(),
      map_waypoints: z.array(z.string()).optional(),
      stages: z.array(z.object({
        location_name: z.string(),
        nights: z.union([z.number(), z.string()]),
        reasoning: z.string().optional()
      }).passthrough()).optional()
    }).passthrough()).optional()
}).passthrough();

// 3. FOOD SCOUT / ENRICHER (RELAXED V40.7)
export const foodSchema = z.object({
    _thought_process: z.string().optional(),
    candidates: z.array(z.object({
        // Core Identity
        name_official: z.string().optional(),
        city: z.string().optional(),
        
        // The New "Golden Fields" (Relaxed Types)
        // Allow String OR Array for list fields to prevent validation death
        phone: z.union([z.string(), z.number(), z.null()]).optional(),
        website: z.string().nullable().optional(),
        
        openingHours: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
        
        signature_dish: z.string().nullable().optional(),
        
        vibe: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
        
        awards: z.union([z.array(z.string()), z.string(), z.null()]).optional(),
        
        // Legacy / Standard
        location: z.object({ lat: z.number(), lng: z.number() }).optional(),
        source_url: z.string().optional(),
        verification_status: z.string().optional()
    }).passthrough()).optional()
}).passthrough();

// 4. HOTEL SCOUT
export const hotelSchema = z.object({
    candidates: z.array(z.any()).optional()
}).passthrough();

// 5. DAY PLAN
export const dayPlanSchema = z.object({
    days: z.array(z.object({
      day: z.union([z.number(), z.string()]),
      date: z.string().optional(),
      morning: z.array(z.any()).optional(),
      afternoon: z.array(z.any()).optional(),
      evening: z.array(z.any()).optional(),
      logistics_note: z.string().optional(),
      daily_summary: z.string().optional(),
      activities: z.array(z.any()).optional()
    }).passthrough()).optional()
}).passthrough();

// 6. GEO ANALYST
export const geoAnalystSchema = z.object({
  strategy: z.string().optional(),
  recommended_hubs: z.array(z.any()).optional()
}).passthrough();

// 7. IDEEN SCOUT
export const ideenScoutSchema = z.object({
    sunny_day_ideas: z.array(z.any()).optional(),
    rainy_day_ideas: z.array(z.any()).optional()
}).passthrough();

// 8. CHEFREDAKTEUR
export const chefredakteurSchema = z.union([
    z.array(z.any()),
    z.object({ sights: z.array(z.any()).optional() }).passthrough()
]);

// 9. INFO AUTOR
export const infoAutorSchema = z.union([
    z.array(z.any()),
    z.object({ chapters: z.array(z.any()).optional() }).passthrough()
]);

// 10. TOUR GUIDE
export const tourGuideSchema = z.object({
    guide: z.object({
        tours: z.array(z.any()).optional()
    }).passthrough().optional()
}).passthrough();

// 11. TRANSFER PLANNER
export const transferPlannerSchema = z.object({
    transfers: z.array(z.any()).optional()
}).passthrough();
// --- END OF FILE 156 Lines ---