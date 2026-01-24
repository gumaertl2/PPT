// 24.01.2026 17:15 - FIX: RESTORED '_thought_process' field.
// Reverting accidental "simplification" that caused JSON crashes with Thinking models.
// src/core/prompts/templates/basis.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildBasisPrompt = (payload: any): string => {
  const { context, instructions, constraints } = payload;

  const builder = new PromptBuilder();

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

  builder.withInstruction(`
${instructions.creative_briefing}

# TASK
Find exactly ${constraints.target_count} candidates that perfectly fit the strategy and geo-corridor above.
Ensure a mix of famous landmarks and hidden gems if the strategy allows.

# OUTPUT FORMAT
Return a SINGLE valid JSON object with a "_thought_process" field and a "candidates" array.
Structure:
{
  "_thought_process": "Briefly analyze the strategy and location constraints here...",
  "candidates": [
    "Place Name A",
    "Place Name B",
    "Place Name C"
  ]
}
  `);

  return builder.build();
};
// --- END OF FILE 52 Zeilen ---