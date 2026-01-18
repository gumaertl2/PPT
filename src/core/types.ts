// 18.01.2026 13:05 - FIX: Expanded WorkflowStepDef description to include 'en' (Fixes TS2353/TS7053).
// src/core/types.ts
// 16.01.2026 17:00 - FEAT: Added all V30 Master Matrix Agent Keys to WorkflowStepId.
// 16.01.2026 20:00 - REFACTOR: Centralized ChunkingState and AiSettings for SSOT.
// 16.01.2026 23:30 - FEAT: Added GeoAnalystResult to support Accommodation Strategy (V30 Parity).
// 17.01.2026 16:55 - FIX: Added Strict Types for Place, PlaceCategory & ChunkingContext (Zero Error Policy).

// --- GENERAL TYPES ---
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
  searchStrategy?: LocalizedContent;  // NEU: Für den Sammler
  writingGuideline?: LocalizedContent; // NEU: Für den Redakteur
  aiInstruction?: LocalizedContent;
  prompt?: string | LocalizedContent;
}

// --- WORKFLOW / MAGIC CHAIN ---
// Unified Step IDs including internal Agent Keys
export type WorkflowStepId = 
  // --- V40 UI Keys (Short) ---
  | 'basis'          // Sammler (Namen & Ideen)
  | 'anreicherer'    // Daten-Anreicherer
  | 'dayplan'        // Routen-Architekt (Tagesplanung)
  | 'guide'          // Reiseführer (Texte & Struktur)
  | 'details'        // Detail-Inhalte
  | 'infos'          // A-Z Infos
  | 'food'           // Restaurants
  | 'accommodation'  // Hotels
  | 'sondertage'     // Wetter / Flex
  | 'transfers'      // Logistik

  // --- V30 Agent Keys (Master Matrix) ---
  | 'chefPlaner'           // Fundamentalanalyse
  | 'routeArchitect'       // Routenplaner (Mobil)
  | 'sightCollector'       // Basis-Sourcing
  | 'intelligentEnricher'  // Anreicherer
  | 'initialTagesplaner'   // Tagesplan
  | 'durationEstimator'    // Zeit-Stratege
  | 'transferPlanner'      // Logistik
  | 'timeOptimizer'        // Fallback
  | 'hotelScout'           // Unterkunft
  | 'geoAnalyst'           // Lage-Analyse
  | 'foodCollector'        // Kulinarik Sourcing
  | 'foodEnricher'         // Kulinarik Details
  | 'foodScout'            // Kulinarik Guide
  | 'reisefuehrer'         // Content Story
  | 'sightsChefredakteur'  // Content Details
  | 'chefredakteur'        // Alias für Content Details (FIX TS2678)
  | 'infoAutor'            // Infos Fakten
  | 'countryScout'         // Länderinfos
  | 'ideenScout'           // Extras

  // --- Compatibility / Legacy Keys ---
  | 'routenArchitekt'         // Alias
  | 'modificationTagesplaner' // Modifikation
  | 'transferUpdater';        // Legacy

// Export TaskKey as alias for WorkflowStepId
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
    en: string; // FIX: Added 'en' to match data in steps.ts
  };
}

// --- SYSTEM SETTINGS & CHUNKING (SSOT) ---

export type AiStrategy = 'optimal' | 'pro' | 'fast';

// Definition für Model-Types (um Zirkelbezüge zu vermeiden, definieren wir es hier oder importieren es)
// Wir nutzen hier string literals für lose Kopplung, oder importieren aus config wenn nötig.
// Für types.ts ist string | 'pro' | 'flash' sicher.
export type ModelType = 'pro' | 'flash' | string;

export interface ChunkLimits {
    auto: number;   // Für API-Modus
    manual: number; // Für Copy-Paste
}

export interface AiSettings {
  strategy: AiStrategy;
  debug: boolean;
  // Granulare Kontrolle pro Task
  modelOverrides: Partial<Record<TaskKey, ModelType>>;
  // Globale Chunk-Größen (Fallback)
  chunkLimits: ChunkLimits;
  // Granulare Chunk-Größen pro Task (Overrides)
  chunkOverrides: Partial<Record<TaskKey, Partial<ChunkLimits>>>;
}

export interface ChunkingState {
    isActive: boolean;
    currentChunk: number;
    totalChunks: number;
    dataChunks: any[]; // Die geschnittenen Häppchen
    results: any[];    // Die gesammelten Ergebnisse
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
      type?: 'flight' | 'train' | 'car' | 'camper' | 'mobile_home' | 'suggestion' | 'other';
      details?: string; 
      time?: string;
      description?: string; 
    };
    departure?: DepartureDetails;
  };
  logistics: {
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
  customSearchStrategies?: Record<string, string>;   // NEU
  customWritingGuidelines?: Record<string, string>;  // NEU
  notes: string; 
  
  aiOutputLanguage: string; 
}

// --- ANALYSIS RESULTS ---

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

// NEU: Ergebnis des GeoAnalysten (Lage-Stratege)
export interface GeoAnalystResult {
  strategische_standorte: Array<{
    ort_name: string;
    such_radius_km: number;
    fokus: string;
    begruendung: string;
    aufenthaltsdauer_empfehlung: string;
  }>;
  analyse_fazit: string;
}
export type FoodSearchMode = 'standard' | 'stars';

// --- DATA OBJECTS (PLACES & CONTENT) ---

export type PlaceCategory = 'sight' | 'food' | 'accommodation' | 'hidden-gem' | string;

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  
  // Geo & Location (V30 Requirements)
  address?: string;
  vicinity?: string;
  location?: { lat: number; lng: number };
  
  // User Metadaten
  userPriority?: number; // -1, 0, 1, 2
  rating?: number;
  
  // Content
  shortDesc?: string;
  description?: string;
  openingHours?: string[] | string;
  
  // Status
  visited?: boolean;
  googlePlaceId?: string; // Legacy / Reference
}

export interface ChunkingContext {
  dayOffset: number;   
  days: number;        
  stations: string[];  
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
    geoAnalyst?: GeoAnalystResult | null; 
  };
  data: {
    places: Record<string, Place[]>; // Strict Type: Categories (e.g. 'sights') contain Arrays of Places
    content: Record<string, any>; 
    routes: Record<string, any>;
  };
  itinerary: {
    days: any[];
  };
}
// --- END OF FILE 454 Zeilen ---