// 02.02.2026 12:45 - FIX: SCOUT DIET (PURE COLLECTOR).
// - Removed all complex fields (URL, Location, Address).
// - Scout now only delivers raw names for the Auditor to process.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { FoodSearchPayload } from '../../types';

export const buildFoodScoutPrompt = (payload: FoodSearchPayload): string => {
  const { context, instructions } = payload;
  const townListJSON = JSON.stringify(context.town_list || []);

  const role = instructions.role || "Du bist ein Datenbank-Expertensystem für europäische Gastronomie.";

  const mainInstruction = `
  Analysiere folgende Orte auf bekannte Restaurants.
  
  Orte zum Scannen: ${townListJSON}

  Regeln:
  1. Sammle ALLES, was nach relevantem Restaurant aussieht.
  2. Sei "inklusiv" (lieber zu viel als zu wenig).
  3. Liefere NUR Name und Ort. Den Rest macht der Auditor.
  `;

  // Minimal Schema for the Collector
  const outputSchema = {
    "_thought_process": "String (Kurze Scan-Logik)",
    "candidates": [
      {
        "name": "String (Name des Restaurants)",
        "city": "String (Ort)",
        "description": "String (Warum relevant?)"
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
// --- END OF FILE 42 Lines ---