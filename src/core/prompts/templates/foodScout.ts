// 03.02.2026 14:00 - FIX: V30 STRATEGY RESTORED.
// - Implements the "500+ Reviews OR Guide" rule from V30.
// - Robust Fallback: Ignores empty town lists and searches radius instead.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodScoutPrompt = (payload: any): string => {
  const { context } = payload;
  const locationName = context.locationName || "Unbekannter Ort";
  // V30-Logic: Use provided list OR fallback to radius search
  const townList = (context.town_list && context.town_list.length > 0) 
    ? context.town_list.join(', ') 
    : `alle Orte im Umkreis von 20km um ${locationName}`;

  const role = "Du bist ein Food-Scout. Dein Ziel ist Maximale Ausbeute an Qualität.";

  const mainInstruction = `
  SUCHGEBIET: ${townList}

  DEINE MISSION (V30 STRATEGIE):
  Finde JEDES Restaurant, das relevant ist. Höre nicht nach 5 Treffern auf. Wir brauchen eine volle Liste (20-30 Kandidaten).

  FILTER-REGELN ("THE LOCAL HERO LAW"):
  Ein Restaurant darf auf die Liste, wenn EINE der Bedingungen erfüllt ist:
  A) Es steht in einem Guide (Michelin, Slow Food, Feinschmecker, Varta, Gusto).
  B) ODER: Es ist ein "Local Hero" mit **vielen positiven Bewertungen** (Google > 4.5 bei > 300 Bewertungen ODER > 4.0 bei > 500 Bewertungen).
  
  Das garantiert, dass wir Institutionen wie "Klosterstüberl", "Widmann" oder "Bräustüberl" finden, auch wenn sie in keinem Guide stehen.

  FOKUS KATEGORIEN:
  1. Traditionelle bayerische Wirtshäuser (Dorf-Gasthöfe sind Gold wert!).
  2. Gehobene Landküche.
  3. Beliebte Italiener/Griechen, wenn sie eine Institution im Ort sind.

  OUTPUT:
  Eine JSON-Liste mit Kandidaten.
  `;

  const outputSchema = {
    "candidates": [
      {
        "name": "String",
        "city": "String (Wichtig: Der genaue Ort!)",
        "why_relevant": "String (z.B. 'Local Hero mit 800 Bewertungen' oder 'Slow Food Genussführer')",
        "cuisine": "String"
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
// --- END OF FILE 52 Lines ---