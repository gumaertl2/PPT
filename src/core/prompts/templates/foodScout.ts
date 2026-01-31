// 04.02.2026 09:00 - FIX: V30 STRATEGY REBORN & ROBUST LINKS.
// - Implements "Concentric Quality Circles" (Smart Radius) from V30.
// - Enforces Strict Guide compliance (No Local Heroes).
// - Uses "Google Proxy" links (Phase 4) because AI lacks live browsing capabilities.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodScoutPrompt = (payload: any): string => {
  const { context, userInputs } = payload;
  
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

  // 1. ROLE & STRATEGY (V30 Logic adapted for V40 Strictness)
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
  
  # PHASE 2: SCANNING PROTOCOL (EXHAUSTIVE)
  For each candidate, you MUST verify:
  1. Is it physically existing?
  2. Is it currently listed in at least one of the allowed_guides? (TripAdvisor/Google Reviews do NOT count as guides).
  3. **Strict Location Check:** Does it fall within Zone A or Zone B?
  
  # PHASE 3: DATA INTEGRITY & ATTRIBUTION
  1. **Real Names Only:** Verify the name.
  2. **Coordinates (CRITICAL):** You MUST provide Lat/Lng.
  3. **SOURCE CITATION (THE LAW):** - You MUST fill the 'guides' array with the specific source name.
     - **IF YOU CANNOT CITE A SOURCE, DO NOT OUTPUT THE CANDIDATE.**

  # PHASE 4: SMART LINK GENERATION (GOOGLE PROXY)
  Since you cannot browse live, you MUST construct a Google Search URL to let the user verify the guide entry.
  - If source is **'Michelin'**: \`https://www.google.com/search?q=site:guide.michelin.com+{Name}+{City}\`
  - If source is **'Gault&Millau'**: \`https://www.google.com/search?q=Gault%26Millau+{Name}+{City}\`
  - If source is **'Feinschmecker'**: \`https://www.google.com/search?q=Feinschmecker+{Name}+{City}\`
  - If source is **'Varta'**: \`https://www.google.com/search?q=Varta+Guide+{Name}+{City}\`
  - If source is **'Falstaff'**: \`https://www.google.com/search?q=site:falstaff.com+{Name}+{City}\`
  - **Default (Global)**: \`https://www.google.com/search?q={Name}+{City}+Restaurant\`
  *Replace {Name} and {City} with the actual values.*

  ${specificCuisines}`;

  const outputSchema = {
    "_thought_process": "String (Analyze Zone A vs Zone B coverage. Confirm Guide Check.)",
    "resolved_search_locations": ["String (List of cities scanned)"],
    "candidates": [
      {
        "name": "String (Official Name)",
        "city": "String",
        "address": "String (Full Address)",
        "location": { "lat": "Number", "lng": "Number" },
        "guides": ["String (Source Name - MUST be from allowed list)"],
        "source_url": "String (Google Search Verification Link)"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "SCANNER CONTEXT")
    .withInstruction(mainInstruction)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['research'])
    .build();
};
// Lines: 104