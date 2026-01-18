// 19.01.2026 13:45 - FIX: Restored V30 Legacy Schema (German Keys) for DurationEstimator.
// src/core/prompts/templates/durationEstimator.ts
// 17.01.2026 15:00 - FEAT: Initial Logic for Roundtrip Duration Estimation.
// 18.01.2026 00:50 - FIX: Restored correct content (was overwritten by GeoAnalyst).
// 18.01.2026 00:55 - REFACTOR: Migrated to PromptBuilder pattern.
// 18.01.2026 00:05 - FIX: Removed invalid 'logic' self-check type (TS2322).

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildDurationEstimatorPrompt = (project: TripProject): string => {
  const { userInputs } = project;
  const { logistics, dates, pace, selectedInterests } = userInputs;

  // Nur relevant für Rundreisen
  const stops = logistics.roundtrip?.stops || [];
  const totalDays = dates.duration;

  // Kontext-Daten für die KI
  const contextData = {
    total_trip_duration_days: totalDays,
    pace_preference: pace, // fast, balanced, relaxed
    travel_party: userInputs.travelers,
    interests: selectedInterests,
    planned_stops: stops.map(s => s.location)
  };

  const role = `Du bist der "Duration Estimator" (Zeit-Stratege). Deine Aufgabe ist es, für eine gegebene Rundreise die ideale Aufenthaltsdauer (in Nächten) pro Stopp zu berechnen.`;

  const instructions = `# AUFGABE
Verteile die verfügbaren ${totalDays} Reisetage sinnvoll auf die ${stops.length} Stationen.

# REGELN
1.  **Tempo:** Beachte das Reisetempo '${pace}'. 
    - 'relaxed': Weniger Ortswechsel, längere Aufenthalte.
    - 'fast': Effiziente Route, kürzere Stopps.
2.  **Interessen:** Orte, die gut zu den Interessen (${selectedInterests.join(', ')}) passen, bekommen mehr Zeit.
3.  **Realismus:** Berücksichtige Reisezeiten zwischen den Orten (grob geschätzt).
4.  **Summe:** Die Summe der Nächte MUSS exakt (oder -1 Tag für Reisezeit) der Gesamtdauer entsprechen.

# INPUT
Route: ${stops.map(s => s.location).join(' -> ')}
Gesamtdauer: ${totalDays} Tage`;

  // FIX: Schema converted to German V30 keys
  const outputSchema = {
    "schaetzung": {
      "geplante_tage_gesamt": "Integer",
      "stationen": [
        {
          "ort": "String (Name aus Input)",
          "empfohlene_naechte": "Integer",
          "begruendung": "String (Kurze Begründung, warum so lange/kurz)"
        }
      ],
      "machbarkeits_check": "String (Ist die Route in der Zeit machbar? 'Ja', 'Knapp' oder 'Nein')"
    }
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "ROUTEN-DATEN")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['planning']) 
    .build();
};
// --- END OF FILE 61 Zeilen ---