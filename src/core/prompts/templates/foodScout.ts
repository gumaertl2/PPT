// 05.02.2026 17:00 - FIX: TEMPLATE LOBOTOMY (PURE DYNAMIC MODE).
// - REMOVED all hardcoded strategies ("Concentric Circles", "Zones").
// - The Template is now a dumb container for the Preparer's logic.
// - Fixed logic switch for guide strings.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { FoodSearchPayload } from '../../types';

export const buildFoodScoutPrompt = (payload: FoodSearchPayload): string => {
  const { context, instructions, userInputs } = payload;
  
  const locationName = context.location_name || "Target Region";
  // FIX: Smart Radius Logic (Use input or default to 20km)
  const searchRadius = context.search_area?.match(/Radius: (\d+)km/)?.[1] ? `${context.search_area.match(/Radius: (\d+)km/)[1]}km` : "20km";
  
  const foodInterests = (userInputs?.selectedInterests || [])
    .filter((id: string) => ['food', 'restaurants', 'wine', 'fine_dining', 'local_food'].includes(id));
    
  const specificCuisines = foodInterests.length > 0 
    ? `Focus on these vibes: ${foodInterests.join(', ')}` 
    : "Search broadly for high-quality local cuisine.";

  // LOGIC SWITCH: Strict List Only
  const guidesList = context.guides_list || [];
  const guidesString = guidesList.length > 0 ? guidesList.join(', ') : "Premium Guides";

  // 1. ROLE (DYNAMIC ONLY)
  // We explicitly take the role from instructions to allow full control via Preparer.
  const role = instructions.role || "You are a strict Data Verification Agent.";

  const mainInstruction = `# STRATEGY & EXECUTION
  ${instructions.strategy}
  
  # CONTEXT & ANCHORS
  Target Location: ${locationName}
  Allowed Guides: [${guidesString}]
  Target Country: ${context.target_country}

  # PHASE 1: KNOWLEDGE INTEGRATION
  We have injected "Knowledge Anchors" for you. Use them to verify plausibility!
  ANCHORS:
  ${context.guide_anchors || "No anchors available."}

  # PHASE 2: DATA INTEGRITY PROTOCOL (ANTI-HALLUCINATION)
  1. **Address Match:** If you list a restaurant for "Dachau", the address MUST contain "Dachau". If the address is "München", DELETE IT.
  2. **Real Names Only:** Do not merge names (e.g. do not invent "EssZimmer im Freiraum" if only "Freiraum" exists).
  3. **Coordinates:** Provide Lat/Lng if known (high confidence), otherwise set to null.
  4. **SOURCE CITATION:** - If you are SURE: Fill 'guides' with the specific source name.
     - If you are UNSURE: Leave 'guides' empty [] and set confidence <= 60.

  # PHASE 3: SMART LINK GENERATION
  - **Strategy:** Construct a Google Search URL:
    \`https://www.google.com/search?q={GuideName}+{RestaurantName}+{City}\`
  
  ${specificCuisines}`;

  const outputSchema = {
    "_thought_process": "String (Analyze the town list. Confirm Address-City-Matches.)",
    "resolved_search_locations": ["String (List of cities/towns scanned)"],
    "candidates": [
      {
        "name": "String (Official Name)",
        "city": "String",
        "address": "String (Full Address or 'Unknown')",
        "location": { "lat": "Number OR null", "lng": "Number OR null" },
        "guides": ["String (Source Name OR empty)"],
        "source_url": "String (Constructed Verification Link)",
        "confidence": "Integer (0-100)",
        "verification_status": "String ('verified_memory' | 'ai_estimate' | 'unknown')",
        "description": "String (Short reasoning, max 10 words)"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "SCANNER CONTEXT")
    .withInstruction(mainInstruction)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['hallucination_check', 'address_match_check'])
    .build();
};
// --- END OF FILE 68 Zeilen ---