// src/services/validation.ts
// 17.01.2026 17:30 - FEAT: Added Zod Schema support for Runtime Validation.
// 17.01.2026 17:35 - FEAT: Added standard Schemas for DayPlan & GeoAnalyst.
// 17.01.2026 19:15 - FEAT: Added comprehensive Schemas for Food, Hotel & ChefPlaner (Zero Error Policy).

import { z } from 'zod'; // Zod Import für Schema-Validierung

/**
 * VALIDIERUNG & SELBSTHEILUNG
 * Portierung von Papatours/validation.js nach TypeScript.
 * Enthält die robuste "Bracket-Counting" Logik zum Extrahieren von JSON aus KI-Antworten.
 */

export interface ValidationResult<T> {
  valid: boolean;
  error: string | null;
  warning?: string | null;
  data?: T;
}

// --- STANDARD SCHEMAS (V40) ---

/**
 * Schema für den Tagesplan (Output von initialTagesplaner)
 */
export const dayPlanSchema = z.object({
  tage: z.array(z.object({
    tag_nr: z.number(),
    datum: z.string().nullable().optional(),
    titel: z.string().optional(),
    ort: z.string().optional(),
    aktivitaeten: z.array(z.object({
      uhrzeit: z.string().optional(),
      titel: z.string(),
      beschreibung: z.string().optional(),
      dauer: z.string().optional(), // z.B. "2h"
      kosten: z.string().optional(),
      original_sight_id: z.string().nullable().optional(), // Wichtig für Mapping!
      art: z.enum(['sight', 'food', 'transfer', 'pause', 'other']).or(z.string()).optional()
    }))
  }))
});

/**
 * Schema für GeoAnalyst Result
 */
export const geoAnalystSchema = z.object({
  strategische_standorte: z.array(z.object({
    ort_name: z.string(),
    such_radius_km: z.number(),
    fokus: z.string(),
    begruendung: z.string().optional(),
    aufenthaltsdauer_empfehlung: z.string().optional()
  })),
  analyse_fazit: z.string().optional()
});

/**
 * Schema für FoodScout & FoodEnricher
 */
export const foodSchema = z.object({
  empfehlungen: z.array(z.object({
    name: z.string(),
    typ: z.string().optional(),
    beschreibung: z.string().optional(),
    adresse: z.string().optional(),
    koordinaten: z.object({ lat: z.number(), lng: z.number() }).optional(),
    rating: z.number().optional(),
    price_level: z.string().optional(),
    gruend: z.string().optional()
  })).optional().or(z.any()) // Fallback, falls Root-Array statt Objekt
});

/**
 * Schema für HotelScout (Accommodation)
 */
export const hotelSchema = z.object({
  unterkuenfte: z.array(z.object({
    name: z.string(),
    ort: z.string().optional(),
    beschreibung: z.string().optional(),
    preis_pro_nacht: z.string().optional(),
    sterne: z.number().optional(),
    lage_bewertung: z.string().optional(),
    buchungs_url: z.string().optional()
  }))
});

/**
 * Schema für ChefPlaner (Fundamentalanalyse)
 */
export const chefPlanerSchema = z.object({
  metadata: z.object({ analyzedAt: z.string().optional(), model: z.string().optional() }).optional(),
  assessment: z.object({
    plausibility: z.string(),
    missingInfo: z.array(z.string()),
    suggestions: z.array(z.string())
  }),
  strategy_summary: z.string(),
  briefing_summary: z.string(),
  // Diese Felder sind oft dynamisch/optional je nach Analyse-Tiefe
  validated_appointments: z.array(z.any()).optional(),
  strategic_briefing: z.object({
    search_radius_instruction: z.string().optional(),
    sammler_briefing: z.string().optional()
  }).optional()
});


// --- CORE LOGIC (Bracket Counting) ---

/**
 * Extrahiert den ersten vollständigen JSON-Block (Objekt oder Array) aus einem String,
 * indem die Klammer-Ebenen gezählt werden. Ignoriert Text vor und nach dem JSON.
 */
function extractJsonBlock(str: string): string {
  const firstBrace = str.indexOf('{');
  const firstBracket = str.indexOf('[');
  let startIndex: number;
  let startChar: string;
  let endChar: string;

  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error("Kein gültiges JSON-Objekt oder -Array gefunden.");
  }

  // Bestimme, ob es mit { oder [ beginnt
  if (firstBrace !== -1 && (firstBrace < firstBracket || firstBracket === -1)) {
    startIndex = firstBrace;
    startChar = '{';
    endChar = '}';
  } else {
    startIndex = firstBracket;
    startChar = '[';
    endChar = ']';
  }

  let balance = 0;
  let inString = false;
  let escape = false;
  let endIndex = -1;

  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
    }

    if (!inString) {
      if (char === startChar) {
        balance++;
      } else if (char === endChar) {
        balance--;
      }
    }

    if (balance === 0) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    throw new Error("Kein vollständiges JSON-Objekt oder -Array gefunden (Incomplete Block).");
  }

  return str.substring(startIndex, endIndex + 1);
}

function checkSyntax(jsonString: string): { valid: boolean; error: string | null } {
  try {
    JSON.parse(jsonString);
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: `Syntax-Fehler: ${(e as Error).message}` };
  }
}

