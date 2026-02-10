// 10.02.2026 22:00 - FIX: Signature Mismatch. Updated to (project, context) pattern.
// 05.02.2026 18:30 - NEW STRATEGY: GEOGRAPHIC FUNNEL (STEP 1).
// src/core/prompts/templates/geoExpander.ts

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject } from '../../types';

// FIX: Changed signature to match PayloadBuilder call (project, context)
export const buildGeoExpanderPrompt = (project: TripProject, context: any): string => {
  // Safe access guard
  const safeContext = context || {};
  const center = safeContext.center || "Europe";
  const country = safeContext.country || "";
  const radius = safeContext.radius || 20;
  
  const role = `Du bist ein GIS-Assistent (Geographic Information System).`;

  const instruction = `
  Ich gebe dir einen Ausgangsort. Erstelle eine Liste der relevantesten Städte, Gemeinden und wichtigen Ortsteile im Radius von ca. ${radius} km um "${center}"${country ? ' (' + country + ')' : ''}, die gastronomisch relevant sein könnten.
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
// --- END OF FILE 33 Zeilen ---