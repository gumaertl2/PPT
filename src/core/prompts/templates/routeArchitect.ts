// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys (routes).
// src/core/prompts/templates/routeArchitect.ts
// 19.01.2026 19:15 - FIX: Corrected PromptBuilder pattern for Strategic Briefing injection.
// 17.01.2026 12:45 - UPDATE: Integrated Duration Estimator logic directly.
// 18.01.2026 00:10 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildRouteArchitectPrompt = (project: TripProject): string => {
  const { userInputs, analysis } = project;
  const { logistics, dates } = userInputs;

  // 1. STRATEGISCHES BRIEFING (Accessing V40 English Keys)
  // chefPlaner now returns 'strategic_briefing'
  const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || "";

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
5.  **Struktur:** Gib die Übernachtungsorte als strukturierte Liste (Stages) an.

# OUTPUT-SCHEMA (V40 Standard)
Erstelle ein JSON mit dem Schlüssel "routes".
Jeder Vorschlag benötigt:
- \`title\`: Kreativer Titel.
- \`description\`: Kurzbeschreibung des Vibes.
- \`stages\`: Ein Array von Objekten.
  - \`location_name\`: Name des Ortes.
  - \`nights\`: Anzahl der Nächte (Integer).
  - \`reasoning\`: Kurze Begründung (Warum dieser Stopp?).`;

  const outputSchema = {
    "routes": [
      {
        "title": "String (e.g. 'Alpine Classic')",
        "description": "String (Short vibe description)",
        "stages": [
          {
            "location_name": "München",
            "nights": 2,
            "reasoning": "Start point & Culture"
          },
          {
            "location_name": "Garmisch-Partenkirchen",
            "nights": 2,
            "reasoning": "Alps & Nature"
          },
          {
            "location_name": "Berchtesgaden",
            "nights": 2,
            "reasoning": "History & Views"
          }
        ]
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "LOGISTIK & RAHMENBEDINGUNGEN")
    .withContext(strategicBriefing, "STRATEGISCHE VORGABE")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'planning'])
    .build();
};
// --- END OF FILE 86 Zeilen ---