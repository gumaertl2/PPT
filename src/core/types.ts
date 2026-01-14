// src/core/types.ts
// 14.01.2026 17:00 - FIX: Added 'es'/'fr'/'it' to LanguageCode and 'prompt' to InterestCategory to fix TS build errors.

// FIX: Expanded LanguageCode to support languages used in PromptBuilder
export type LanguageCode = 'de' | 'en' | 'es' | 'fr' | 'it';

// FIX: Added missing shared types
export interface LocalizedContent {
  de: string;
  en: string;
}

export interface SelectOption {
  // FIX: Made value optional to prevent TS errors in strategies.ts/options.ts
  value?: string;
  label: string | LocalizedContent;
  icon?: any;
  // FIX: Added description to satisfy CatalogModal
  description?: string | LocalizedContent;
  // FIX: Extended properties to match data files (strategies, interests)
  id?: string;
  promptInstruction?: LocalizedContent;
  defaultUserPreference?: LocalizedContent;
  // Legacy support for older data structures
  anweisung?: string;
  praeferenz?: string;
}

export interface InterestCategory {
  id: string;
  label: LocalizedContent;
  isSystem?: boolean;
  defaultUserPreference?: LocalizedContent;
  aiInstruction?: LocalizedContent;
  // FIX: Added 'prompt' property referenced in PayloadBuilder.ts
  prompt?: string | LocalizedContent;
}

// --- WORKFLOW / MAGIC CHAIN ---
export type WorkflowStepId = 
  | 'basis'          // Sammler (Namen & Ideen)
  | 'anreicherer'    // Daten-Anreicherer (Fakten, Adressen, Öffnungszeiten)
  | 'dayplan'        // Routen-Architekt (Tagesplanung)
  | 'guide'          // Reiseführer (Texte & Struktur)
  | 'details'        // Detail-Inhalte (Deep Dive)
  | 'infos'          // A-Z Infos
  | 'food'           // Restaurants
  | 'accommodation'  // Hotels
  | 'sondertage'     // Wetter / Flex
  | 'transfers'      // Logistik
  | 'chefPlaner';    // Chef-Planer (Analysis)

export interface WorkflowStepDef {
  id: WorkflowStepId;
  isMandatory: boolean;       // Muss immer ausgeführt werden (bzw. ist Prämisse)
  requiresUserInteraction?: boolean; // Wenn true: UI stoppt kurz für User-Input (z.B. Prio/Tempo)
  requires?: WorkflowStepId[]; // Abhängigkeiten, z.B. Transfer braucht Dayplan
  label: {
    de: string;
    en: string;
  };
  description: {
    de: string;
    en: string;
  };
}

// --- FLUGSCHREIBER (DEBUG LOGS) ---
export type LogType = 'request' | 'response' | 'error' | 'info' | 'system';

export interface FlightRecorderEntry {
  id: string;
  timestamp: string;
  task: string;      // z.B. 'chefPlaner', 'workflow_manager'
  type: LogType;
  model?: string;    // z.B. 'gemini-pro'
  content: string;   // Der volle Prompt oder die JSON-Antwort
  meta?: any;        // Zusätzliche Infos (Token Count, Status Code, Selected Steps)
}

// --- FEHLER-HANDLING ---
export type AppErrorType = 
  | 'RATE_LIMIT'      
  | 'QUOTA_EXCEEDED'  
  | 'SERVER_OVERLOAD' 
  | 'AUTH_ERROR'      
  | 'VALIDATION'      
  | 'GENERAL';        

export interface AppError {
  type: AppErrorType;
  message: string;
  retryAfter?: number; // Millisekunden bis Retry erlaubt
  details?: string;
}

export interface RouteStop {
  id: string;
  location: string;
  duration: number; // Nächte
  hotel?: string;   // Optional für Rundreise
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  duration?: string; // z.B. "2h"
}

export interface DepartureDetails {
  time?: string;
  location?: string;
}

// --- USER INPUTS STRUKTUR ---
export interface TripUserProfile {
  travelers: {
    adults: number;
    children: number;
    ages?: string; 
    origin: string; 
    nationality: string;
    groupType: 'couple' | 'family' | 'friends' | 'solo' | 'other';
    pets: boolean;
  };
  dates: {
    start: string;
    end: string;
    duration: number; 
    flexible: boolean;
    fixedEvents: CalendarEvent[];
    fixedDates?: string; 
    // FIX: Added for SightsView Budget Logic
    dailyStartTime?: string; 
    dailyEndTime?: string;
    arrival: {
      type?: 'flight' | 'train' | 'car' | 'camper' | 'suggestion' | 'other';
      details?: string; 
      time?: string;
      description?: string; 
    };
    departure?: DepartureDetails;
  };
  logistics: {
    mode: 'stationaer' | 'mobil';
    accommodationStatus?: 'needs_suggestions' | 'booked'; 
    // FIX: Added roundtripOptions (sibling to roundtrip, used in ProfileStep)
    roundtripOptions?: {
        waypoints?: string;
        strictRoute?: boolean;
    };
    stationary: {
      region: string;
      destination: string;
      hotel?: string;
      constraints?: {
        maxDriveTimeDay?: number; 
      };
    };
    roundtrip: {
      region: string;
      startLocation: string;
      endLocation: string;
      tripMode: 'inspiration' | 'fix';
      stops: RouteStop[];
      constraints: {
        maxDriveTimeLeg?: number;
        maxDriveTimeTotal?: number;
        maxHotelChanges?: number;
      };
    };
  };
  
  searchSettings: {
    sightsCount: number;  
    minRating: number;    
    minDuration: number;  
  };

  pace: string; 
  budget: string;
  strategyId: string; 
  vibe: string;
  selectedInterests: string[]; 
  customPreferences: Record<string, string>; 
  notes: string; 
  
  aiOutputLanguage: string; 
}

// --- ANALYSIS RESULT ---
export interface ChefPlanerResult {
  metadata: {
    analyzedAt: string;
    model: string;
  };
  corrections: {
    destination?: string;
    dates?: string;
    hints: string[];
    // FIX: Added notes and corrected_destination to match UI usage
    notes?: string[];
    corrected_destination?: string;
  };
  assessment: {
    plausibility: string;
    missingInfo: string[];
    suggestions: string[];
  };
  strategy_summary: string;
  briefing_summary: string;
  smart_limit_recommendation?: {
    value: number;
    reasoning: string;
  };
  validated_appointments: Array<{
    original_input: string;
    official_name: string;
    address: string;
    estimated_duration_min: number;
  }>;
  validated_hotels?: Array<{
    station: string;
    official_name: string;
    address?: string;
  }>;
  strategic_briefing: {
    search_radius_instruction: string;
    sammler_briefing: string;
  };
  plausibility_check?: string;
}

// --- MAIN PROJECT STRUCTURE ---
export interface TripProject {
  meta: {
    id: string;
    version: string;
    created: string;
    updatedAt: string;
    name: string;
    language: LanguageCode;
  };
  userInputs: TripUserProfile;
  analysis: {
    chefPlaner: ChefPlanerResult | null;
  };
  data: {
    places: Record<string, any>;
    content: Record<string, any>; 
    routes: Record<string, any>;
  };
  itinerary: {
    days: any[];
  };
}
// --- END OF FILE 233 Zeilen ---