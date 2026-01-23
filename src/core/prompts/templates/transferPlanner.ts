// 23.01.2026 15:45 - FIX: Synchronized Schema with CoT Instruction (added _thought_process).
// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/transferPlanner.ts
// 19.01.2026 13:40 - FIX: Restored V30 Legacy Schema (German Keys) for TransferPlanner.
// 18.01.2026 14:35 - FIX: Added previousLocation argument to support Chunking-Awareness.
// 17.01.2026 15:35 - UPDATE: Added 'Stationary Mode' (Hub & Spoke) Logic.
// 18.01.2026 00:20 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildTransferPlannerPrompt = (project: TripProject, previousLocation: string = ''): string => {
  const { userInputs, data } = project;
  const { logistics } = userInputs;

  // Context for AI
  const placesList = Object.values(data.places || {}).flat().map((p: any) => ({
    id: p.id,
    name: p.name,
    geo: p.geo_koordinaten || p.geo || p.location, // Robustness
    base_location: logistics.mode === 'stationaer' ? logistics.stationary.destination : 'Varied'
  }));

  const contextData = {
    mode: logistics.mode,
    // If Stationary: The Base
    base: logistics.mode === 'stationaer' ? logistics.stationary.destination : null,
    // If Roundtrip: The Route
    stops: logistics.mode === 'mobil' ? logistics.roundtrip.stops : null,
    // Places to connect
    places_to_connect: placesList,
    // NEW: Where did planning stop last? (For Chunking)
    previous_chunk_end_location: previousLocation
  };

  const role = `You are the "Transfer Planner". Your task is to calculate logistic connections (transfers) between locations.
  You create **NO** daily schedule, but a pure "Distance Matrix" and route recommendations.`;

  // Instruction depends on mode
  let modeInstruction = "";
  if (logistics.mode === 'stationaer') {
    modeInstruction = `MODE: STATIONARY (Hub & Spoke).
    Calculate the drive time and distance from the base ("${logistics.stationary.destination}") for EVERY place.
    This is a Star-Topology (There & Back).`;
  } else {
    modeInstruction = `MODE: ROUNDTRIP (Moving Chain).
    Calculate distances between logically consecutive places (Cluster Logic).
    If a "previous_chunk_end_location" (${previousLocation}) is provided, you MUST start calculation from there!
    Try to group places into clusters to minimize drive time.`;
  }

  const instructions = `# TASK
${modeInstruction}

# CALCULATION RULES
1.  **Realism:** Use realistic average speeds (City 30km/h, Rural 70km/h, Highway 110km/h).
2.  **Buffer:** Always add 15-20% buffer to pure Google Maps time (parking search, traffic).
3.  **Transport:** Base it on user input: ${(userInputs.dates.arrival as any).type || 'car'}.

# OUTPUT SCHEMA
Create a list of transfer connections.`;

  // FIX: Schema converted to V40 English keys & CoT added
  const outputSchema = {
    "_thought_process": "String (Route analysis & logic check)",
    "transfers": [
      {
        "from_id": "String (ID or 'BASE')",
        "to_id": "String (ID)",
        "duration_minutes": "Integer",
        "distance_km": "Number",
        "transport_mode": "String (car, public, walk)",
        "notes": "String (e.g. 'Toll road' or 'Scenic route')"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "LOGISTICS DATA")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['planning']) 
    .build();
};
// --- END OF FILE 77 Zeilen ---