// 05.02.2026 17:30 - REFACTOR: DOMAIN MODELS.
// Project structure, User Inputs, Analysis Results.
// src/core/types/models.ts

import type { LanguageCode } from './shared';

// --- SUB-TYPES ---
export interface RouteStop {
  id: string;
  location: string;
  duration: number; 
  hotel?: string;   
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

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  
  // Geo
  address?: string;
  vicinity?: string;
  location?: { lat: number; lng: number };
  
  // Metadata
  userPriority?: number; 
  rating?: number;
  user_ratings_total?: number; 
  
  // Content
  shortDesc?: string;
  description?: string; 
  detailContent?: string; 
  openingHours?: string[] | string; 
  website?: string; 
  source_url?: string; 
  reasoning?: string; 
  logistics?: string; 
  priceLevel?: string; 
  duration?: number; 
  
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
  price_estimate?: string;
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
// --- END OF FILE 250 Zeilen ---