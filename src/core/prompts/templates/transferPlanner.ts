// 27.02.2026 14:15 - REFACTOR: Adapted signature to accept V40 Payload strictly separating data prep from logic.
// 27.02.2026 13:45 - FEAT: Integrated 'localMobility' reality check (ÖPNV/Mietwagen constraints).
// src/core/prompts/templates/transferPlanner.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildTransferPlannerPrompt = (payload: any): string => {
  const { context, meta } = payload;

  const role = `You are the "Transfer Planner". Your task is to calculate logistic connections (transfers) between locations.
  You create **NO** daily schedule, but a pure "Distance Matrix" and act as a REALITY CHECK for the chosen mobility.`;

  // Instruction depends on mode
  let modeInstruction = "";
  if (context.mode === 'stationaer') {
    modeInstruction = `MODE: STATIONARY (Hub & Spoke).
    Calculate the drive time and distance from the base ("${context.base}") for EVERY place.
    This is a Star-Topology (There & Back).`;
  } else {
    modeInstruction = `MODE: ROUNDTRIP (Moving Chain).
    Calculate distances between logically consecutive places (Cluster Logic) based on the provided itinerary_days.
    Try to group places into clusters to minimize drive time.`;
  }

  const instructions = `# TASK
${modeInstruction}

# LOCAL MOBILITY REALITY CHECK (CRITICAL)
The user has specified their local mobility as: "${context.local_mobility || 'car'}".
You MUST verify if the planned transfers are realistic with this mode of transport.
- If "public_transport" or "bicycle" is selected but a location is unreachable (e.g. remote beach, mountain trail), YOU MUST FLAG THIS! Suggest alternatives (like taking a Taxi, Uber, or renting a car for a day) and estimate the costs (e.g., "Taxi approx. 30 €").
- If "car" or "camper" is selected and the activity is a one-way hike (Streckenwanderung), point out the "parking trap" (how to get back to the vehicle).

# CALCULATION RULES
1.  **Realism:** Use realistic average speeds (City 30km/h, Rural 70km/h, Highway 110km/h).
2.  **Buffer:** Always add 15-20% buffer to pure Google Maps time (parking search, traffic).
3.  **Transport:** Base it strictly on the user's local mobility ("${context.local_mobility || 'car'}").

${meta.feedbackSection || ''}

# OUTPUT SCHEMA
Create a list of transfer connections. If a connection is problematic based on the local mobility, provide a warning.`;

  const outputSchema = {
    "_thought_process": "String (Route analysis, local mobility reality check & logic check)",
    "transfers": [
      {
        "from_id": "String (ID or 'BASE')",
        "to_id": "String (ID)",
        "duration_minutes": "Integer",
        "distance_km": "Number",
        "transport_mode": "String (car, public, walk, taxi, etc.)",
        "notes": "String (e.g. 'Toll road' or 'Scenic route')",
        "reality_check_warning": "String or null (If unreachable with chosen mobility, explain why, suggest alternative like Taxi/Rental Car, and estimate costs. If car/camper: warn about parking traps for one-way hikes.)"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "LOGISTICS DATA")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['planning']) 
    .build();
};
// --- END OF FILE 62 Zeilen ---