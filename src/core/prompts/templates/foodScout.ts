// 04.02.2026 15:00 - FIX: HYBRID STRATEGY (V30 LOGIC + V40.5 KNOWLEDGE).
// - RESTORED: "Concentric Quality Circles" (Zone A/B) for smart radius.
// - RESTORED: "Google Proxy Links" but upgraded with dynamic 'guide_anchors'.
// - KEPT: "Honesty Protocol" (confidence, verification_status) to prevent hallucinations.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';
import type { FoodSearchPayload } from '../../types';

export const buildFoodScoutPrompt = (payload: FoodSearchPayload): string => {
  const { context, instructions, userInputs } = payload;
  
  const locationName = context.location_name || "Target Region";
  // FIX: Smart Radius Logic (Use input or default to 20km)
  const searchRadius = context.search_area?.match(/Radius: (\d+)km/)?.[1] ? `${context.search_area.match(/Radius: (\d+)km/)[1]}km` : "20km";
  const radiusVal = parseInt(searchRadius) || 20;

  const foodInterests = (userInputs?.selectedInterests || [])
    .filter((id: string) => ['food', 'restaurants', 'wine', 'fine_dining', 'local_food'].includes(id));
    
  const specificCuisines = foodInterests.length > 0 
    ? `Focus on these vibes: ${foodInterests.join(', ')}` 
    : "Search broadly for high-quality local cuisine.";

  // LOGIC SWITCH: Strict List Only
  const guidesList = context.guides_list || [];
  const guidesString = guidesList.length > 0 ? guidesList.join(', ') : "Premium Guides (Michelin, Gault&Millau, Feinschmecker, Varta)";

  // 1. ROLE & STRATEGY (Restored V30 Logic)
  const role = `You are the **Strategic Culinary Sourcing Agent**.
  
  # YOUR STRATEGY: "CONCENTRIC QUALITY CIRCLES" (Smart Radius)
  You understand that a user prefers a "Bib Gourmand" in 5km over a "3-Star" in 50km, but prefers a "Star" in 20km over a "No-Name" next door.
  
  1. **Zone A (Immediate Vicinity, 0-10km):** - Scan for ANY restaurant listed in the allowed guides.
     - Priority: Authentic, Bib Gourmand, Slow Food.
  
  2. **Zone B (Expanded Radius, 10-${radiusVal + 10}km):** - Scan PRIMARILY for "Highlights" (Stars, high Points/Hauben).
     - ONLY accept solid guide entries if Zone A yielded few results.
  
  ⛔️ **THE IRON RULE (NO LOCAL HEROES):**
  - You are FORBIDDEN from suggesting "Local Heroes", "Hidden Gems", or "User Favorites" that are **NOT listed** in one of the provided guides.
  - If a restaurant is not in [${guidesString}], it does NOT exist for you.`;

  const mainInstruction = `# PHASE 1: SOURCE CHECK
  allowed_guides: [${guidesString}]
  target_location: ${locationName} (~${searchRadius})
  target_country: ${context.target_country}
  
  # PHASE 2: SCANNING PROTOCOL (HONESTY FIRST)
  For each candidate, you must ESTIMATE the likelihood of existence and listing.
  1. **Existence:** Is it likely physically existing?
  2. **Guide Check:** Is it *plausibly* listed in allowed_guides?
  3. **Strict Location Check:** Does it fall within Zone A or Zone B?
  
  # PHASE 3: KNOWLEDGE INTEGRATION
  We have injected "Knowledge Anchors" for you. Use them!
  ANCHORS:
  ${context.guide_anchors || "No anchors available."}

  # PHASE 4: DATA INTEGRITY & ATTRIBUTION
  1. **Real Names Only:** Verify the name.
  2. **Coordinates:** Provide Lat/Lng if known (high confidence), otherwise set to null.
  3. **SOURCE CITATION (THE LAW):** - You MUST fill the 'guides' array with the specific source name.
     - **IF YOU CANNOT CITE A SOURCE, DO NOT OUTPUT THE CANDIDATE.**

  # PHASE 5: SMART LINK GENERATION (HYBRID)
  You cannot browse live, but you can construct smart verification links using the ANCHORS.
  
  - **Strategy A (Direct Anchor):** If an anchor provides a direct search URL (e.g. guide.michelin.com/.../restaurants), append the city or name if the URL structure allows it.
  - **Strategy B (Google Proxy):** If no specific anchor helps, construct a Google Search URL:
    \`https://www.google.com/search?q={GuideName}+{RestaurantName}+{City}\`
  
  ${specificCuisines}`;

  const outputSchema = {
    "_thought_process": "String (Analyze Zone A vs Zone B coverage. Confirm Guide Check.)",
    "resolved_search_locations": ["String (List of cities scanned)"],
    "candidates": [
      {
        "name": "String (Official Name)",
        "city": "String",
        "address": "String (Full Address or 'Unknown')",
        "location": { "lat": "Number OR null", "lng": "Number OR null" },
        "guides": ["String (Source Name - MUST be from allowed list)"],
        "source_url": "String (Constructed Verification Link)",
        "confidence": "Integer (0-100)",
        "verification_status": "String ('verified_memory' OR 'ai_estimate')",
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
    .withSelfCheck(['research', 'hallucination_check'])
    .build();
};
// --- END OF FILE 108 Zeilen ---