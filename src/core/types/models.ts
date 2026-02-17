// 17.02.2026 16:15 - FEAT: Added Hard-Constraint fields (isFixed, fixedDate, fixedTime) to Place model.
// 09.02.2026 18:00 - FIX: Added 'LiveStatus' interface (with corrected status) to Place model.
// 09.02.2026 16:50 - FEAT: Added 'liveStatus' to Place model for Google Search Grounding results.
// 08.02.2026 11:15 - FEAT: Added 'coordinatesValidated' flag to Place interface.
// 06.02.2026 21:40 - FIX: Consolidate PrintConfig and ensure Route fields exist.
// src/core/types/models.ts

import type { LanguageCode } from './shared';

// --- SUB-TYPES ---
export interface RouteStop {
  id: string;
  location: string;
  duration: number; 
  hotel?: string;
  name?: string; 
}

export interface CalendarEvent {
  id: string;
  date: string; 
  title: string;
  name?: string;
  description?: string;
  duration?: string; 
}

export interface DepartureDetails {
  time?: string;
  location?: string;
}

// --- USER INPUTS ---
export interface TripUserProfile {
  travelers: {
    adults: number;
    children: number;
    ages?: string; 
    origin: string; 
    nationality: string;
    groupType: 'couple' | 'family' | 'friends' | 'solo' | 'other';
    pets: boolean;
    interests?: string[]; // Legacy compat
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
    target_countries?: string[];
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
  customSearchStrategies?: Record<string, string>;   
  customWritingGuidelines?: Record<string, string>;  
  notes: string; 
  
  aiOutputLanguage: string; 
}

// --- ANALYSIS RESULTS ---
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
  _thought_process?: string[]; 
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
  title: string;           
  description?: string;    
  total_km?: number;       
  total_drive_time?: number; 
  stages?: Array<{          
      location_name: string;
      nights: number | string;
      reasoning?: string;
  }>;
  waypoints?: Array<{      
    location: string;
    address?: string;
  }>;
}

export interface RouteArchitectResult {
  routes: RouteProposal[]; 
  googleMapsLink?: string; 
  route_reasoning?: string; 
}

export interface GeoAnalystResult {
  recommended_hubs: Array<{ 
    hub_name: string;
    suitability_score: number;
    pros: string[];
    cons: string[];
    suitable_for: string;
  }>;
}

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
    wildcard_ideas?: Array<{
        name: string;
        description: string;
        planning_note?: string;
    }>;
}

// --- PLACES & CONTENT ---
export type PlaceCategory = 'sight' | 'food' | 'accommodation' | 'hidden-gem' | string;

// NEW: Live Verification Status (Google Grounding)
export interface LiveStatus {
  lastChecked: string; // ISO timestamp
  status: 'open' | 'closed' | 'permanently_closed' | 'corrected' | 'unknown';
  operational: boolean; // true = open/active, false = permanently closed/non-existent
  nextOpen?: string; // e.g. "Morgen 09:00"
  openingHoursToday?: string; // e.g. "09:00 - 18:00"
  note?: string; // AI Summary e.g. "Wird dauerhaft als geschlossen gemeldet."
  rating?: number; // Latest Google Rating if found
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  
  // Geo
  address?: string;
  vicinity?: string;
  location?: { lat: number; lng: number };
  coordinatesValidated?: boolean; // Flag for Nominatim Validation
  
  // NEW: Live Check Data
  liveStatus?: LiveStatus;

  // Metadata
  userPriority?: number; 
  rating?: number;
  user_ratings_total?: number;
  userSelection?: any; // Keep legacy support
  
  // NEW: Hard Constraints (Fix-Termine)
  isFixed?: boolean;       // Wenn true -> Fester Termin
  fixedDate?: string;      // YYYY-MM-DD
  fixedTime?: string;      // HH:MM
  visitDuration?: number;  // Minuten (manuelle Angabe)
  
  // Content
  shortDesc?: string;
  description?: string; 
  summary?: string; 
  editorial_summary?: { overview?: string }; 
  detailContent?: string; 
  openingHours?: string[] | string; 
  website?: string; 
  source_url?: string; 
  reasoning?: string; 
  logistics?: string; 
  priceLevel?: string; 
  duration?: number; 
  price_estimate?: string; 
  
  // Special Fields
  waypoints?: Array<{ name: string; address: string; }>;
  phone?: string;
  awards?: string[];
  openingHoursHint?: string;
  cuisine?: string;
  vibe?: string[];
  signature_dish?: string;
  
  // Hotel Specifics
  location_match?: string;
  bookingUrl?: string;
  pros?: string[];

  // Ideas / Wildcards
  details?: {
    specialType?: 'sunny' | 'rainy' | 'wildcard' | string;
    duration?: number;
    note?: string;
    website?: string;
    source?: string;
  };

  visited?: boolean;
  googlePlaceId?: string; 
  
  // Enriched Links
  guide_link?: string;
}

export interface ChunkingContext {
  dayOffset: number;   
  days: number;         
  stations: string[];  
}

// Print Config
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
  layout: 'standard' | 'compact';
  showImages: boolean;
}

// --- ROOT PROJECT ---
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
    tourGuide?: TourGuideResult | null;
    ideenScout?: IdeenScoutResult | null;
    infoAutor?: InfoAutorResult | null; 
  };
  data: {
    places: Record<string, Place>; 
    content: Record<string, any>; 
    routes: Record<string, any>;
  };
  itinerary: {
    days: any[];
  };
}
// --- END OF FILE 307 Zeilen ---