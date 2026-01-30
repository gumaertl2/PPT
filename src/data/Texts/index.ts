// 01.02.2026 15:55 - FIX: Corrected import name 'agentManifest' (camelCase) to match export.
/**
 * src/data/Texts/index.ts
 *
 * ZENTRALE TEXT-REGISTRY
 * Importiert die einzelnen Text-Module und stellt die Zugriffsfunktionen bereit.
 */

import type { LanguageCode } from '../../core/types';

// Import der Einzel-Module
import { briefing } from './briefing';
import { description } from './description';
import { terms } from './terms';
import { help } from './help';
// WICHTIG: Hier muss der Import-Name exakt dem Export in der Datei entsprechen!
import { agentManifest } from './agent_manifest'; 
import { promptArchitecture } from './prompt_architecture';

export interface InfoContent {
  title: string;
  content: string;
}

// Wir behalten 'catalog' und 'setup' im Typ, damit der WelcomeScreen nicht abstürzt.
// Erweitert um die neuen Doku-Module.
export type InfoCategory = 
  | 'briefing' 
  | 'description' 
  | 'terms' 
  | 'help' 
  | 'catalog' 
  | 'setup'
  | 'agentManifest'      // camelCase für den Key
  | 'promptArchitecture'; 

// Platzhalter für Nicht-Text-Komponenten
const PLACEHOLDER_CONTENT = {
  de: { title: "Lade...", content: "" },
  en: { title: "Loading...", content: "" }
};

export const INFO_TEXTS: Record<InfoCategory, { de: InfoContent; en?: InfoContent }> = {
  briefing,
  description,
  terms,
  help,
  agentManifest,      // Verwendet die importierte Variable
  promptArchitecture, 
  
  // Diese Kategorien werden bald durch echte React-Komponenten ersetzt
  catalog: PLACEHOLDER_CONTENT,
  setup: PLACEHOLDER_CONTENT
};

/**
 * Holt den passenden Text basierend auf Kategorie und Sprache.
 * Fallback auf Deutsch, wenn Englisch fehlt.
 */
export const getInfoText = (category: InfoCategory, lang: LanguageCode = 'de'): InfoContent => {
  const data = INFO_TEXTS[category];
  
  if (lang === 'de') return data.de;
  // Fallback Logik: EN -> DE
  return data.en || data.de;
};

// Optional: Exportiere TEXTS als Alias für INFO_TEXTS falls neuer Code das erwartet
export const TEXTS = INFO_TEXTS;
// --- END OF FILE 65 Zeilen ---