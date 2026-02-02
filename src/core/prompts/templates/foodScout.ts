// 05.02.2026 18:30 - NEW STRATEGY: THE COLLECTOR (STEP 2).
// - Implements "Batch Processing" logic.
// - Goal: Recall > Precision (Catch everything relevant).
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { FoodSearchPayload } from '../../types';

export const buildFoodScoutPrompt = (payload: FoodSearchPayload): string => {
  const { context, instructions } = payload;
  const townListJSON = JSON.stringify(context.town_list || []);

  const role = instructions.role || "Du bist ein Datenbank-Expertensystem für europäische Gastronomie.";

  const mainInstruction = `
  Analysiere folgende Orte auf bekannte Restaurants, die in renommierten Führern (Michelin, Gault&Millau, Slow Food, Varta, Schlemmer Atlas) gelistet sind oder einen exzellenten lokalen Ruf (Fine Dining / Gehobene Gasthöfe) genießen.

  Orte zum Scannen: ${townListJSON}

  Regeln:
  1. Sei inklusiv: Nimm im Zweifel lieber einen Kandidaten auf, als ihn zu vergessen.
  2. Ignoriere Fast Food, Döner oder reine Lieferdienste.
  `;

  // We map your requested array structure to our standard V40 schema wrapper
  const outputSchema = {
    "_thought_process": "String (Kurze Scan-Logik)",
    "candidates": [
      {
        "name": "String (Name des Restaurants)",
        "city": "String (Ort)",
        "description": "String (Optional: Kurzer Hinweis warum relevant)"
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