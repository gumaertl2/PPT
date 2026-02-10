// 10.02.2026 22:15 - FIX: Simplified Validation to prevent Zod Crash. Used z.any() for risky fields.
// 06.02.2026 13:40 - FIX: CLEAN SCHEMA.
// src/services/validation.ts

import { z } from 'zod';

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

// --- SCHEMAS ---

export const chefPlanerSchema = z.object({
    _thought_process: z.any().optional(), // FIX: any()
    plausibility_check: z.string().nullable().optional(),
    strategic_briefing: z.any().optional(),
    smart_limit_recommendation: z.any().optional(),
    corrections: z.any().optional(),
    validated_appointments: z.array(z.any()).optional(),
    validated_hotels: z.array(z.any()).optional()
}).passthrough();

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

export const foodSchema = z.object({
    _thought_process: z.any().optional(), // FIX: Allow object/string/array (Anti-Crash)
    candidates: z.array(z.object({
        name_official: z.string().nullable().optional(),
        name: z.string().optional(), // Alias
        city: z.string().nullable().optional(),
        
        phone: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        openingHours: z.union([z.array(z.string()), z.string()]).nullable().optional(),
        signature_dish: z.string().nullable().optional(),
        vibe: z.array(z.string()).nullable().optional(),
        
        // FIX: Allow any type of awards list (string vs array) to prevent crash
        awards: z.any().nullable().optional(),

        rating: z.number().nullable().optional(),
        user_ratings_total: z.number().nullable().optional(),
        
        guide_link: z.string().nullable().optional(),

        location: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
        source_url: z.string().nullable().optional(),
        verification_status: z.string().nullable().optional(),
        liveStatus: z.any().optional() // Allow object
    }).passthrough()).optional()
}).passthrough();

export const hotelSchema = z.object({ candidates: z.array(z.any()).optional() }).passthrough();
export const dayPlanSchema = z.object({ days: z.array(z.object({ day: z.union([z.number(), z.string()]), date: z.string().optional(), morning: z.array(z.any()).optional(), afternoon: z.array(z.any()).optional(), evening: z.array(z.any()).optional(), logistics_note: z.string().optional(), daily_summary: z.string().optional(), activities: z.array(z.any()).optional() }).passthrough()).optional() }).passthrough();
export const geoAnalystSchema = z.object({ strategy: z.string().optional(), recommended_hubs: z.array(z.any()).optional() }).passthrough();
export const ideenScoutSchema = z.object({ sunny_day_ideas: z.array(z.any()).optional(), rainy_day_ideas: z.array(z.any()).optional() }).passthrough();
export const chefredakteurSchema = z.union([z.array(z.any()), z.object({ sights: z.array(z.any()).optional() }).passthrough()]);
export const infoAutorSchema = z.union([z.array(z.any()), z.object({ chapters: z.array(z.any()).optional() }).passthrough()]);
export const tourGuideSchema = z.object({ guide: z.object({ tours: z.array(z.any()).optional() }).passthrough().optional() }).passthrough();
export const transferPlannerSchema = z.object({ transfers: z.array(z.any()).optional() }).passthrough();
// --- END OF FILE 168 Zeilen ---