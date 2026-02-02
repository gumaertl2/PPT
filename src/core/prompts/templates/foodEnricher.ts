// 05.02.2026 18:30 - NEW STRATEGY: THE AUDITOR (STEP 3).
// - Implements "Golden Master" logic.
// - Strict Verification & Assignment.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  // We take the raw list from the context
  const inputListJSON = JSON.stringify(context.candidates_list || []);

  const role = instructions.role || "Du bist ein strenger Restaurant-Kritiker und Fakten-Prüfer. Deine Datenbasis endet 2026.";

  const mainInstruction = `
  Ich gebe dir eine Liste von potenziellen Restaurants.
  Deine Aufgabe:
  1. VERIFIZIEREN: Existiert das Restaurant wirklich und ist es gehoben? (Lösche Halluzinationen oder dauerhaft geschlossene).
  2. ZUORDNEN: In welchem Führer ist es aktuell gelistet? (Michelin, Gault&Millau, Slow Food, Varta, Schlemmer Atlas). Wenn KEIN Eintrag existiert -> Lösche es aus der Liste (außer es ist ein absoluter lokaler Geheimtipp).
  3. BEWERTEN: Gib eine Einschätzung der Google-Bewertung (konservativ geschätzt auf Basis deines Wissens: "Sehr gut" (>4.6), "Gut" (>4.4) oder "Durchschnitt").

  Input Liste: ${inputListJSON}
  `;

  // Mapping your requested structure to our store-compatible schema
  const outputSchema = {
    "_thought_process": "String (Audit Log)",
    "enriched_candidates": [
      {
        "name": "String",
        "city": "String", // mapped from address_city
        "guides": ["String (Liste der Führer)"],
        "description": "String (Style)",
        "rating_category": "String (Top Rated / Excellent / Good)",
        "verification_status": "String ('verified' | 'rejected')"
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