// src/core/prompts/templates/foodScout.ts
// 16.01.2026 19:30 - FEAT: Initial creation. Guide-based Research Agent.
// 16.01.2026 19:45 - FIX: Added V30 "Star-Filter" Logic (Standard vs. Gourmet Mode).
// 17.01.2026 11:15 - REFACTOR: Imported FoodSearchMode from SSOT types.

import type { TripProject, FoodSearchMode } from '../../types'; // <--- Importiert jetzt beide!
import { getGuidesForCountry } from '../../../data/countries';

export const buildFoodScoutPrompt = (
    project: TripProject, 
    mode: FoodSearchMode = 'standard' // Default: Keine Sterne, nur gute Küche
): string => {
  const { userInputs } = project;
  const { logistics, budget, vibe } = userInputs;

  // 1. Ort bestimmen
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

  // 2. Guides bestimmen
  const guides = getGuidesForCountry(countryHint || location);
  const guidesList = guides.join(', ');

  // 3. Modus-Logik (Das Herzstück der V30 Parität)
  let qualityFilterInstruction = "";
  
  if (mode === 'standard') {
      // TAGESPLAN-LOGIK: Gut, aber zügig. Keine Sterne-Marathons.
      qualityFilterInstruction = `
### QUALITÄTS-FILTER (STANDARD)
Wir suchen exzellente Küche für den normalen Reise-Alltag, KEIN "Fine Dining" Event.
1. **Quellen:** Nutze die Guides (${guidesList}).
2. **Kategorie:** Suche nach Auszeichnungen wie "Bib Gourmand", "Assiette/Teller", "Empfehlung" oder lokalen "Tipp"-Kategorien.
3. **EXCLUDE:** Ignoriere Restaurants mit 1, 2 oder 3 Michelin-Sternen (oder äquivalent hohen Auszeichnungen in anderen Guides), außer das Budget ist extrem hoch.
      `;
  } else {
      // AD-HOC / GOURMET LOGIK: Volle Kraft voraus.
      qualityFilterInstruction = `
### QUALITÄTS-FILTER (GOURMET / STERNE)
Der User wünscht explizit gehobene Gastronomie.
1. **Quellen:** Nutze die Guides (${guidesList}).
2. **Kategorie:** Priorisiere Restaurants mit Sternen (1-3), Hauben oder hohen Punktzahlen.
      `;
  }

  const lang = userInputs.aiOutputLanguage === 'en' ? 'English' : 'Deutsch';

  return `
DU BIST EIN KULINARISCHER RECHERCHE-SCOUT.
Deine Aufgabe ist es, Restaurants zu finden, die in renommierten Guides gelistet sind.

### ZIELGEBIET
- Ort/Region: ${location}
- Land: ${countryHint}

### ZULÄSSIGE QUELLEN
Guides: **${guidesList}**

${qualityFilterInstruction}

### WEITERE KRITERIEN
- Budget: ${budget}
- Vibe: ${vibe}
- **Geografische Daten sind PFLICHT.**

### AUFGABE
Suche nach Restaurants in ${location}, die den obigen Filter-Kriterien entsprechen.
Extrahiere die exakten Koordinaten (Lat/Lng) für die Entfernungsberechnung.

### OUTPUT FORMAT (STRIKTES JSON)
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt.

{
  "kandidaten": [
    {
      "name": "Name des Restaurants",
      "ort": "Stadt/Bezirk",
      "adresse": "Straße Hausnummer, PLZ Stadt",
      "geo": {
        "lat": 48.137, 
        "lng": 11.575
      },
      "guides": ["Michelin (Bib Gourmand)", "Gault&Millau"],
      "cuisine": "Art der Küche",
      "priceLevel": "€€"
    }
  ]
}

Antworte auf ${lang}.
`;
};
// --- END OF FILE 87 Zeilen ---