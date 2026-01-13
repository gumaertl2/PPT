// src/data/constants.ts
// 08.01.2026 14:52
/**
 * src/data/constants.ts
 * Enthält Icons, Sortier-Reihenfolgen und Mapping-Konstanten.
 * UPDATE: Logistik- und Such-Defaults hinzugefügt.
 */

// --- ICONS MAPPING ---
export const ICONS: Record<string, string> = {
  'ReisetypStrategie': 'compass',
  'Reisetempo': 'gauge',
  'Preisniveau': 'wallet',
  'Emotionale Stimmung': 'smile',
  'Restaurant': 'utensils',
  'Nachtleben': 'martini',
  'Architektur': 'landmark', 
  'Stadtbezirke': 'map-pin',
  'Museum': 'library', 
  'Parks': 'trees',
  'Natur': 'mountain',
  'Strand': 'umbrella',
  'Sport': 'activity',
  'Familie': 'baby', 
  'Wellness': 'coffee', 
  'Shopping': 'shopping-bag',
  'Allgemein': 'info',
  'Puffer': 'hourglass',
  'Anreise': 'plane',
  'Hotel': 'bed',
  'StadtInfo': 'building',
  'Budget': 'calculator',
  'Reiseinformationen': 'book',
  'Unberuecksichtigt': 'eye-off'
};

export const INTEREST_DISPLAY_ORDER = [
  'ReisetypStrategie', 'Preisniveau', 'Emotionale Stimmung', 'Restaurant', 'Nachtleben', 
  'Architektur', 'Stadtbezirke', 'Museum', 'Parks', 'Natur', 'Strand', 'Sport', 
  'Familie', 'Wellness', 'Shopping', 'Allgemein', 'Puffer', 'Anreise', 'Hotel', 
  'StadtInfo', 'Budget', 'Reiseinformationen', 'Unberuecksichtigt'
];

export const APPENDIX_ONLY_INTERESTS = [
  'Anreise', 'Hotel', 'StadtInfo', 'Budget', 'Reiseinformationen', 'Unberuecksichtigt'
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