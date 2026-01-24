// 24.01.2026 14:50 - REFACTOR: Lean Basis Template (Sammler). 
// Consumes pre-processed payload from 'prepareBasisPayload'. 
// Focuses on high-precision candidate sourcing without internal logic overhead.
// src/core/prompts/templates/basis.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildBasisPrompt = (payload: any): string => {
  const { context, instructions, constraints } = payload;

  // We use the PromptBuilder to wrap our instructions in the System OS and Safety Guards.
  const builder = new PromptBuilder('Basis / Sammler');

  builder.setContext(`
# ROLE
You are the 'Local Scout' (Sammler). Your task is to find a high-quality list of specific place names (candidates) for a trip.

# TRAVEL CONTEXT
- Season: ${context.travel_season}
- Transport Context: ${context.transport_mode_context}
- User Supplements: ${context.user_supplements}
- No-Go's: ${context.no_gos}

# GEOGRAPHIC SEARCH STRATEGY (PRIORITY 1)
${instructions.search_radius}

# STRATEGIC BRIEFING (FROM CHEFPLANER)
${instructions.architect_strategy}

# ALREADY KNOWN PLACES
Do not suggest these again: ${context.already_known_places_block.join(', ')}
  `);

  builder.setInstruction(`
${instructions.creative_briefing}

# TASK
Find exactly ${constraints.target_count} candidates that perfectly fit the strategy and geo-corridor above.
Ensure a mix of famous landmarks and hidden gems if the strategy allows.
  `);

  builder.setOutputFormat(`
Return ONLY a valid JSON array of strings containing the names of the places.
Example: ["Place A", "Place B", "Place C"]
  `);

  return builder.build();
};
// --- END OF FILE 48 Zeilen ---