// 04.02.2026 10:45 - FIX: ROBUST DATA UNWRAPPING.
// - Solves the "No candidates found" error by correctly unwrapping the input object.
// - Handles both raw arrays and { candidates: [...] } objects passed by PayloadBuilder.
// - Preserves V30 Hybrid Knowledge logic and Distance-Template.
// src/core/prompts/preparers/prepareFoodEnricherPayload.ts

import type { TripProject } from '../../types';

export const prepareFoodEnricherPayload = (
    project: TripProject, 
    candidatesArg?: any
) => {
    // 1. ROBUST DATA SOURCING (UNWRAPPING FIX)
    let candidates: any[] = [];

    // Scenario A: Direct Array (Raw Pass)
    if (Array.isArray(candidatesArg)) {
        candidates = candidatesArg;
    } 
    // Scenario B: Wrapped Object (from PayloadBuilder/Orchestrator Single Step)
    // The Orchestrator passes { candidates: inputData } inside options.
    else if (candidatesArg && typeof candidatesArg === 'object') {
        if (Array.isArray(candidatesArg.candidates)) {
            candidates = candidatesArg.candidates;
        } else if (Array.isArray(candidatesArg.inputData)) {
            candidates = candidatesArg.inputData;
        }
    }

    // 2. FALLBACK TO STORE (If RAM pass failed)
    if (candidates.length === 0) {
        const storedCandidates = (project.data?.content as any)?.rawFoodCandidates;
        if (storedCandidates && Array.isArray(storedCandidates)) {
            candidates = storedCandidates;
        }
    }

    // 3. SAFETY CHECK & EXIT
    if (candidates.length === 0) {
        console.warn("[FoodEnricher] No candidates found in RAM (Arg) or Store.");
        return {
            context: { candidates_list: [] },
            instructions: { role: "Idle" },
            userInputs: {}
        };
    }

    console.log(`[FoodEnricher] Processing ${candidates.length} candidates from RAM/Store.`);

    // 4. PREPARE CANDIDATE LIST FOR PROMPT
    const candidatesList = candidates.map((c: any) => {
        // Calculate Distance Hint
        let distHint = "Unbekannt";
        let distVal = 0;
        
        // Normalize 'dist' vs 'distance' legacy fields
        const rawDist = c.distance ?? c.dist;
        
        if (rawDist !== undefined && rawDist !== null) {
             distVal = typeof rawDist === 'number' ? rawDist : parseFloat(rawDist);
             distHint = `${distVal.toFixed(1)} km`;
        } else if (c.location && project.userInputs?.logistics?.stationary?.destination) {
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

    // 5. DEFINE STRATEGY (V30 HYBRID MODE)
    const role = `You are a 'Food-Enricher' & Restaurant Critic. Your job is to verify facts and write a high-quality review in specific format.`;

    const instructions = `
# TASK
Perform a "Hybrid Knowledge" enrichment for the provided restaurant candidates.
1. **Live Research:** Find current Hard Facts (Address, Phone, Website, Opening Hours, **Coordinates**).
2. **LLM Knowledge:** Use your internal culinary knowledge to describe the Vibe, Cuisine Style, and Reputation.

# EDITORIAL STYLE (BINDING)
You MUST follow this specific writing guideline:
"${project.userInputs?.customPreferences?.editorialStyle || 'Authentic, inviting, factual.'}"

# MANDATORY TEXT TEMPLATE (VITAL!)
For the "description" field, you MUST start exactly like this:
**"[Distance] entfernt: [Your text...]"**
(Example: "1.3 km entfernt: Die Brasserie Colette bietet...")
- Use the 'distance_val' provided in input to fill [Distance].
- If distance is 0, use "Im Ort: ..." or "Direkt hier: ...".

# DATA REQUIREMENTS
1. **Identity:** You MUST return the exact 'id' provided in the input. Do NOT generate a new ID.
2. **Awards:** Explicitly check for Michelin (Stars, Bib), Gault&Millau, Feinschmecker.
3. **Signature Dish:** Identify one specific dish or specialty the place is famous for.
4. **Ratings:** Provide Google Rating (e.g. 4.6) if known, else null.
5. **Logistics:** Add a short tip (e.g. "Reservation essential", "Cash only").
6. **Coordinates:** You MUST provide accurate Latitude/Longitude.
7. **DATA PRESERVATION:** You received 'source_url' (or 'existing_url') in the input. You MUST return it exactly as received in the output.

# FALLBACK RULE
If a restaurant cannot be found or is permanently closed, set "found": false.

# FINAL INTEGRITY CHECK
Before outputting JSON, verify:
1. **Input Count:** I received ${candidatesList.length} candidates.
2. **Output Count:** I am returning exactly ${candidatesList.length} candidates.
3. **ID Match:** Every 'id' in output matches an 'id' from input.
`;

    return {
        context: {
            candidates_list: candidatesList,
            chunk_progress: "", 
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
// Lines: 135