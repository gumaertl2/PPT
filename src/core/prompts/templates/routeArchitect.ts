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

# OUTPUT-SCHEMA
Erstelle für jede Option eine Liste von "Stages" (Etappen).
Jede Stage benötigt:
- \`location_name\`: Name des Ortes.
- \`nights\`: Anzahl der Nächte.
- \`reasoning\`: Warum dieser Ort? (1 Satz).`;

  const outputSchema = {
    "route_options": [
      {
        "id": "String (z.B. 'route_classic')",
        "title": "String (Titel der Route)",
        "description": "String (Kurze Beschreibung des Charakters)",
        "stages": [
          {
            "location_name": "String",
            "nights": "Integer",
            "reasoning": "String"
          }
        ]
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
// --- END OF FILE 65 Zeilen ---