// 05.02.2026 17:00 - REFACTOR: SHARED TYPES.
// Core definitions used across UI and Logic.
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
// --- END OF FILE 68 Zeilen ---