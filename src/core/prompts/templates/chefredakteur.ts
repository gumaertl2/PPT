// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/chefredakteur.ts
// 19.01.2026 19:05 - FIX: Integrated Strategic Briefing context and updated to German ChefPlaner keys.
// 17.01.2026 19:10 - FEAT: Ported 'Chefredakteur' (Content Editor) from V30.
// 17.01.2026 23:20 - REFACTOR: Migrated to PromptBuilder pattern (Unified Builder).
// 17.01.2026 17:50 - FIX: Added .flat() to handle Place[] arrays correctly.

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

    // FIX: Schema converted to V40 English keys
    const outputSchema = [
        { 
            id: "String", 
            type: "String (MUST match the Type from the task list exactly)",
            content: "String (Markdown formatted, escape all line breaks as \\n)",
            waypoints: [
                { name: "String", address: "String" }
            ]
        }
    ];

    const role = `You are an experienced Editor-in-Chief for premium travel guides. Your task is to write engaging, informative, and well-structured detail texts in Markdown format for a given list of sights (Museums, Architecture, Districts, etc.).`;

    const contextData = {
        strategic_guideline: strategicBriefing,
        task_list: aufgabenListe
    };

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

# ADDITIONAL RULES
- **For Type "Stadtbezirke" / "CityDistricts":** The object MUST ADDITIONALLY contain the field \`waypoints\`. Omit this field for all other types.
- The value of the \`id\` field MUST match the original ID from the task list exactly.
- Format ALL URLs in the text as clickable links with descriptive text.
- **MOST IMPORTANT FORMAT RULE:** The entire value of the "content" field must be a **single string**. All line breaks within your text **MUST** be escaped as \`\\n\`.`;

    return new PromptBuilder()
        .withOS()
        .withRole(role)
        .withContext(contextData, "EDITORIAL BRIEFING")
        .withInstruction(instructions)
        .withOutputSchema(outputSchema)
        .withSelfCheck(['basic', 'research'])
        .build();
};
// --- END OF FILE 117 Zeilen ---