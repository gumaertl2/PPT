// 03.02.2026 14:00 - FIX: SAFETY FALLBACK.
// - Ensures we never get an empty list.
// src/core/prompts/templates/geoExpander.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildGeoExpanderPrompt = (payload: any): string => {
  const { context } = payload;
  const { location, radius, country } = context;

  const role = "Du bist ein Geographie-Experte.";
  
  const mainInstruction = `
  Ziel: Liste alle Orte im Umkreis von ${radius} km um "${location}" (${country}).

  STRATEGIE:
  1. Nenne die wichtigen Nachbarorte (z.B. bei Maisach: Gernlinden, Esting, Olching, Fürstenfeldbruck).
  2. Nenne kleine Dörfer mit Gasthäusern (z.B. Rottbach, Überacker, Palsweis, Fußberg).
  
  SICHERHEITS-REGEL:
  Gib NIEMALS eine leere Liste zurück. Wenn du keine Orte findest, gib zumindest ["${location}"] zurück.

  OUTPUT FORMAT (JSON):
  { "candidates": ["Ort A", "Ort B", ...] }
  `;

  const outputSchema = {
    "candidates": ["String"]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withInstruction(mainInstruction)
    .withOutputSchema(outputSchema)
    .build();
};
// --- END OF FILE 33 Lines ---