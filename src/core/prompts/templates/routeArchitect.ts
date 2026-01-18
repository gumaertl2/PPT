// 19.01.2026 12:00 - FIX: Restored V30 Legacy Output Schema (routenVorschlaege) to match Frontend SSOT directly.
// src/core/prompts/templates/routeArchitect.ts
// 17.01.2026 12:45 - UPDATE: Integrated Duration Estimator logic directly.
// 18.01.2026 00:10 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildRouteArchitectPrompt = (project: TripProject): string => {
  const { userInputs } = project;
  const { logistics, dates } = userInputs;

  // Kontext für die KI
  const contextData = {
    start_date: dates.start,
    end_date: dates.end,
    total_duration_days: dates.duration,
    arrival_type: (dates.arrival as any).type || 'car',
    logistics_mode: logistics.mode,
    // Falls Roundtrip: Die Constraints
    roundtrip_constraints: logistics.mode === 'mobil' ? logistics.roundtrip : null
  };

  const role = `Du bist der "Route Architect". Deine Aufgabe ist es, für eine gegebene Reisedauer und Region logische Routen-Optionen (Rundreisen) zu entwerfen.
  Du planst NUR die Übernachtungsstationen (Hubs), keine Tagesaktivitäten.`;

  const instructions = `# AUFGABE
Entwickle 3 verschiedene Routen-Optionen für die angegebene Reisedauer.
Die Optionen sollen sich im "Vibe" unterscheiden (z.B. "Der Klassiker", "Natur pur", "Kultur & Geschichte").

# LOGISTIK-REGELN
1.  **Start & Ende:** Beachte die fixen Start/Endpunkte aus den Constraints (falls gesetzt).
2.  **Pace:** Plane realistische Fahrdistanzen. Max 4 Stunden reine Fahrzeit pro Stationwechsel.
3.  **Dauer:** Die Summe der Nächte muss exakt der Reisedauer entsprechen.
4.  **Stationen:** Wähle strategisch kluge Übernachtungsorte (Hubs), von denen aus man die Umgebung erkunden kann.
5.  **Struktur:** Gib die Übernachtungsorte als einfache Liste an.

# OUTPUT-SCHEMA (Legacy Compatibility)
Erstelle ein JSON mit dem Schlüssel "routenVorschlaege".
Jeder Vorschlag benötigt:
- \`routenName\`: Kreativer Titel.
- \`charakter\`: Kurzbeschreibung des Vibes.
- \`uebernachtungsorte\`: Ein Array von Strings (nur die Städtenamen in Reihenfolge).
- \`ankerpunkte\`: Ein Array von Objekten für die Karten-Pins (standortFuerKarte).
- \`gesamtKilometer\`: Geschätzte Distanz (Zahl).
- \`gesamtFahrzeitStunden\`: Geschätzte reine Fahrzeit (Zahl).
- \`anzahlHotelwechsel\`: Anzahl der nötigen Hotelwechsel (Zahl).`;

  const outputSchema = {
    "routenVorschlaege": [
      {
        "routenName": "String (z.B. 'Alpen-Klassiker')",
        "charakter": "String (Kurze Beschreibung)",
        "uebernachtungsorte": [
          "München",
          "Garmisch-Partenkirchen",
          "Berchtesgaden"
        ],
        "ankerpunkte": [
          { "standortFuerKarte": "München" },
          { "standortFuerKarte": "Garmisch-Partenkirchen" },
          { "standortFuerKarte": "Berchtesgaden" }
        ],
        "gesamtKilometer": 350,
        "gesamtFahrzeitStunden": 5.5,
        "anzahlHotelwechsel": 2
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "LOGISTIK & RAHMENBEDINGUNGEN")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'planning'])
    .build();
};
// --- END OF FILE 79 Zeilen ---