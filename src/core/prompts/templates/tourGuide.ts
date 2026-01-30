// 02.02.2026 11:00 - FIX: RESTORED ORIGINAL LOGIC (Spatial Clustering).
// Reverted from "Calendar Schedule" back to "Geo-Tours" (suggested_order_ids).
// Essential for Roundtrips to group sights by City/Hub.
// src/core/prompts/templates/tourGuide.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildTourGuidePrompt = (payload: any): string => {
  // 1. Unpack Payload (Standard V40 Pattern)
  const { context, instructions } = payload;
  
  // Data Preparation: Handle both 'sights' (Old) and 'sights_list' (New Preparer) keys
  const rawSights = context.sights || context.sights_list || [];
  
  const sightsData = Array.isArray(rawSights) 
    ? rawSights.map((s: any) => `- [ID: ${s.id}] ${s.name} (${s.category || 'General'}) @ ${s.location?.lat || '?'},${s.location?.lng || '?'}`).join('\n')
    : "No sights provided.";

  // 2. ROLE (Restored from your working version)
  const role = instructions?.role || `You are an experienced Travel Guide Author and Geographic Analyst. 
  Your strength is transforming a loose collection of places into compelling and logical "Exploration Tours".
  You create **NO** time schedule, but a purely spatial structure (Clusters).`;

  // 3. INSTRUCTIONS
  const promptInstructions = `# DATA BASIS (SIGHTS POOL)
${sightsData}

# WORK STEPS
1. **Geo-Analysis:** Analyze the Latitude/Longitude of all places.
2. **Clustering (CRITICAL for Roundtrips):** - Group places that are geographically close (e.g. same city or neighborhood).
   - If this is a Roundtrip, create ONE Tour per City/Stop (e.g. "Tour Colombo", "Tour Galle").
3. **Sequencing:** Arrange the sights **within each cluster** in a logical walking/driving order to minimize zigzagging.
4. **Naming:** Give each cluster a creative title (e.g. "Tour 1: The Historic Fort").

# MANDATORY RULES
- **Rule 1 (Completeness):** EVERY sight from the input list MUST appear in exactly ONE tour.
- **Rule 2 (No Timing):** Do NOT add times. We need a spatial sequence.
- **Rule 3 (ID Integrity):** Use the exact \`id\` values from the input list for the \`suggested_order_ids\`.

# OUTPUT SCHEMA
Return a SINGLE valid JSON object.`;

  // 4. SCHEMA (Restored exactly to match ResultProcessor expectation)
  const outputSchema = {
    "_thought_process": "String (Geo-Analysis & Clustering Strategy)",
    "guide": {
      "title": "String (e.g. 'Sri Lanka Explorer Guide')",
      "intro": "String (Short, inviting introduction)",
      "tours": [
        {
          "tour_title": "String (e.g. 'Colombo: Colonial Charms')",
          "tour_description": "String (2-3 sentences about this specific area/city)",
          "suggested_order_ids": ["String (CRITICAL: The exact ID of the sight from input)"]
        }
      ]
    }
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "TRIP CONTEXT")
    .withInstruction(promptInstructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['planning'])
    .build();
};
// --- END OF FILE 65 Zeilen ---