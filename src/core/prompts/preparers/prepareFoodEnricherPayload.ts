// 04.02.2026 10:00 - FIX: INPUT DETECTION & V30 HYBRID LOGIC.
// - Prioritizes 'candidatesArg' (Direct Pass) over Store/Project data to fix "No candidates found" warning.
// - Implements V30 "Hybrid Knowledge" strategy (Live Research + LLM Fallback).
// - Enforces strict "[Distance] entfernt:" description template.
// src/core/prompts/preparers/prepareFoodEnricherPayload.ts

import type { TripProject } from '../../types';

export const prepareFoodEnricherPayload = (
    project: TripProject, 
    candidatesArg?: any[]
) => {
    // 1. DATA SOURCING: Priority on direct arguments (from Orchestrator Single Step)
    // If not found, fall back to Store data (Chunking Loop)
    let candidates = candidatesArg;

    if (!candidates || candidates.length === 0) {
        // Fallback: Check if we are in a chunking context stored in project/analysis
        // (This depends on how your store saves intermediate state, usually 'project.data.content.rawFoodCandidates')
        const storedCandidates = (project.data?.content as any)?.rawFoodCandidates;
        if (storedCandidates && Array.isArray(storedCandidates)) {
            candidates = storedCandidates;
        }
    }

    // 2. SAFETY CHECK
    if (!candidates || candidates.length === 0) {
        console.warn("[FoodEnricher] No candidates found in arguments or store.");
        // Return a dummy payload to prevent crash, but log warning clearly
        return {
            context: { candidates_list: [] },
            instructions: { role: "Idle" },
            userInputs: {}
        };
    }

    console.log(`[FoodEnricher] Processing ${candidates.length} candidates.`);

    // 3. PREPARE CANDIDATE LIST FOR PROMPT
    // We map only essential fields to keep prompt lean but informative
    const candidatesList = candidates.map((c: any) => {
        // Calculate Distance Hint if available
        let distHint = "Unbekannt";
        let distVal = 0;
        if (c.distance || c.dist) {
             distVal = typeof c.distance === 'number' ? c.distance : parseFloat(c.distance);
             distHint = `${distVal.toFixed(1)} km`;
        } else if (c.location && project.userInputs?.logistics?.stationary?.destination) {
             // Optional: Coordinates diff (simplified) or leave as "Im Zielgebiet"
             distHint = "Im Zielgebiet";
        }

        return {
            id: c.id,
            name: c.name,
            location_hint: distHint,
            distance_val: distVal,
            context_hint: `Listed in: ${c.guides ? c.guides.join(', ') : 'Local Discovery'}`,
            source_url: c.source_url || c.website || "",
            raw_address: c.address || c.vicinity || ""
        };
    });

    // 4. DEFINE STRATEGY (V30 HYBRID MODE)
    const role = `You are a 'Food-Enricher' & Restaurant Critic. Your job is to verify facts and write a high-quality review in specific format.`;

    const instructions = `
# TASK
Perform a "Hybrid Knowledge" enrichment for the provided restaurant candidates.
1. **Live Research:** Find current Hard Facts (Address, Phone, Website, Opening Hours, Current Menu, **Coordinates**).
2. **LLM Knowledge:** Use your internal culinary knowledge to describe the Vibe, Cuisine Style, and Reputation.

# EDITORIAL STYLE (BINDING)
You MUST follow this specific writing guideline:
"${project.userInputs?.customPreferences?.editorialStyle || ''}"

# MANDATORY TEXT TEMPLATE (VITAL!)
For the "description" field, you MUST start exactly like this:
**"[Distance] entfernt: [Your text...]"**
(Example: "1.3 km entfernt: Die Brasserie Colette bietet...")
- Use the 'distance_val' from input to fill [Distance].
- If distance is 0 or unknown, use "Im Ort: ..." or "Direkt hier: ...".

# DATA REQUIREMENTS (ORCHESTRATED INTELLIGENCE)
1. **Identity:** You MUST return the exact 'id' provided in the input. Do NOT generate a new ID.
2. **Awards:** Explicitly check for Michelin (Stars, Bib), Gault&Millau, Feinschmecker.
3. **Signature Dish:** Identify one specific dish or specialty the place is famous for.
4. **Ratings:** Provide Google Rating (e.g. 4.6) and total count.
5. **Logistics:** Add a short tip (e.g. "Reservation essential", "Cash only").
6. **Coordinates:** You MUST provide accurate Latitude/Longitude for the Map View.
7. **DATA PRESERVATION (THE SHIELD):** You received 'existing_guides' and 'source_url' (or 'existing_url') in the input. You MUST return them exactly as received. Do NOT delete or empty these fields.

# FALLBACK RULE
If a restaurant cannot be found or is permanently closed, set "found": false.

# FINAL INTEGRITY CHECK (SELF-CONTROL)
Before outputting JSON, you MUST verify:
1. **Input Count:** I received ${candidatesList.length} candidates.
2. **Output Count:** I am returning exactly ${candidatesList.length} candidates.
3. **ID Match:** Every 'id' in output matches an 'id' from input.
⛔️ **CRITICAL:** If counts do not match, STOP and fix the list. Do NOT drop items because they are closed/unfound (set found:false instead).
`;

    return {
        context: {
            candidates_list: candidatesList,
            chunk_progress: "", // Can be filled by Orchestrator if needed
            target_language: project.userInputs?.aiOutputLanguage || 'de',
            strategic_briefing: project.analysis?.geoAnalyst?.strategic_focus || "",
            reference_location: project.userInputs?.logistics?.stationary?.destination || "Region"
        },
        instructions: {
            role: role,
            content: instructions
        },
        userInputs: project.userInputs
    };
};
// Lines: 128