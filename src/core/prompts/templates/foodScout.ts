// 19.01.2026 13:05 - FIX: Restored V30 Legacy Schema (vorschlaege, geo_koordinaten) for SSOT compliance.
// src/core/prompts/templates/foodScout.ts
// 16.01.2026 19:45 - FIX: Added V30 "Star-Filter" Logic.
// 18.01.2026 00:30 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject, FoodSearchMode } from '../../types';
import { PromptBuilder } from '../PromptBuilder';
import { getGuidesForCountry } from '../../../data/countries';

export const buildFoodScoutPrompt = (
    project: TripProject, 
    mode: FoodSearchMode = 'standard'
): string => {
  const { userInputs } = project;
  const { logistics, budget, vibe } = userInputs;

  // 1. Ort & Guides bestimmen
  let location = "";
  let countryHint = "";

  if (logistics.mode === 'stationaer') {
      location = logistics.stationary.destination;
      countryHint = logistics.stationary.region; 
  } else {
      const stops = logistics.roundtrip.stops.map(s => s.location).join(', ');
      location = `den Stationen: ${stops}`;
      countryHint = logistics.roundtrip.region;
  }

  const guides = getGuidesForCountry(countryHint || location).join(', ');

  // 2. Modus-Logik (V30 Parität)
  let qualityFilterInstruction = "";
  if (mode === 'standard') {
      qualityFilterInstruction = `### QUALITÄTS-FILTER (STANDARD)
Wir suchen exzellente Küche für den normalen Reise-Alltag, KEIN "Fine Dining" Event.
1. **Quellen:** Nutze die Guides (${guides}).
2. **Kategorie:** Suche nach "Bib Gourmand", "Tipp", "Empfehlung".
3. **EXCLUDE:** Ignoriere Restaurants mit Michelin-Sternen (außer Budget erlaubt es).`;
  } else {
      qualityFilterInstruction = `### QUALITÄTS-FILTER (GOURMET / STERNE)
Der User wünscht explizit gehobene Gastronomie.
1. **Quellen:** Nutze die Guides (${guides}).
2. **Kategorie:** Priorisiere Restaurants mit Sternen (1-3) oder Hauben.`;
  }

  // 3. Prompt Builder
  const role = `Du bist ein kulinarischer Recherche-Scout. Deine Aufgabe ist es, Restaurants zu finden, die in renommierten Guides gelistet sind.`;

  const contextData = {
    zielgebiet: { ort: location, land: countryHint },
    zulässige_quellen: guides,
    budget: budget,
    vibe: vibe
  };

  const instructions = `# AUFGABE
Suche nach Restaurants in ${location}, die den Filter-Kriterien entsprechen.
Extrahiere die exakten Koordinaten.

${qualityFilterInstruction}

# PFLICHT
Geografische Daten sind PFLICHT für die Entfernungsberechnung.`;

  // FIX: Schema completely reverted to German V30 Legacy names
  const outputSchema = {
    "vorschlaege": [
      {
        "name": "String",
        "ort": "String",
        "adresse": "String",
        "beschreibung": "String (Kurze Beschreibung der Küche/Vibe)",
        "geo_koordinaten": { "breitengrad": "Number", "laengengrad": "Number" },
        "guides": ["String"],
        "kueche": "String (z.B. 'Regional', 'Modern')",
        "preisKategorie": "String (z.B. '€€', '€€€')"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "KONTEXT")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'research'])
    .build();
};
// --- END OF FILE 87 Zeilen ---