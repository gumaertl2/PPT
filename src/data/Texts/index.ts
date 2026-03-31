// 01.02.2026 23:25 - FIX: Adaptive Wrappers for Complex Data Types (AgentManifest & Architecture).
// Resolves TS2741 by extracting 'meta' data for the simple InfoContent interface.
// src/data/Texts/index.ts

import type { LanguageCode } from '../../core/types';

// Import der Einzel-Module
import { briefing } from './briefing';
import { description } from './description';
import { terms } from './terms';
import { help } from './help';
import { agentManifest } from './agent_manifest'; 
import { promptArchitecture } from './prompt_architecture';

export interface InfoContent {
  title: string;
  content: string;
}

export type InfoCategory = 
  | 'briefing' 
  | 'description' 
  | 'terms' 
  | 'help' 
  | 'catalog' 
  | 'setup'
  | 'agentManifest'      
  | 'promptArchitecture'; 

// Platzhalter für Nicht-Text-Komponenten
const PLACEHOLDER_CONTENT = {
  de: { title: "Lade...", content: "" },
  en: { title: "Loading...", content: "" }
};

// --- ADAPTER HELPER ---
// Wandelt die komplexe Struktur von AgentManifest/PromptArchitecture in das simple UI-Format um.
const adaptComplexObject = (obj: any): { de: InfoContent; en?: InfoContent } => {
  // Check if it already has de/en structure
  if (obj.de && obj.de.title) return obj;

  // Fallback: Assume it's a raw object with meta data (like PromptArchitecture)
  // We wrap it in a 'de' structure to satisfy the type definition.
  const title = obj.meta?.title || "System Info";
  const desc = obj.meta?.description || "No description available.";
  
  return {
    de: { 
      title: title, 
      content: desc // Simple fallback content. Detailed rendering should happen in specific Views.
    },
    en: {
      title: title,
      content: desc
    }
  };
};

// Wir wenden den Adapter auf die komplexen Module an
const adaptedAgentManifest = adaptComplexObject(agentManifest);
const adaptedPromptArchitecture = adaptComplexObject(promptArchitecture);

// Jetzt passt der Typ!
export const INFO_TEXTS: Record<InfoCategory, { de: InfoContent; en?: InfoContent }> = {
  briefing,
  description,
  terms,
  help,
  agentManifest: adaptedAgentManifest,
  promptArchitecture: adaptedPromptArchitecture,
  
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

// Optional: Exportiere TEXTS als Alias für INFO_TEXTS
export const TEXTS = INFO_TEXTS;
// --- END OF FILE 75 Zeilen ---