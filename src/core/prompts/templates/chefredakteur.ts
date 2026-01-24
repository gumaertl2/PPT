// 24.01.2026 18:00 - FIX: Thinking-Safe Architecture.
// Implements strict JSON object with '_thought_process' to support Gemini 2.5 Flash.
// Consumes input from 'prepareChefredakteurPayload'.
// src/core/prompts/templates/chefredakteur.ts

import type { TripProject, Place } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildChefredakteurPrompt = (
    project: TripProject,
    tasksChunk: any[], // List of sights to process
    currentChunk: number = 1,
    totalChunks: number = 1
): string | null => {
    
    // Safety Check
    if (!tasksChunk || tasksChunk.length === 0) {
        return null;
    }

    const { data, analysis } = project;
    const chunkingInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

    // 1. STRATEGIC BRIEFING (V40 English Key)
    const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                              (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                              "";

    // Helper: Find sight data in master list
    const findSightData = (anhangId: string) => {
        const masterliste = Object.values(data.places || {}).flat() as Place[];
        
        if (masterliste.length === 0) return null;

        const cleanId = anhangId.replace('anhang_sight_', '').replace('anhang_', '');
        return masterliste.find(s => s.id === cleanId || s.id === anhangId);
    };

    // Generate Task List (keeping input property access robust)
    const aufgabenListe = tasksChunk.map(p => {
        let anweisung = p.anweisung || `No specific instruction found for type '${p.typ}'. Create a general, useful description for '${p.titel}'.`;

        // Context Injection
        const sightData = findSightData(p.id);
        let contextString = "";
        
        if (sightData) {
            const city = (sightData as any).stadt || (sightData.vicinity) || "Unknown";
            const country = (sightData as any).land || "Unknown";
            const address = sightData.address || (sightData as any).adresse || "No address";
            contextString = `\n  **CONTEXT (IMPORTANT):** City: ${city}, Country: ${country}, Address: ${address}. Use this info to avoid mix-ups with places of the same name.`;
        }

        // Special Logic for 'Stadtbezirke' (City Districts) -> Waypoints
        if (p.typ === 'Stadtbezirke' || p.typ === 'CityDistricts') {
            anweisung += `\n\n**EXTRA TASK FOR MAP LINK:** In ADDITION to the \`content\` text, create an array called \`waypoints\`. This array must contain an object for each station mentioned in the walk. Each object must have keys \`name\` and \`address\`. \n**IMPORTANT:** The value for \`name\` must match EXACTLY the bold headline or name used in the text. Provide a Google Maps findable address.`;
        }

        return `- **ID "${p.id}" (Title: ${p.titel}, Type: ${p.typ}):**${contextString}\n  ${anweisung}`;
    }).join('\n\n');

    const role = `You are an experienced Editor-in-Chief for premium travel guides. Your task is to write engaging, informative, and well-structured detail texts in Markdown format for a given list of sights (Museums, Architecture, Districts, etc.).`;

    const contextData = {
        strategic_guideline: strategicBriefing,
        task_list: aufgabenListe
    };

    // UPDATED INSTRUCTIONS: Merged Style & Output Format (Thinking-Safe)
    const instructions = `# EDITORIAL STYLE (BINDING)
- **Style:** Your writing style must be factual, detailed, and informative.
- **Strategy:** Consider the "strategic_guideline" for tonality and content weighting.
- **Depth:** Actively enrich your texts with interesting background stories, historical facts, and entertaining anecdotes.
- **Forbidden:** Explicitly ignore the general "Emotional Vibe" of the trip. The tone should be encyclopedic.

# QUALITY REQUIREMENTS (ANTI-LOOP & DEPTH)
1.  **Narrative Depth over Lists:** Pure lists are forbidden. Write flowing, coherent paragraphs.
2.  **Love for Detail:** Do not just describe THAT there is something to see, but HOW it looks, smells, or sounds.
3.  **Length & Cutoff:** Write extensively (Target: 250-400 words per sight), but stop immediately when relevant info is exhausted.

# TASKS TO PROCESS${chunkingInfo}
Here is the list of IDs and corresponding instructions (TIA) you must implement exactly. Perform live internet research for every ID.

---
${aufgabenListe}
---

# OUTPUT FORMAT (STRICT JSON)
Return a SINGLE valid JSON object with a "_thought_process" field and an "articles" array.

Structure:
{
  "_thought_process": "Briefly analyze the strategy and context for this batch...",
  "articles": [
    {
      "id": "MUST MATCH ID FROM TASK LIST",
      "type": "MUST MATCH TYPE FROM TASK LIST",
      "content": "Your markdown text here (escape newlines as \\n)...",
      "waypoints": [ { "name": "Station A", "address": "Address A" } ] // Only for Districts
    }
  ]
}

# FINAL RULES
- The value of the \`id\` field MUST match the original ID from the task list exactly.
- Format ALL URLs in the text as clickable links with descriptive text.
- **MOST IMPORTANT FORMAT RULE:** The entire value of the "content" field must be a **single string**. All line breaks within your text **MUST** be escaped as \`\\n\`.`;

    const builder = new PromptBuilder();
    
    // Fix: Using new API without arguments in constructor
    builder.withRole(role);
    builder.withContext(JSON.stringify(contextData, null, 2), "EDITORIAL BRIEFING"); // Stringify context for safety
    builder.withInstruction(instructions);
    
    // Fix: No .withOutputSchema(), no .build(true). Just standard build.
    return builder.build();
};
// --- END OF FILE 125 Zeilen ---