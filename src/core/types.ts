// src/core/types.ts
// 14.01.2026 18:00 - FIX: Expanded LocalizedContent to support all LanguageCodes.
// 15.01.2026 21:00 - FIX: Resolved Build Errors (TaskKey, Roundtrip Mode, CalendarEvent, MobileHome).
// 16.01.2026 03:00 - CONFIRM: Ensuring 'routeArchitect' is present in TaskKey.

export type LanguageCode = 'de' | 'en' | 'es' | 'fr' | 'it' | 'nl' | 'pl' | 'pt' | 'ru' | 'tr' | 'ja' | 'zh';

export interface LocalizedContent {
  de: string;
  en: string;
  es?: string;
  fr?: string;
  it?: string;
  nl?: string;
  pl?: string;
  pt?: string;
  ru?: string;
  tr?: string;
  ja?: string;
  zh?: string;
}

export interface SelectOption {
  value?: string;
  label: string | LocalizedContent;
  icon?: any;
  description?: string | LocalizedContent;
  id?: string;
  promptInstruction?: LocalizedContent;
  defaultUserPreference?: LocalizedContent;
  anweisung?: string;
  praeferenz?: string;
}

export interface InterestCategory {
  id: string;
  label: LocalizedContent;
  isSystem?: boolean;
  defaultUserPreference?: LocalizedContent;
  aiInstruction?: LocalizedContent;
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
  | 'chefPlaner'     // Chef-Planer (Analysis)
  | 'routeArchitect'; // NEU: Routen-Architekt

// FIX: Export TaskKey alias needed for CockpitWizard/UseTripGeneration
export type TaskKey = WorkflowStepId;

export interface WorkflowStepDef {
  id: WorkflowStepId;
  isMandatory: boolean;       
  requiresUserInteraction?: boolean; 
  requires?: WorkflowStepId[]; 
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
  task: string;      
  type: LogType;
  model?: string;    
  content: string;   
  meta?: any;        
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
  retryAfter?: number; 
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
  // FIX: Added 'name' optional property for legacy support
  name?: string;
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
    dailyStartTime?: string; 
    dailyEndTime?: string;
    arrival: {
      // FIX: Added 'mobile_home' for basis.ts compatibility
      type?: 'flight' | 'train' | 'car' | 'camper' | 'mobile_home' | 'suggestion' | 'other';
      details?: string; 
      time?: string;
      description?: string; 
    };
    departure?: DepartureDetails;
  };
  logistics: {
    // FIX: Added 'roundtrip' for Wizard logic
    mode: 'stationaer' | 'mobil' | 'roundtrip';
    accommodationStatus?: 'needs_suggestions' | 'booked'; 
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

export interface RouteProposal {
  routenName: string;
  charakter: string;
  gesamtKilometer: number;
  gesamtFahrzeitStunden: number;
  anzahlHotelwechsel: number | string;
  uebernachtungsorte: string[];
  ankerpunkte: Array<{
    standortFuerKarte: string;
    adresse: string;
  }>;
  begruendung: string;
}

export interface RouteArchitectResult {
  routenVorschlaege: RouteProposal[];
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
    routeArchitect?: RouteArchitectResult | null;
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
// --- END OF FILE 291 Zeilen ---