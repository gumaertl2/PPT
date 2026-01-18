// 19.01.2026 13:40 - FIX: Restored V30 Legacy Schema (German Keys) for TransferPlanner.
// src/core/prompts/templates/transferPlanner.ts
// 18.01.2026 14:35 - FIX: Added previousLocation argument to support Chunking-Awareness (Fixes TS2345).
// 17.01.2026 15:35 - UPDATE: Added 'Stationary Mode' (Hub & Spoke) Logic.
// 18.01.2026 00:20 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildTransferPlannerPrompt = (project: TripProject, previousLocation: string = ''): string => {
  const { userInputs, data } = project;
  const { logistics } = userInputs;

  // Kontext für die KI
  const placesList = Object.values(data.places || {}).flat().map((p: any) => ({
    id: p.id,
    name: p.name,
    geo: p.geo_koordinaten || p.geo, // Robustheit
    base_location: logistics.mode === 'stationaer' ? logistics.stationary.destination : 'Variiert'
  }));

  const contextData = {
    mode: logistics.mode,
    // Falls Stationär: Die Basis
    base: logistics.mode === 'stationaer' ? logistics.stationary.destination : null,
    // Falls Rundreise: Die Route
    stops: logistics.mode === 'mobil' ? logistics.roundtrip.stops : null,
    // Die Orte, die wir verbinden müssen
    places_to_connect: placesList,
    // NEU: Wo hat die Planung zuletzt aufgehört? (Für Chunking)
    previous_chunk_end_location: previousLocation
  };

  const role = `Du bist der "Transfer Planner". Deine Aufgabe ist es, logistische Verbindungen (Transfers) zwischen Orten zu berechnen.
  Du erstellst KEINEN Tagesplan, sondern eine reine "Distanz-Matrix" und Wege-Empfehlungen.`;

  // Anweisung abhängig vom Modus
  let modeInstruction = "";
  if (logistics.mode === 'stationaer') {
    modeInstruction = `MODE: STATIONARY (Hub & Spoke).
    Berechne für JEDEN Ort die Fahrzeit und Distanz von der Basis ("${logistics.stationary.destination}").
    Das ist eine Stern-Topologie (Hin & Zurück).`;
  } else {
    modeInstruction = `MODE: ROUNDTRIP (Moving Chain).
    Berechne die Distanzen zwischen den logisch aufeinanderfolgenden Orten (Cluster-Logik).
    Falls ein "previous_chunk_end_location" (${previousLocation}) angegeben ist, starte die Berechnung zwingend von dort!
    Versuche, Orte zu Clustern zusammenzufassen, um Fahrzeit zu minimieren.`;
  }

  const instructions = `# AUFGABE
${modeInstruction}

# BERECHNUNGS-REGELN
1.  **Realismus:** Nutze realistische Durchschnittsgeschwindigkeiten (Stadt 30km/h, Land 70km/h, Autobahn 110km/h).
2.  **Puffer:** Schlage immer 15-20% Puffer auf die reine Google-Maps-Zeit auf (Parkplatzsuche, Verkehr).
3.  **Transportmittel:** Gehe vom User-Input aus: ${(userInputs.dates.arrival as any).type || 'car'}.

# OUTPUT-SCHEMA
Erstelle eine Liste von Transfer-Verbindungen.`;

  // FIX: Schema converted to German V30 keys
  const outputSchema = {
    "transfers": [
      {
        "from_id": "String (ID oder 'BASE')",
        "to_id": "String (ID)",
        "dauer_minuten": "Integer",
        "distanz_km": "Number",
        "transport_art": "String (car, public, walk)",
        "hinweise": "String (z.B. 'Mautpflichtig' oder 'Schöne Panoramastraße')"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "LOGISTIK-DATEN")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['planning']) // Hier ist Planung wichtig
    .build();
};
// --- END OF FILE 76 Zeilen ---