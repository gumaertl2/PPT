// 02.02.2026 14:00 - FIX: AUDITOR WITH GUIDE LIST.
// - Uses the injected 'allowed_guides' list for verification.
// - Enforces coordinates (no nulls!).
// - Maps strict audit results to legacy UI fields.
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  const inputListJSON = JSON.stringify(context.candidates_list || []);
  const targetCountry = context.target_country || "Deutschland";
  const allowedGuides = context.allowed_guides || "Michelin, Gault&Millau";

  const role = instructions.role || "Du bist ein strenger Restaurant-Kritiker und Fakten-Prüfer.";

  const mainInstruction = `
  Ich gebe dir eine Liste von potenziellen Restaurants ("Raw Candidates").
  Deine Aufgabe ist die harte Validierung ("The Auditor").
  
  TARGET COUNTRY: **${targetCountry}**
  ALLOWED GUIDES: **[${allowedGuides}]**

  SCHRITT 1: PRÜFUNG (Inverted Search)
  - Existiert das Restaurant wirklich in ${targetCountry}?
  - Ist es in einem der oben genannten Guides gelistet? (Oder ein absoluter lokaler Top-Favorit?)
  - Falls NEIN -> Lösche es (Empty Result).
  - Falls JA -> Verifiziere Adresse und Status.

  SCHRITT 2: DATEN-VERVOLLSTÄNDIGUNG (Pflichtfelder)
  1. **Koordinaten (CRITICAL):** Du MUSST Lat/Lng liefern. Wenn du die Adresse nicht exakt pinnen kannst, nimm die Stadtmitte. 'null' ist VERBOTEN.
  2. **URL:** Baue die URL so: \`https://www.google.com/search?q={Name}+{Stadt}+${targetCountry}\`
  3. **Guides:** Nenne exakt, wo es gelistet ist (z.B. "Varta", "Michelin").
  4. **Mapping:** Fülle die "alten" Felder (original_name, logistics_tip) für das System.

  Input Liste: ${inputListJSON}
  `;

  // Legacy Schema with Quality Audit
  const outputSchema = {
    "_thought_process": "String (Audit Log: Which guide found?)",
    "_quality_audit": "String (CONFIRM: 'Coordinates set. URL valid.')",
    "candidates": [
      {
        "original_name": "String (Offizieller Name)",
        "name_official": "String (Offizieller Name)",
        "city": "String (Ort)",
        "address": "String (Adresse)",
        "location": { "lat": "Number (Pflicht!)", "lng": "Number (Pflicht!)" },
        "guides": ["String"],
        "source_url": "String (Clean URL with Country)",
        "description": "String (Marketing Text)",
        "logistics_tip": "String (Logistik Info)",
        "cuisine": "String (Küchenstil)",
        "priceLevel": "String (€-€€€)",
        "rating": "Number (4.0-5.0)",
        "user_ratings_total": "Number (Integer - geschätzt)",
        "found": "Boolean (immer true)",
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
// --- END OF FILE 72 Lines ---