// Legacy Check (einfache Feld-Prüfung)
function checkSchema(data: any, requiredFields: string[]): { valid: boolean; error: string | null } {
  for (const field of requiredFields) {
    const fieldParts = field.split('.');
    let current = data;
    let found = true;
    for (const part of fieldParts) {
      if (current === null || typeof current !== 'object' || current[part] === undefined) {
        found = false;
        break;
      }
      current = current[part];
    }
    if (!found) {
      return { valid: false, error: `Schema-Fehler: Pflichtfeld '${field}' fehlt.` };
    }
  }
  return { valid: true, error: null };
}

/**
 * Spezifische Plausibilitäts-Prüfung für Reisepläne (aus V30 übernommen).
 * Prüft auf unrealistische Dauern (> 12h).
 */
function checkPlausibility(data: any): { valid: boolean; warning: string | null } {
  // Check: Ist es überhaupt eine Struktur mit Tagen?
  if (data && data.tage && Array.isArray(data.tage)) {
    for (const tag of data.tage) {
      if (!tag || !tag.aktivitaeten) continue;
      for (const akt of tag.aktivitaeten || []) {
        // Hinweis: Neue Prompts liefern "dauer" als String ("2h"). 
        // Diese Prüfung greift nur, wenn "dauerMinuten" (Legacy/Number) existiert.
        if (akt && typeof akt.dauerMinuten === 'number' && (akt.dauerMinuten < 1 || akt.dauerMinuten > 720)) {
          return { 
            valid: true, 
            warning: `Plausibilitäts-Warnung: Dauer von ${akt.dauerMinuten}min für '${akt.titel}' ist unrealistisch.` 
          };
        }
      }
    }
  }
  return { valid: true, warning: null };
}

/**
 * Führt automatische Reparaturen durch (z.B. Objekt zu Array).
 */
function validateAndRepairData(data: any, onRepair?: (msg: string) => void): any {
  const repairs: string[] = [];

  // Reparatur 1: "tage" ist einzelnes Objekt statt Array
  if (data && data.tage && !Array.isArray(data.tage)) {
    data.tage = [data.tage];
    repairs.push("Tage-Struktur (Objekt zu Array)");
  }

  // Reparatur 2: Fehlendes Aktivitäten-Array
  if (data && data.tage && Array.isArray(data.tage)) {
    data.tage.forEach((tag: any, index: number) => {
      if (tag && !tag.aktivitaeten) {
        tag.aktivitaeten = [];
        repairs.push(`Fehlendes 'aktivitaeten'-Array für Tag ${index + 1}`);
      }
    });
  }
  
  if (repairs.length > 0 && onRepair) {
    onRepair(`JSON-Struktur automatisch repariert: ${repairs.join(', ')}`);
  }

  return data;
}

/**
 * Hauptfunktion zur Validierung.
 * * @param jsonString Der rohe String von der KI.
 * @param schemaOrFields Entweder eine Liste von Pflichtfeldern (Legacy Strings) ODER ein Zod Schema.
 * @param onRepair Optionaler Callback für Reparatur-Meldungen.
 */
export function validateJson<T = any>(
  jsonString: string, 
  schemaOrFields: string[] | z.ZodType<T> = [], 
  onRepair?: (msg: string) => void
): ValidationResult<T> {
  
  if (!jsonString || jsonString.trim() === '') {
    return { valid: false, error: "Eingabe ist leer." };
  }
  
  let processedString: string;

  try {
    // Schritt 1: Entferne Markdown Code-Blöcke
    let cleaned = jsonString.replace(/```json/g, '').replace(/```/g, '');
    
    // Schritt 2: Extrahiere den reinen JSON-Block (Robust)
    processedString = extractJsonBlock(cleaned);

  } catch(e) {
    return { valid: false, error: (e as Error).message };
  }

  // Syntax Check
  const syntaxResult = checkSyntax(processedString);
  if (!syntaxResult.valid) {
    return { valid: false, error: syntaxResult.error };
  }

  let data = JSON.parse(processedString);
  
  // Schritt 3: Auto-Repair
  data = validateAndRepairData(data, onRepair);

  // Schritt 4: Schema Check (Hybrid: Zod oder Legacy)
  if (Array.isArray(schemaOrFields)) {
      // Legacy Mode (String Arrays)
      const schemaResult = checkSchema(data, schemaOrFields);
      if (!schemaResult.valid) {
        return { valid: false, error: schemaResult.error };
      }
  } else {
      // Modern Mode (Zod)
      const zodResult = schemaOrFields.safeParse(data);
      if (!zodResult.success) {
          // Formatiere Zod Fehler lesbar
          const errorMsg = zodResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
          return { valid: false, error: `Validierungs-Fehler: ${errorMsg}` };
      }
      // Bei Zod übernehmen wir die geparsten/transformierten Daten
      data = zodResult.data;
  }
  
  // Plausibilität
  const plausibilityResult = checkPlausibility(data);
  
  return { 
    valid: true, 
    error: null, 
    warning: plausibilityResult.warning, 
    data: data as T 
  };
}
// --- END OF FILE 298 Zeilen ---