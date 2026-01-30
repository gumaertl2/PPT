// 01.02.2026 22:00 - PROMPT HYBRID: Merged V40 Structure with Legacy Logic.
// Retains 'findSightData' fallback & supports both Project-based and Payload-based calls.
// src/core/prompts/templates/chefredakteur.ts

import type { TripProject, Place } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildChefredakteurPrompt = (
    projectOrPayload: TripProject | any,
    tasksChunk?: any[],
    currentChunk: number = 1,
    totalChunks: number = 1
): string | null => {
    
    // 1. RESOLVE INPUT (Hybrid Support)
    // If it's a Payload (has 'context' property), unpack it. Else treat as Project.
    let tasks = tasksChunk;
    let dataPlaces = {};
    let strategicBriefing = "";
    let chunkInfo = "";

    if (projectOrPayload.context && projectOrPayload.instructions) {
        // V40 Payload Mode
        const payload = projectOrPayload;
        tasks = payload.context.tasks_chunk || [];
        strategicBriefing = payload.context.strategic_guideline || "";
        chunkInfo = payload.context.chunk_info || "";
        // We assume facts are pre-packed in Payload mode, so findSightData might be less relevant,
        // but we can try to look at 'master_data' if passed.
        dataPlaces = payload.context.master_data || {};
    } else {
        // Legacy Project Mode
        const project = projectOrPayload as TripProject;
        if (!tasks || tasks.length === 0) return null;
        
        dataPlaces = project.data.places || {};
        strategicBriefing = (project.analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || "";
        chunkInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';
    }

    // Safety Check
    if (!tasks || tasks.length === 0) return null;

    // 2. HELPER: Fallback Lookup
    const findSightData = (anhangId: string) => {
        const masterliste = Object.values(dataPlaces).flat() as Place[];
        if (masterliste.length === 0) return null;
        const cleanId = anhangId.replace('anhang_sight_', '').replace('anhang_', '');
        return masterliste.find((s: any) => s.id === cleanId || s.id === anhangId);
    };

    // 3. GENERATE TASK LIST
    const aufgabenListe = tasks.map((p: any) => {
        let anweisung = p.anweisung || `No specific instruction found. Create a useful description for '${p.titel || p.name}'.`;

        // Context Injection (Facts)
        // Priority: Preparer Facts > Store Lookup > Empty
        let factsContext = "";
        const sightData = p.facts ? p.facts : findSightData(p.id);

        if (sightData) {
            const address = sightData.address || (sightData as any).adresse || "N/A";
            const location = sightData.location ? `Lat: ${sightData.location.lat}, Lng: ${sightData.location.lng}` : "N/A";
            const hours = sightData.openingHours || "N/A";
            
            factsContext = `
    HARD FACTS (ANCHOR):
    - Official Name: ${p.titel || p.name}
    - Address: ${address}
    - Location: ${location}
    - Opening Hours: ${hours}
    (Use these facts as absolute truth. Do not contradict them.)`;
        }

        return `- **ID "${p.id}" (Title: ${p.titel || p.name}, Type: ${p.typ}):**${factsContext}\n  INSTRUCTION: ${anweisung}`;
    }).join('\n\n----------------\n\n');

    const role = `You are an experienced Editor-in-Chief for premium travel guides. Your task is to write engaging, informative, and well-structured detail texts in Markdown format.`;

    const contextData = {
        strategic_guideline: strategicBriefing,
        task_list_preview: "See below for full tasks"
    };

    // 4. INSTRUCTIONS
    const instructions = `# EDITORIAL STYLE (BINDING)
- **Style:** Factual, detailed, informative.
- **Strategy:** Consider the "strategic_guideline".
- **Depth:** Enrich with background stories, historical facts, and entertaining anecdotes.
- **Tone:** Encyclopedic but engaging.

# QUALITY REQUIREMENTS
1. **Narrative Depth:** Write flowing paragraphs, no pure lists.
2. **Sensory Details:** Describe HOW it looks/smells/sounds.
3. **Length:** Target 250-400 words per sight. Stop when exhausted.

# TASKS TO PROCESS${chunkInfo}
Here is the list of IDs and corresponding instructions:

---
${aufgabenListe}
---

# RESEARCH PROTOCOL (HYBRID)
1. **Fact Anchor:** You MUST treat the provided "HARD FACTS" as absolute truth.
2. **Deep Dive:** Perform live internet research for history & stories.
3. **Conflict Resolution:** If research contradicts "HARD FACTS", trust the "HARD FACTS".

# OUTPUT FORMAT (STRICT JSON)
Return a SINGLE valid JSON object.

Structure:
{
  "_thought_process": "String (Briefly analyze strategy...)",
  "articles": [
    {
      "id": "MUST MATCH ID FROM TASK LIST",
      "type": "MUST MATCH TYPE FROM TASK LIST",
      "content": "Your markdown text here (escape newlines as \\n)...",
      "waypoints": [ { "name": "Station A", "address": "Address A" } ] // Only for Districts/Tours
    }
  ]
}

# FINAL RULES
- The \`id\` MUST match exactly.
- Format URLs as clickable links.
- **CRITICAL:** Escape ALL line breaks in 'content' as \`\\n\`.`;

    // 5. BUILD
    const builder = new PromptBuilder();
    builder.withRole(role);
    builder.withContext(JSON.stringify(contextData, null, 2), "EDITORIAL BRIEFING");
    builder.withInstruction(instructions);
    
    // Explicit Schema definition for V40 compliance
    const outputSchema = {
        "_thought_process": "String",
        "articles": [
            { "id": "String", "type": "String", "content": "String", "waypoints": ["Object"] }
        ]
    };
    builder.withOutputSchema(outputSchema);

    return builder.build();
};
// --- END OF FILE 136 Zeilen ---