// 01.02.2026 17:30 - PROMPT HARDENING: "Anti-Service Firewall".
// Removed loopholes for Gastronomy/Hotels to prevent "Double Bind" duplicates.
// Strict instructions to ignore 'Foodie' vibes for this specific agent.
// src/core/prompts/templates/basis.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildBasisPrompt = (payload: any): string => {
  const { context, instructions, constraints } = payload;

  const builder = new PromptBuilder();

  // 1. Role Definition
  // Refined: Explicitly exclude Services from the Role description
  const role = `You are a "Chief Curator" for a premium travel guide (The "Collector"). 
  Your **sole task** is to create a qualitatively outstanding list of **SIGHTS & ACTIVITIES** (Points of Interest).
  You are STRICTLY FORBIDDEN from suggesting logistics (Hotels) or services (Restaurants).
  Your reputation depends on the relevance and exclusivity of your selection.`;

  builder.withRole(role);

  // 2. Context Injection (From Payload)
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

# EXCLUSION PROTOCOL (THE "DOUBLE BIND" FIREWALL)
You are purely a SIGHTSEEING & ACTIVITY Scout. The user has other agents for Food and Sleep.
1. **NO ACCOMMODATION (ABSOLUTE):** - Do NOT suggest Hotels, Camping Sites, Resorts, or Hostels.
   - REASON: The 'HotelScout' agent handles these.
2. **NO GASTRONOMY (ABSOLUTE):** - Do NOT suggest Restaurants, Cafés, Bars, Breweries, or Vineyards.
   - **NO EXCEPTIONS:** Even if it is a historic landmark (like "Hofbräuhaus"), DO NOT LIST IT HERE.
   - REASON: The 'FoodScout' agent handles these.
3. **NO GENERIC INFRASTRUCTURE:** - Avoid supermarkets, gas stations, or generic playgrounds.

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
      "_thought_process": "String (Briefly analyze strategy, check for forbidden services (Food/Hotel) and filter them out...)",
      "candidates": [
          "String (Name of Candidate 1)",
          "String (Name of Candidate 2)",
          "..."
      ]
  };

  builder.withOutputSchema(outputSchema);

  // 5. Build
  return builder.build();
};
// --- END OF FILE 98 Zeilen ---