// 01.02.2026 19:50 - MERGE: Combined V40 Payload Pattern with User's Detailed Logic.
// Restored strict 'Granularity Rules' and 'Logistics Checks'.
// Fixed: Consumes 'sights_cluster' from Preparer to enable true Center-of-Gravity analysis.
// src/core/prompts/templates/geoAnalyst.ts

import { PromptBuilder } from '../PromptBuilder';

export const buildGeoAnalystPrompt = (payload: any): string => {
  const { context, instructions } = payload;

  // 1. DATA PREPARATION (The "Missing Link" Fix)
  // We format the cluster so the AI actually sees the locations.
  const clusterData = Array.isArray(context.sights_cluster) && context.sights_cluster.length > 0
    ? context.sights_cluster.map((s: any) => `- ${s.name} (${s.category}) @ ${s.location?.lat},${s.location?.lng}`).join('\n')
    : "No specific sights pre-selected. Rely on general destination knowledge.";

  // 2. ROLE DEFINITION
  const role = instructions.role || `You are the **Chief Location Strategist** ("The Geo Analyst"). 
  Your job is NOT to find hotels yet. Your job is to define the optimal **Geographic Search Area** (District or Hub) for the Hotel Scout.
  You think in terms of "Logistical Efficiency" and "Vibe Match".`;

  // 3. INSTRUCTIONS (Restored User's Detailed Logic)
  const promptInstructions = `# DATA BASIS: SIGHTS CLUSTER
The user wants to visit these locations:
${clusterData}

# MISSION
${instructions.task_override}

# ANALYSIS LOGIC (CHAIN OF THOUGHT)
1. **Center of Gravity:** - Look at the 'SIGHTS CLUSTER' above. Where is the geometric center of the activities?
   - Do not just pick the center of the city if all sights are in the south!

2. **Granularity Rule (CRITICAL):** - **Small Town:** The City Name is sufficient.
   - **Metropolis (>100k):** Providing a generic city name (e.g., "London", "Berlin") is a **FAILURE**. 
   - You MUST pinpoint the optimal **District / Neighborhood** (e.g., "Berlin-Mitte", "London-Soho", "Munich-Schwabing").

3. **Logistics Check:** - **User Mode:** ${context.mode} (Arrival: ${context.arrival?.type || 'unknown'})
   - **Car:** Suggest areas with parking, outskirts, or districts with good highway access. Avoid pure pedestrian zones.
   - **Train/Flight:** Suggest areas near Central Station or with excellent public transport links to the center.

4. **Vibe Match:** - Ensure the district matches the general travel vibe.
   - (e.g. "Hipster" -> Arts District, "Quiet" -> Green Suburbs, "Luxury" -> City Center).

# OUTPUT
Recommend 1-2 specific areas/hubs that are strategically perfect.`;

  const outputSchema = {
    "_thought_process": "String (Step 1: Map the sights. Step 2: Identify the geometric center. Step 3: Select District based on Transport Mode & Vibe...)",
    "recommended_hubs": [
      {
        "hub_name": "String (Name of City OR Specific District, e.g. 'Berlin - Mitte' - MANDATORY for major cities)",
        "suitability_score": "Integer (1-10)",
        "pros": ["String (Logistics)", "String (Vibe)"],
        "cons": ["String (e.g. 'Expensive parking', 'Far from center')"],
        "suitable_for": "String (e.g. 'Short Walking Distances', 'Car Travelers')"
      }
    ]
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(context, "GEO PARAMETERS")
    // Note: Strategic Briefing should ideally be in context, but logic holds without it for pure Geo-Analysis
    .withInstruction(promptInstructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['planning', 'logic'])
    .build();
};
// --- END OF FILE 82 Zeilen ---