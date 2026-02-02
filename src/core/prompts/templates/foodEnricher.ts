// 03.02.2026 13:30 - FIX: SMART LINKS & NO HALLUCINATION.
// - Instructions to use provided Search URLs.
// - Strict rule against inventing addresses.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  const inputListJSON = JSON.stringify(context.candidates_list || []);
  const targetCountry = context.target_country || "Deutschland";
  const allowedGuides = context.allowed_guides || "Michelin, Slow Food, Varta";

  const role = instructions.role || "Du bist ein strenger Restaurant-Kritiker und Daten-Auditor.";

  const mainInstruction = `
  Ich gebe dir eine Liste von Kandidaten ("Raw Candidates").
  Deine Aufgabe ist die Validierung und Anreicherung.

  TARGET COUNTRY: **${targetCountry}**
  ALLOWED GUIDES & QUELLEN: **[${allowedGuides}]**

  SCHRITT 1: PRÜFUNG (The Filter)
  - Existiert das Restaurant wirklich?
  - Ist es in einem der Guides gelistet?
  - **Priorität:** Prüfe ZUERST "Slow Food", "Michelin", "Gault&Millau". Erst dann "Varta".
  - **DISCARD RULE:** Falls es in KEINEM Guide steht -> Lösche es aus der Liste!

  SCHRITT 2: DATEN-ANREICHERUNG
  Fülle alle Felder.

  WICHTIG - ADRESSEN & FAKTEN:
  - **Erfinde NIEMALS eine Adresse!** Wenn du dir bei der Hausnummer oder PLZ unsicher bist, nutze nur den Ort.
  - Wenn du ein Restaurant an einem falschen Ort vermutest (z.B. "Rottbach" vs "Grafrath"), prüfe es doppelt.

  WICHTIG - LINKS (Source URL):
  - Nutze die oben bereitgestellten URLs!
  - Wenn du es im "Slow Food" findest, nutze die Slow Food URL für den Link.
  - Fallback: Google Link mit Guide-Namen (z.B. "...+Slow+Food").

  Input Liste: ${inputListJSON}
  `;

  const outputSchema = {
    "_thought_process": "String (Audit Log)",
    "candidates": [
      {
        "name_official": "String (Offizieller Name)",
        "city": "String (Ort)",
        "address": "String (Volle Adresse - KEINE ERFINDUNGEN!)",
        "location": { "lat": "Number", "lng": "Number" },
        "phone": "String",
        "website": "String",
        "openingHours": ["String"],
        "signature_dish": "String",
        "vibe": ["String"],
        "awards": ["String (Liste ALLE Guides auf!)"], 
        "source_url": "String (Der Beweis-Link zum Guide)",
        "description": "String",
        "cuisine": "String",
        "priceLevel": "String",
        "verification_status": "String ('verified')"
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
// --- END OF FILE 85 Lines ---