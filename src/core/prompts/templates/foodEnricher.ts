// 18.01.2026 18:25 - FIX: Corrected PromptBuilder pattern and Signature for Build Compatibility.
// src/core/prompts/templates/foodEnricher.ts
// 19.01.2026 13:30 - FIX: Restored V30 Legacy Schema (German Keys) for Consistency with FoodScout.
// 16.01.2026 20:00 - FEAT: Added 'Menu & Vibe' Analysis.
// 18.01.2026 00:35 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (
    project: TripProject,
    candidates: any[]
): string => {
  // 1. STRATEGISCHES BRIEFING HOLEN
  const strategischesBriefing = project.analysis.chefPlaner?.strategisches_briefing?.sammler_briefing || "";
  
  const role = `Du bist ein kulinarischer Daten-Anreicherer. Deine Aufgabe ist es, zu einer Liste von Restaurant-Namen die Details zu finden.`;

  const contextData = {
    candidates_to_enrich: candidates
  };

  const instructions = `# AUFGABE
Recherchiere für jeden Kandidaten live im Web.

# DATEN-ANFORDERUNGEN
1.  **Adresse:** Muss exakt und navigierbar sein.
2.  **Küche:** Was wird serviert? (z.B. "Modern Italian", "Traditional Bavarian").
3.  **Vibe:** Beschreibe die Atmosphäre in 3-4 Worten (z.B. "Romantisch, Kerzenschein").
4.  **Spezialität:** Nenne 1-2 Signature Dishes, falls auffindbar.
5.  **Preis:** €, €€ oder €€€.

# FALLBACK
Wenn ein Restaurant unauffindbar ist, markiere es als "NICHT GEFUNDEN". Erfinde nichts.`;

  // FIX: Schema converted to German V30 keys to match FoodScout
  const outputSchema = {
    "angereicherte_kandidaten": [
      {
        "original_name": "String",
        "gefunden": "Boolean",
        "adresse": "String",
        "kueche": "String",
        "atmosphaere": ["String"],
        "spezialitaet": "String",
        "preisKategorie": "String",
        "webseite": "String"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "INPUT LISTE")
    .withContext(strategischesBriefing, "STRATEGISCHE VORGABE") // FIX: Injected via Builder method
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'research'])
    .build();
};
// --- END OF FILE 61 Zeilen ---