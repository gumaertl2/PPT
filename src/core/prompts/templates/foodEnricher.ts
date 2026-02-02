// 02.02.2026 17:10 - FIX: STRICT GUIDES ONLY (No Google Ratings allowed).
// - Removed unauthorized "Top-Favorit" loophole.
// - Enforced strict "No Guide = No Entry" policy.
// - Kept technical field mapping (Phone, Website, Vibe).
// src/core/prompts/templates/foodEnricher.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (payload: any): string => {
  const { context, instructions } = payload;
  const inputListJSON = JSON.stringify(context.candidates_list || []);
  const targetCountry = context.target_country || "Deutschland";
  const allowedGuides = context.allowed_guides || "Michelin, Gault&Millau, Varta, Schlemmer Atlas, Feinschmecker, Gusto, Slow Food";

  const role = instructions.role || "Du bist ein strenger Restaurant-Kritiker, Recherche-Profi und Daten-Auditor.";

  const mainInstruction = `
  Ich gebe dir eine Liste von potenziellen Restaurants ("Raw Candidates").
  Deine Aufgabe ist die harte Validierung ("The Auditor") und die maximale Datenanreicherung.

  TARGET COUNTRY: **${targetCountry}**
  ALLOWED GUIDES: **[${allowedGuides}]**

  SCHRITT 1: PRÜFUNG (Inverted Search - The Filter)
  - Existiert das Restaurant wirklich in ${targetCountry}?
  - Ist es in einem der oben genannten Guides gelistet?
  - **DISCARD RULE:** Falls es in KEINEM Guide steht -> **Lösche es aus der Liste!** Es darf nicht im Output erscheinen.

  SCHRITT 2: TIEFEN-RECHERCHE (Die "Goldenen" Daten)
  Fülle für jeden verbleibenden Kandidaten ALLE folgenden Felder:
  
  1. **Kontakt:**
     - **Phone:** Die Telefonnummer für Reservierungen (Format international: +49...).
     - **Website:** Die OFFIZIELLE Homepage (nicht Facebook, nicht Tripadvisor, außer es gibt nichts anderes).
  
  2. **Details:**
     - **Opening Hours:** Ein String oder Array mit den Zeiten (z.B. "Di-so 18-23 Uhr").
     - **Signature Dish:** Das berühmteste Gericht oder eine Spezialität des Hauses.
     - **Vibe:** Liste 2-3 Adjektive zur Atmosphäre (z.B. ["Romantisch", "Traditionell", "Laut"]).
     - **Awards:** In welchen Guides steht es genau? (z.B. ["Michelin Stern", "Gault&Millau 2 Hauben"]).

  3. **Basis-Daten (Pflicht):**
     - **Location:** Exakte Lat/Lng Koordinaten.
     - **URL:** Baue zusätzlich den Google-Link: \`https://www.google.com/search?q={Name}+{Stadt}+${targetCountry}\`

  Input Liste: ${inputListJSON}
  `;

  // Full Schema mapping to src/core/types.ts -> Place
  const outputSchema = {
    "_thought_process": "String (Audit Log: Found website? Found phone? Which guide?)",
    "candidates": [
      {
        "name_official": "String (Offizieller Name)",
        "city": "String (Ort)",
        "address": "String (Volle Adresse)",
        "location": { "lat": "Number (Pflicht!)", "lng": "Number (Pflicht!)" },
        
        // Extended Data
        "phone": "String (oder null)",
        "website": "String (Offizielle URL oder null)",
        "openingHours": ["String (z.B. 'Mo-Fr 12-14')"],
        "signature_dish": "String (Spezialität)",
        "vibe": ["String (Atmosphäre Keywords)"],
        "awards": ["String (Guide Namen)"], // Mapped to 'awards' in Store
        
        "source_url": "String (Google Search Link)",
        "description": "String (Marketing Text)",
        "cuisine": "String (Küchenstil)",
        "priceLevel": "String (€-€€€)",
        "rating": "Number (4.0-5.0)",
        "user_ratings_total": "Number (Integer - geschätzt)",
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
// --- END OF FILE 86 Lines ---