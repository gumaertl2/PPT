// 02.02.2026 15:30 - FIX: SCOUT DIET V2 (Strategic Broad Search).
// - Implemented "Broad Search" logic from successful monolith prompt.
// - Focus: "Gehobene Gasthäuser & Restaurants" instead of "Alles".
// - Filters: Explicitly ignores Fast Food/Döner to prevent noise.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { FoodSearchPayload } from '../../types';

export const buildFoodScoutPrompt = (payload: FoodSearchPayload): string => {
  const { context, instructions } = payload;
  const townListJSON = JSON.stringify(context.town_list || []);

  const role = instructions.role || "Du bist ein Experte für die Gastronomie-Landschaft.";

  // LOGIC ADAPTED FROM SUCCESSFUL "BROAD SEARCH" STEP:
  const mainInstruction = `
  Führe eine "Broad Search" (Sammel-Phase) für folgende Orte durch.
  
  Such-Cluster: ${townListJSON}

  Aufgabe:
  Identifiziere alle bekannten, gehobenen Gasthäuser und Restaurants in diesen Clustern.
  
  Regeln für die Auswahl:
  1. Fokus Qualität: Suche nach "Fine Dining", "Gehobener regionaler Küche" oder lokalen "Hidden Gems".
  2. Anti-Rauschen: Ignoriere strikt Fast Food, Dönerbuden, reine Imbisse oder Lieferdienste.
  3. Vollständigkeit: Wirf das Netz weit aus, aber nur innerhalb der Qualitäts-Parameter ("Gutes Essen").
  4. Output: Liefere NUR Name und Ort. Die Detail-Prüfung macht der Auditor.
  `;

  // Minimal Schema for the Collector
  const outputSchema = {
    "_thought_process": "String (Scan-Logik: Welche guten Adressen fallen mir in den Clustern ein?)",
    "candidates": [
      {
        "name": "String (Name des Restaurants)",
        "city": "String (Ort)",
        "description": "String (Kurz: Küche/Stil - z.B. 'Bayrisch gehoben')"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withInstruction(mainInstruction)
    .withOutputSchema(outputSchema)
    .build();
};
// --- END OF FILE 48 Lines ---