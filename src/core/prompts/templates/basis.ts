// 24.01.2026 16:30 - FIX: PromptBuilder API compliance (zero-arg constructor, fluent 'with' methods).
// src/core/prompts/templates/basis.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildBasisPrompt = (payload: any): string => {
  const { context, instructions, constraints } = payload;

  // FIX: Constructor takes no arguments
  const builder = new PromptBuilder();

  // FIX: Use 'withContext' instead of 'setContext'. Added Role here.
  builder.withContext(`
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

  // FIX: Use 'withInstruction' instead of 'setInstruction'.
  // Merged Output Format here to ensure build safety.
  builder.withInstruction(`
${instructions.creative_briefing}

# TASK
Find exactly ${constraints.target_count} candidates that perfectly fit the strategy and geo-corridor above.
Ensure a mix of famous landmarks and hidden gems if the strategy allows.

# OUTPUT FORMAT
Return ONLY a valid JSON array of strings containing the names of the places.
Example: ["Place A", "Place B", "Place C"]
  `);

  return builder.build();
};
// --- END OF FILE 45 Zeilen ---