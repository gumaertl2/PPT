// src/core/prompts/templates/foodEnricher.ts
// 16.01.2026 20:00 - FEAT: Added 'Menu & Vibe' Analysis.
// 18.01.2026 00:35 - REFACTOR: Migrated to class-based PromptBuilder.
// 18.01.2026 00:45 - FIX: Marked unused 'project' parameter with underscore (TS6133).

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (
    _project: TripProject, // Unused but kept for signature compatibility
    candidates: any[]
): string => {
  // Input: Liste von { name, ort }
  
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
Wenn ein Restaurant unauffindbar ist, markiere es als "NOT FOUND". Erfinde nichts.`;

  const outputSchema = {
    "enriched_candidates": [
      {
        "original_name": "String",
        "found": "Boolean",
        "address": "String",
        "cuisine_type": "String",
        "vibe_tags": ["String"],
        "signature_dish": "String",
        "price_level": "String",
        "website_url": "String"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "INPUT LISTE")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'research'])
    .build();
};
// --- END OF FILE 56 Zeilen ---