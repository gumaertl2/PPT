// src/core/types.ts
// 14.01.2026 18:00 - FIX: Complete Type Definitions. Synced LanguageCode with LocalizedContent.

// FIX: Full list of supported languages (matches chefPlaner.ts)
export type LanguageCode = 
  | 'de' | 'en' | 'es' | 'fr' | 'it' 
  | 'nl' | 'pl' | 'pt' | 'ru' | 'tr' 
  | 'ja' | 'zh';

// FIX: LocalizedContent now supports all languages optionally
// This fixes "Property 'es' does not exist on type LocalizedContent"
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
  // FIX: Made value optional (legacy support)
  value?: string;
  label: string | LocalizedContent;
  icon?: any;
  // FIX: Added description for CatalogModal
  description?: string | LocalizedContent;
  id?: string;
  promptInstruction?: LocalizedContent;
  defaultUserPreference?: LocalizedContent;
  // Legacy support
  anweisung?: string;
  praeferenz?: string;
}

export interface InterestCategory {
  id: string;
  label: LocalizedContent;
  isSystem?: boolean;
  defaultUserPreference?: LocalizedContent;
  aiInstruction?: LocalizedContent;
  // FIX: Added 'prompt' for PayloadBuilder
  prompt?: string | LocalizedContent;
}

// --- WORKFLOW / MAGIC CHAIN ---
export type WorkflowStepId = 
  | 'basis'          // Sammler
  | 'anreicherer'    // Daten-Anreicherer
  | 'dayplan'        // Routen-Architekt
  | 'guide'          // Reiseführer
  | 'details'        // Detail-Inhalte
  | 'infos'          // A-Z Infos
  | 'food'           // Restaurants
  | 'accommodation'  // Hotels
  | 'sondertage'     // Wetter / Flex
  | 'transfers'      // Logistik
  | 'chefPlaner';    // Chef-Planer

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
  hotel?: string;   
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  duration?: string;
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
    // FIX: SightsView Budget Logic
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
    // FIX: Added roundtripOptions
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
// --- END OF FILE 244 Zeilen ---