// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/foodEnricher.ts
// 19.01.2026 13:30 - FIX: Restored V30 Legacy Schema (German Keys) for Consistency with FoodScout.
// 16.01.2026 20:00 - FEAT: Added 'Menu & Vibe' Analysis.
// 18.01.2026 00:35 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildFoodEnricherPrompt = (
    project: TripProject,
    candidates: any[]
): string => {
  // 1. STRATEGIC BRIEFING
  const chefPlaner = project.analysis.chefPlaner;
  const strategicBriefing = (chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                            (chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                            "";
  
  const role = `You are a culinary data enricher. Your task is to find details for a list of restaurant names.`;

  const contextData = {
    candidates_to_enrich: candidates
  };

  const instructions = `# TASK
Research each candidate live on the web.

# DATA REQUIREMENTS
1.  **Address:** Must be exact and navigable.
2.  **Cuisine:** What is served? (e.g. "Modern Italian", "Traditional Bavarian").
3.  **Vibe:** Describe the atmosphere in 3-4 words (e.g. "Romantic, Candlelight").
4.  **Signature Dish:** Name 1-2 specialties if available.
5.  **Price:** €, €€ or €€€.

# FALLBACK
If a restaurant is not found, mark it as "found": false. Do not invent anything.`;

  // FIX: Schema converted to V40 English keys
  const outputSchema = {
    "enriched_candidates": [
      {
        "original_name": "String",
        "found": "Boolean",
        "address": "String",
        "cuisine": "String",
        "vibe": ["String"],
        "signature_dish": "String",
        "price_level": "String",
        "website": "String"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "INPUT LIST")
    .withContext(strategicBriefing, "STRATEGIC GUIDELINE")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'research'])
    .build();
};
// --- END OF FILE 65 Zeilen ---