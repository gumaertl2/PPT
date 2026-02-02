// 05.02.2026 18:30 - NEW STRATEGY: GEOGRAPHIC FUNNEL (STEP 1).
// - Implements the "GIS Assistant" Logic.
// - Focus: Create relevant clusters instead of random lists.
// src/core/prompts/templates/geoExpander.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildGeoExpanderPrompt = (payload: any): string => {
  const { context } = payload;
  const center = context.center || "Unknown Location";
  // We interpret radius broadly (20-25km) as per your prompt logic
  
  const role = `Du bist ein GIS-Assistent (Geographic Information System).`;

  const instruction = `
  Ich gebe dir einen Ausgangsort. Erstelle eine Liste der relevantesten Städte, Gemeinden und wichtigen Ortsteile im Radius von ca. 20-25 km, die gastronomisch relevant sein könnten.
  Ignoriere winzige Weiler, konzentriere dich auf Orte mit Infrastruktur.

  Input Ort: "${center}"`;

  const outputSchema = {
    "_thought_process": "String (Kurze Erklärung der Cluster-Bildung)",
    "candidates": ["String (Liste der Orte, z.B. ['Ort 1', 'Ort 2 (inkl. Ortsteil X)'])"]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withInstruction(instruction)
    .withOutputSchema(outputSchema)
    .build();
};