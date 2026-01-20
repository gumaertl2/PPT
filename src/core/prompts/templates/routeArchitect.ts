// 20.01.2026 23:00 - FIX: Added missing stats (km/time) AND User Waypoints to context.
// src/core/prompts/templates/routeArchitect.ts
// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys (routes).
// 19.01.2026 19:15 - FIX: Corrected PromptBuilder pattern for Strategic Briefing injection.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildRouteArchitectPrompt = (project: TripProject): string => {
  const { userInputs, analysis } = project;
  const { logistics, dates } = userInputs;

  // 1. STRATEGISCHES BRIEFING (Accessing V40 English Keys)
  const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || "";

  // 2. USER ROUTEN-PRÄFERENZEN (Das wurde bisher vergessen!)
  const roundtripOptions = logistics.roundtripOptions || {};

  // Kontext für die KI
  const contextData = {
    start_date: dates.start,
    end_date: dates.end,
    total_duration_days: dates.duration,
    arrival_type: (dates.arrival as any).type || 'car',
    logistics_mode: logistics.mode,
    // Basis-Constraints
    roundtrip_constraints: logistics.mode === 'mobil' ? logistics.roundtrip : null,
    // FIX: User-defined Waypoints & Strict Mode
    user_waypoints: roundtripOptions.waypoints || "None",
    is_strict_route: roundtripOptions.strictRoute || false
  };

  const role = `Du bist der "Route Architect". Deine Aufgabe ist es, für eine gegebene Reisedauer und Region logische Routen-Optionen (Rundreisen) zu entwerfen.
  Du planst NUR die Übernachtungsstationen (Hubs), keine Tagesaktivitäten.`;

  const instructions = `# AUFGABE
Entwickle 3 verschiedene Routen-Optionen für die angegebene Reisedauer.
Die Optionen sollen sich im "Vibe" unterscheiden (z.B. "Der Klassiker", "Natur pur", "Kultur & Geschichte").

# LOGISTIK-REGELN
1.  **Start & Ende:** Beachte die fixen Start/Endpunkte aus den Constraints (falls gesetzt).
2.  **User Waypoints:** Wenn "user_waypoints" definiert sind, VERSUCHE diese logisch in die Route einzubauen.
    - Falls "is_strict_route" = true: Du MUSST diese Punkte einbauen (Pflicht!).
3.  **Pace:** Plane realistische Fahrdistanzen. Max 4 Stunden reine Fahrzeit pro Stationwechsel.
4.  **Dauer:** Die Summe der Nächte muss exakt der Reisedauer entsprechen.
5.  **Stationen:** Wähle strategisch kluge Übernachtungsorte (Hubs), von denen aus man die Umgebung erkunden kann.
6.  **Kalkulation (PFLICHT):** Schätze die Gesamtkilometer (total_km) und die reine Gesamtfahrzeit (total_drive_time) für die gesamte Route realistisch ein.

# OUTPUT-SCHEMA (V40 Standard)
Erstelle ein JSON mit dem Schlüssel "routes".
Jeder Vorschlag benötigt:
- \`title\`: Kreativer Titel.
- \`description\`: Kurzbeschreibung des Vibes.
- \`total_km\`: Geschätzte Gesamtkilometer der Runde (Number).
- \`total_drive_time\`: Geschätzte reine Fahrzeit in Stunden (Number).
- \`stages\`: Ein Array von Objekten.
  - \`location_name\`: Name des Ortes.
  - \`nights\`: Anzahl der Nächte (Integer).
  - \`reasoning\`: Kurze Begründung (Warum dieser Stopp?).`;

  const outputSchema = {
    "routes": [
      {
        "title": "String (e.g. 'Alpine Classic')",
        "description": "String (Short vibe description)",
        "total_km": 450,
        "total_drive_time": 6.5,
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
// --- END OF FILE 107 Zeilen ---