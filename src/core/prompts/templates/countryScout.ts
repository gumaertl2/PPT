// 03.02.2026 10:20 - FIX: TS2322 Resolved.
// Replaced invalid SelfCheck 'consistency' with valid 'basic'.
// src/core/prompts/templates/countryScout.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildCountryScoutPrompt = (payload: any): string => {
  // 1. Analyze Payload
  // Supports direct { country: "Sri Lanka" } or full context payload
  const context = payload.context || {};
  const targetCountry = context.target_country || context.country || payload.country || "Unknown Country";

  // 2. ROLE
  const role = `You are a Senior Gastronomy Analyst and Research Specialist.
Your task is to identify the **most authoritative and currently active** restaurant guides for a specific country.
You bridge the gap between global standards (Michelin) and local expertise.`;

  // 3. INSTRUCTIONS
  const instructions = `# MISSION
Research the best sources for restaurant recommendations in: **${targetCountry}**.

# RESEARCH STRATEGY (PRIORITY CHAIN)
1.  **Global Gold Standard:** Does the **Michelin Guide** or **Gault&Millau** cover this country? (Be precise: specific cities or whole country?)
2.  **Regional Giants:** Are there major regional lists? (e.g. "Asia's 50 Best", "Latin America's 50 Best").
3.  **The "Local Heroes" (CRITICAL):** If global guides are missing, find the most respected **local** equivalents.
    * Examples: "Yamu" (Sri Lanka), "Wongnai" (Thailand), "Tabelog" (Japan), "Zomato" (India - strictly curated lists only).
    * *Criteria:* Must be editorially curated or have high trust (not just mass junk data).

# EXCLUSION LIST
- Do NOT list "Google Maps" (too generic).
- Do NOT list "TripAdvisor" unless there is a specific "Travelers' Choice" award relevance for this region.
- Do NOT list defunct/dead blogs.

# OUTPUT GOAL
Provide a clean JSON list of guide names that I can feed into a search bot.`;

  // 4. SCHEMA
  const outputSchema = {
    "_thought_process": "String (Analysis of the culinary landscape in this country)",
    "country_profile": {
        "official_name": "String (e.g. 'Socialist Republic of Vietnam')",
        "culinary_status": "String (Short summary, e.g. 'Emerging Foodie Destination, no Michelin yet')"
    },
    "recommended_guides": [
      "String (Exact Name of the Guide, e.g. 'YAMU.lk', 'Asia's 50 Best')"
    ],
    "source_urls": ["String (Links to the guide main pages for verification)"]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext({ targetCountry }, "TARGET PARAMETER")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    // FIX: TS2322 - 'consistency' is not valid in PromptBuilder types, changed to 'basic'
    .withSelfCheck(['research', 'basic'])
    .build();
};
// --- END OF FILE 65 Zeilen ---