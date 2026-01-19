// src/data/constants.ts
// 08.01.2026 14:52
/**
 * src/data/constants.ts
 * Enthält Icons, Sortier-Reihenfolgen und Mapping-Konstanten.
 * UPDATE: Logistik- und Such-Defaults hinzugefügt.
 * FIX: Migrated to English Keys (V40 Standard) to match INTEREST_DATA.
 */

// --- ICONS MAPPING ---
export const ICONS: Record<string, string> = {
  // System
  'trip_strategy': 'compass',
  'pace': 'gauge',
  'budget_level': 'wallet',
  'vibe': 'smile',
  'budget': 'calculator',
  'travel_info': 'book',
  'ignored_places': 'eye-off',
  'general': 'info',
  'buffer': 'hourglass',
  'arrival': 'plane',
  'hotel': 'bed',

  // Interests
  'restaurant': 'utensils',
  'nightlife': 'martini',
  'architecture': 'landmark', 
  'districts': 'map-pin',
  'museum': 'library', 
  'parks': 'trees',
  'nature': 'mountain',
  'beach': 'umbrella',
  'sports': 'activity',
  'family': 'baby', 
  'wellness': 'coffee', 
  'shopping': 'shopping-bag',
  'city_info': 'building'
};

export const INTEREST_DISPLAY_ORDER = [
  // 1. System
  'trip_strategy', 
  'budget_level', 
  'vibe', 
  
  // 2. Main Interests
  'restaurant', 
  'nightlife', 
  'architecture', 
  'districts', 
  'museum', 
  'parks', 
  'nature', 
  'beach', 
  'sports', 
  'family', 
  'wellness', 
  'shopping', 
  
  // 3. System Fillers
  'general', 
  'buffer', 
  
  // 4. Appendix
  'arrival', 
  'hotel', 
  'city_info', 
  'budget', 
  'travel_info', 
  'ignored_places'
];

export const APPENDIX_ONLY_INTERESTS = [
  'arrival', 
  'hotel', 
  'city_info', 
  'budget', 
  'travel_info', 
  'ignored_places'
];

// --- DEFAULTS & CONSTRAINTS (V40) ---

// 1. Mobile Reise (Rundreise)
export const DEFAULT_MOBILE_MAX_DRIVE_TIME_LEG = 6; // Stunden pro Etappe
export const DEFAULT_MOBILE_TOTAL_DRIVE_FACTOR = 3; // Stunden pro Tag (Faktor)
export const DEFAULT_MOBILE_TOTAL_DRIVE_OFFSET = 2; // Tage Abzug (Offset)
export const DEFAULT_MOBILE_HOTEL_CHANGE_DIVISOR = 4; // Teiler für Hotelwechsel

// 2. Stationäre Reise
export const DEFAULT_STATIONARY_MAX_DRIVE_TIME_DAY = 3; // Stunden (Hin & Zurück) für Ausflüge

// 3. Suche & Filter (Interessen / Sammler)
export const DEFAULT_SIGHTS_COUNT = 50; // Vorgabe Chefplaner
export const DEFAULT_MIN_RATING = 4.5; // Google Maps Ranking (0-5)
export const DEFAULT_MIN_DURATION = 60; // Minuten Verweildauer
// --- END OF FILE 70 Zeilen ---