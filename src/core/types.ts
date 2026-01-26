// 27.01.2026 21:45 - FIX: Added 'phone', 'awards' and 'openingHoursHint' to Place interface for FoodEnricher V30 parity.
// 24.01.2026 13:00 - FEAT: Added 'detailContent' to Place interface (Separation of Concerns: Enricher vs Editor).
// 23.01.2026 14:20 - FIX: Added PrintConfig & DetailLevel to central types (SSOT).
// 23.01.2026 11:45 - FIX: Synchronized Place structure and Record type with real JSON data.
// src/core/types.ts
// 21.01.2026 11:55 - FIX: Full Restore of types.ts plus InfoAutor & CockpitViewMode (Zero-Build-Error).
// 21.01.2026 03:30 - FIX: Added missing Type Definitions for TourGuide & IdeenScout (Zero-Build-Error).

// --- GENERAL TYPES ---
export type LanguageCode = 'de' | 'en' | 'es' | 'fr' | 'it' | 'nl' | 'pl' | 'pt' | 'ru' | 'tr' | 'ja' | 'zh';

// NEW: Centralized ViewModes for Cockpit Navigation
export type CockpitViewMode = 'wizard' | 'analysis' | 'sights' | 'routeArchitect' | 'info';

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
  searchStrategy?: LocalizedContent;  
  writingGuideline?: LocalizedContent; 
  aiInstruction?: LocalizedContent;
  prompt?: string | LocalizedContent;
}

// --- WORKFLOW / MAGIC CHAIN ---
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
  | 'chefredakteur'        // Alias für Content Details
  | 'infoAutor'            // Infos Fakten
  | 'countryScout'         // Länderinfos
  | 'ideenScout'           // Extras
  
  // FIX: Added missing Task Keys for V40 Orchestration
  | 'tourGuide'            // Tourenplanung

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
  label: { de: string; en: string; };
  description: { de: string; en: string; };
}

// --- SYSTEM SETTINGS & CHUNKING (SSOT) ---

export type AiStrategy = 'optimal' | 'pro' | 'fast';

export type ModelType = 'pro' | 'flash' | string;

export interface ChunkLimits {
    auto: number;   // Für API-Modus
    manual: number; // Für Copy-Paste
}

export interface AiSettings {
  strategy: AiStrategy;
  debug: boolean;
  modelOverrides: Partial<Record<TaskKey, ModelType>>;
  chunkLimits: ChunkLimits;
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

// --- ANALYSIS RESULTS (STRICT V40 ENGLISH) ---

export interface InfoChapter {
  title: string;
  content?: string;
  text?: string; 
}

export interface InfoAutorResult {
  chapters: InfoChapter[];
}

export interface ChefPlanerResult {
  metadata: {
    analyzedAt: string;
    model: string;
  };
  
  // V40 English Keys
  _thought_process?: string[]; // former: gedankenschritte
  plausibility_check?: string | null;
  
  corrections: {
    destination_typo_found?: boolean;
    corrected_destination?: string | null;
    notes?: string[];
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
    itinerary_rules?: string;
  };

  smart_limit_recommendation?: {
    value: number;
    reasoning: string;
  };
}

export interface RouteProposal {
  id?: string;
  title: string;           // former: routenName
  description?: string;    // former: charakter
  
  // Computed values
  total_km?: number;       
  total_drive_time?: number; 
  
  stages?: Array<{          // former: uebernachtungsorte
      location_name: string;
      nights: number | string;
      reasoning?: string;
  }>;
  
  waypoints?: Array<{      // former: ankerpunkte
    location: string;
    address?: string;
  }>;
}

export interface RouteArchitectResult {
  routes: RouteProposal[]; // former: routenVorschlaege
}

export interface GeoAnalystResult {
  recommended_hubs: Array<{ // former: empfohlene_hubs
    hub_name: string;
    suitability_score: number;
    pros: string[];
    cons: string[];
    suitable_for: string;
  }>;
}

// FIX: New Interfaces for TourGuide & IdeenScout

export interface TourGuideResult {
    guide: {
        intro_text?: string;
        tours: Array<{
            tour_title: string;
            description: string;
            suggested_order_ids: string[];
        }>;
    };
}

export interface IdeenScoutResult {
    sunny_day_ideas: Array<{
        name: string;
        description: string;
        planning_note?: string;
     }>;
    rainy_day_ideas: Array<{
        name: string;
        description: string;
        planning_note?: string;
    }>;
}

export type FoodSearchMode = 'standard' | 'stars';

// --- DATA OBJECTS (PLACES & CONTENT) ---

export type PlaceCategory = 'sight' | 'food' | 'accommodation' | 'hidden-gem' | string;

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  
  // Geo & Location
  address?: string;
  vicinity?: string;
  location?: { lat: number; lng: number };
  
  // User Metadaten
  userPriority?: number; // -1, 0, 1, 2
  rating?: number;
  
  // Content (English V40)
  shortDesc?: string;
  description?: string; 
  detailContent?: string; // NEW: Editorial Content (Separated from Enricher)
  openingHours?: string[] | string; 
  website?: string; // FIX: Added missing field from JSON
  reasoning?: string; // FIX: Added reasoning
  logistics?: string; // FIX: Added logistics
  priceLevel?: string; // FIX: Added priceLevel

  // NEW: Fields for FoodEnricher V30 Parity (27.01.2026)
  phone?: string;
  awards?: string[];
  openingHoursHint?: string;
  cuisine?: string;
  vibe?: string[];
  
  // Status
  visited?: boolean;
  googlePlaceId?: string; // Legacy / Reference
}

export interface ChunkingContext {
  dayOffset: number;   
  days: number;         
  stations: string[];  
}

// NEW: Print & Report Types
export type DetailLevel = 'compact' | 'standard' | 'details';

export interface PrintConfig {
  detailLevel: DetailLevel;
  sections: {
    briefing: boolean;
    analysis: boolean;
    tours: boolean;
    categories: boolean;
    infos: boolean;
  };
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
    // FIX: Added new analysis results
    tourGuide?: TourGuideResult | null;
    ideenScout?: IdeenScoutResult | null;
    infoAutor?: InfoAutorResult | null; // NEW: Wired up InfoAutor
  };
  data: {
    places: Record<string, Place>; // FIX: Changed from Place[] to Record<string, Place> for SSOT compliance
    content: Record<string, any>; 
    routes: Record<string, any>;
  };
  itinerary: {
    days: any[];
  };
}
// --- END OF FILE 505 Zeilen ---