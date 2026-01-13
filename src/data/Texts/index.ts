/**
 * src/data/texts/index.ts
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

export interface InfoContent {
  title: string;
  content: string;
}

// Wir behalten 'catalog' und 'setup' im Typ, damit der WelcomeScreen nicht abstürzt,
// bevor wir ihn auf echte Modals umgebaut haben.
export type InfoCategory = 'briefing' | 'description' | 'terms' | 'help' | 'catalog' | 'setup';

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