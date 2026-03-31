// 22.02.2026 10:55 - FEAT: Added 'CurrencyConfig' and 'CurrencyRate' interfaces for Smart-Currency feature.
// 21.02.2026 17:15 - FIX: Renamed 'geo' to 'location' in Expense interface for consistency with Diary entries.
// 21.02.2026 14:00 - FEAT: Added 'splitExact' to Expense interface for advanced custom splits.
// 21.02.2026 13:00 - FEAT: Added 'Expense' interface for the new Trip Finance / Reisekasse feature.
// 05.02.2026 17:00 - REFACTOR: SHARED TYPES.
// src/core/types/shared.ts

export type LanguageCode = 'de' | 'en' | 'es' | 'fr' | 'it' | 'nl' | 'pl' | 'pt' | 'ru' | 'tr' | 'ja' | 'zh';

// Cockpit Navigation Views
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

// System & Error Types
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

// --- TRIP FINANCE / REISEKASSE ---
export interface Expense {
  id: string;
  placeId?: string; 
  title: string;
  amount: number;
  currency: string;
  paidBy: string; 
  splitAmong: string[]; 
  splitExact?: Record<string, number>; 
  timestamp: number;
  location?: { lat: number; lng: number }; 
}

export interface CurrencyRate {
  currency: string;
  rate: number; // Wechselkurs zur Hauptwährung (z.B. 1 Hauptwährung = 1.08 dieser Währung)
}

export interface CurrencyConfig {
  baseCurrency: string; // Zeile 1: Die Hauptwährung für die Abrechnung
  rates: CurrencyRate[]; // Zeilen 2-5: Die Nebenwährungen
  lastUpdated?: string; // Zeitstempel des letzten Abrufs (z.B. ISO-String)
}
// --- END OF FILE 98 Zeilen ---