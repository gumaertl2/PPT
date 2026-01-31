// 03.02.2026 15:35 - FIX: Smart Link Generation & Strict Source Enforcement.
// - Forces AI to cite sources (The Law).
// - Generates clickable verification URLs for sources.
// src/core/prompts/templates/foodScout.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildFoodScoutPrompt = (payload: any): string => {
  const { context, userInputs } = payload;
  
  const locationName = context.location_name || "Target Region";
  const searchRadius = "50km"; 
  const targetCountry = context.target_country || "the region";

  const foodInterests = (userInputs?.selectedInterests || [])
    .filter((id: string) => ['food', 'restaurants', 'wine', 'fine_dining', 'local_food'].includes(id));
    
  const specificCuisines = foodInterests.length > 0 
    ? `Focus on these vibes: ${foodInterests.join(', ')}` 
    : "Search broadly for high-quality local cuisine.";

  // LOGIC SWITCH: Strict List vs. Dynamic Research
  const hasStrictGuides = Array.isArray(context.guides_list) && context.guides_list.length > 0;
  
  let sourceInstruction = "";
  let opMode = "";

  if (hasStrictGuides) {
      // SCENARIO A: Strict List (e.g. Sri Lanka with Yamu/Pulse)
      opMode = "STRICT FILTERING";
      sourceInstruction = `# PHASE 1: STRICT SOURCE ENFORCEMENT (GATEKEEPER)
You are restricted to these official guides/lists:
👉 **${context.guides_list.join(', ')}**

⛔️ **FORBIDDEN:**
- Do NOT suggest "Local Insider Tips" unless they appear in the specific lists above.
- If a restaurant is NOT in one of these guides, **DISCARD IT**.`;
  } else {
      // SCENARIO B: Unknown Country / Dynamic Mode -> SELF-HEALING
      opMode = "ADAPTIVE RESEARCH";
      sourceInstruction = `# PHASE 1: DYNAMIC RESEARCH (SELF-HEALING)
We have no pre-configured guides for **${targetCountry}**.
1. **Analyze:** Identify the 3-5 most respected restaurant sources for ${targetCountry} (e.g. major local food blogs, expat magazines, or specific TripAdvisor awards).
2. **Define:** List these sources in your "_thought_process".
3. **Apply:** Only select restaurants that are featured in these identified sources.
4. **Cite:** Write the name of the source in the 'guides' field.`;
  }

  // 1. ROLE
  const role = `You are the **Strategic Culinary Sourcing Agent** ("The Food-Scanner").
  Your operation mode is **${opMode}**.
  Your goal is to create a massive "Longlist" of candidates.`;

  const mainInstruction = `${sourceInstruction}

# PHASE 2: EXHAUSTIVE SCANNING PROTOCOL (NO LIMITS)
Target: **${locationName}** (Radius: ~${searchRadius})
1. **NO ARTIFICIAL LIMITS:** Do NOT stop at 10 results. Return as many valid hits as possible.
2. **NO PRE-FILTERING:** Do not check opening hours yet.
3. **REGIONAL SCOPE:** Scan the city center AND the surrounding area.

# PHASE 3: DATA INTEGRITY & ATTRIBUTION (ZERO TOLERANCE)
1. **Real Names Only:** Verify the name.
2. **Coordinates (CRITICAL):** You MUST provide Lat/Lng.
3. **SOURCE CITATION (THE LAW):** - You MUST fill the 'guides' array with the specific source name (e.g. "Yamu", "Michelin", "TripAdvisor Travelers' Choice").
   - **IF YOU CANNOT CITE A SOURCE, DO NOT OUTPUT THE CANDIDATE.**
   - "I know this place" is NOT a valid source.

# PHASE 4: SMART LINK GENERATION (VERIFICATION URLS)
You MUST construct a verification URL for the 'source_url' field based on the source:
- If source is **'Michelin'**: \`https://guide.michelin.com/en/search?q={Name}\`
- If source is **'TripAdvisor'**: \`https://www.tripadvisor.com/Search?q={Name}\`
- If source is **'Gault&Millau'**: \`https://www.gaultmillau.com/search?q={Name}\`
- **Default/Other**: \`https://www.google.com/search?q={Name}+{City}+Restaurant\`
*Replace {Name} and {City} with the actual values.*

${specificCuisines}`;

  const outputSchema = {
    "_thought_process": "String (Strategy & Source Definition)",
    "resolved_search_locations": ["String (List of REAL city names you are scanning)"],
    "candidates": [
      {
        "name": "String (Official Name)",
        "city": "String",
        "address": "String (Full Address)",
        "location": { "lat": "Number", "lng": "Number" },
        "guides": ["String (Source Name)"],
        "source_url": "String (Smart Verification Link)"
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