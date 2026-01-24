// 24.01.2026 18:50 - FIX: Restored Strict Protocols & Preparer Integration.
// Merges dynamic data from 'prepareBasisPayload' with hard-coded EXCLUSION rules.
// src/core/prompts/templates/basis.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildBasisPrompt = (payload: any): string => {
  const { context, instructions, constraints } = payload;

  const builder = new PromptBuilder();

  // 1. Role Definition
  const role = `You are a "Chief Curator" for a premium travel guide (The "Collector"). Your reputation depends on the excellence and relevance of your selection. 
  Your **sole task** is to create a qualitatively outstanding and suitable list of **NAMES** for sights and activities based on the user's interests.
  You do NOT write descriptions. You ONLY collect the best candidates.`;

  builder.withRole(role);

  // 2. Context Injection (From Payload)
  // We use the data prepared by 'prepareBasisPayload.ts'
  const contextData = {
      travel_season: context.travel_season,
      transport_mode_context: context.transport_mode_context,
      user_supplements: context.user_supplements,
      already_known_places_block: context.already_known_places_block,
      mandatory_appointments: context.mandatory_appointments,
      no_gos: context.no_gos
  };

  builder.withContext(contextData, "DATA BASIS & CONSTRAINTS");

  // 3. Instructions (Merging Dynamic Briefing with Static Protocols)
  const promptInstructions = `# LOGISTICS & GEO CONTEXT (MANDATORY)
${instructions.search_radius}

# ARCHITECT'S STRATEGY
"${instructions.architect_strategy}"

# MISSION 1: THE IMMUTABLE FIXTURES
- Integrate **all** "mandatory_appointments" from the context.
- Use their exact \`official_name\`.

# MISSION 2: THE CURATED SELECTION (CORE TASK)
${instructions.creative_briefing}

For each Topic above:
1. Understand the "STRATEGY".
2. Find 3-5 concrete, high-quality candidates that match this strategy.
3. Ensure the place is open/accessible in ${context.travel_season}.

# MISSION 3: FILL THE REST
- If the curated selection doesn't reach the target count, fill the rest with absolute "Must-Sees" for the region.

# EXCLUSION PROTOCOL (STRICT)
You are purely a SIGHTSEEING & ACTIVITY Scout.
1. **NO ACCOMMODATION:** Do NOT suggest Hotels, Camping Sites, or Resorts. (Handled by HotelScout).
2. **NO GASTRONOMY:** Do NOT suggest Restaurants, Cafés, or Bars unless they are historic landmarks (e.g., "Hofbräuhaus"). (Handled by FoodScout).
3. **NO GENERIC INFRASTRUCTURE:** Avoid supermarkets, gas stations, or generic playgrounds.

# RULES
1. **Deduplication:** NO names from "already_known_places_block".
2. **Quantity:** Exactly **${constraints.target_count} suggestions**.
3. **No-Gos:** Strictly avoid "${context.no_gos}".
4. **Names:** Output precise, official names (e.g., "Eiffelturm" instead of "Tower in Paris").
5. **Route:** Strictly adhere to the defined route corridor (if Roundtrip).

# SYSTEM SECURITY PROTOCOL
1. **JSON INTEGRITY:** Output must be valid JSON.
2. **SILENCE PROTOCOL:** NO text before JSON. NO preamble.
3. **LANGUAGE LOCKDOWN:** All content candidates MUST be in the requested target language (German).
4. **NO HALLUCINATIONS:** Only suggest real places.`;

  builder.withInstruction(promptInstructions);

  // 4. Output Schema (Thinking-Safe)
  const outputSchema = {
      "_thought_process": "String (Briefly analyze strategy, seasonality, and exclusion rules...)",
      "candidates": [
          "String (Name of Candidate 1)",
          "String (Name of Candidate 2)",
          "..."
      ]
  };

  // We do NOT call .withOutputSchema() here because we want to enforce the specific structure via JSON object,
  // but since we are using PromptBuilder, let's use the method to ensure consistency.
  // Wait, previous instructions said to put schema in instruction text for maximum safety with Flash.
  // However, PromptBuilder handles this. Let's use the explicit method for clarity.
  builder.withOutputSchema(outputSchema);

  // 5. Build
  return builder.build();
};
// --- END OF FILE 90 Zeilen ---