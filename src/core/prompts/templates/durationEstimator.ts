// src/core/prompts/templates/geoAnalyst.ts
// 17.01.2026 15:00 - UPDATE: Added 'Hub Identification' Logic.
// 18.01.2026 00:40 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildGeoAnalystPrompt = (project: TripProject): string => {
  const { userInputs } = project;
  const { logistics } = userInputs;

  // Kontext vorbereiten
  let geoMode = "";
  let routing = "";

  if (logistics.mode === 'stationaer') {
    geoMode = "STATIONARY (Hub & Spoke)";
    routing = `Base Location: ${logistics.stationary.destination}.
    Task: Validate if this base is suitable for day trips in the region: ${logistics.stationary.region || 'Region'}.`;
  } else {
    geoMode = "ROUNDTRIP";
    routing = `Route: ${logistics.roundtrip.stops.map(s => s.location).join(' -> ')}.
    Region: ${logistics.roundtrip.region}.
    Task: Identify the best overnight stops (Hubs) along this route.`;
  }

  const contextData = {
    mode: geoMode,
    arrival_type: (userInputs.dates.arrival as any).type,
    routing_info: routing
  };

  const role = `Du bist der "Geo Analyst". Deine Aufgabe ist die strategische Bewertung von Standorten (Hubs).
  Du suchst NICHT nach konkreten Hotels, sondern nach den besten *Orten*, um zu übernachten.`;

  const instructions = `# AUFGABE
${routing}

# ZIEL
1.  Identifiziere strategische "Hubs" (Städte/Dörfer), die sich als Basis eignen.
2.  Bewerte die Lage hinsichtlich:
    * Erreichbarkeit (Verkehrsanbindung)
    * Infrastruktur (Restaurants, Supermärkte)
    * Touristische Attraktivität (Vibe)

# OUTPUT
Erstelle eine Liste von empfohlenen Hubs mit Begründung.`;

  const outputSchema = {
    "recommended_hubs": [
      {
        "hub_name": "String (Name der Stadt/Ort)",
        "suitability_score": "Integer (1-10)",
        "pros": ["String"],
        "cons": ["String"],
        "best_for": "String (z.B. 'Familien', 'Nightlife', 'Ruhe')"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "GEO-DATEN")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['planning'])
    .build();
};
// --- END OF FILE 65 Zeilen ---