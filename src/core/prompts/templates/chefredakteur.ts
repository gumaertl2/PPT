// 28.01.2026 17:30 - FIX: Cleaned up Logic. 'Waypoints' instruction moved to Preparer. Schema enforced here.
// 26.01.2026 15:00 - FIX: MERGED BEST OF BOTH WORLDS.
// Retains: Live Research, Waypoints Logic, Narrative Depth Rules.
// Adds: Strict Fact Anchoring (Safety Net against Hallucinations).
// src/core/prompts/templates/chefredakteur.ts

import type { TripProject, Place } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildChefredakteurPrompt = (
    project: TripProject,
    tasksChunk: any[], // List of sights to process (from Preparer)
    currentChunk: number = 1,
    totalChunks: number = 1
): string | null => {
    
    // Safety Check
    if (!tasksChunk || tasksChunk.length === 0) {
        return null;
    }

    const { data, analysis } = project;
    const chunkingInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

    // 1. STRATEGIC BRIEFING
    const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                              (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                              "";

    // Helper: Find sight data in master list (Fallback if facts are missing in payload)
    const findSightData = (anhangId: string) => {
        const masterliste = Object.values(data.places || {}).flat() as Place[];
        if (masterliste.length === 0) return null;
        const cleanId = anhangId.replace('anhang_sight_', '').replace('anhang_', '');
        return masterliste.find(s => s.id === cleanId || s.id === anhangId);
    };

    // Generate Task List
    const aufgabenListe = tasksChunk.map(p => {
        let anweisung = p.anweisung || `No specific instruction found. Create a useful description for '${p.titel}'.`;

        // A. Context Injection (Facts)
        // We prioritize facts delivered by the Preparer (p.facts), fallback to store lookup.
        let factsContext = "";
        const sightData = p.facts ? p.facts : findSightData(p.id); // Hybrid Lookup

        if (sightData) {
            // Normalize data whether it comes from Preparer-Facts or Store-Place
            const address = sightData.address || (sightData as any).adresse || "N/A";
            const location = sightData.location ? `Lat: ${sightData.location.lat}, Lng: ${sightData.location.lng}` : "N/A";
            const hours = sightData.openingHours || "N/A";
            
            // This block is crucial for the "Anchor" logic
            factsContext = `
    HARD FACTS (ANCHOR):
    - Official Name: ${p.titel}
    - Address: ${address}
    - Location: ${location}
    - Opening Hours: ${hours}
    (Use these facts as absolute truth. Do not contradict them.)`;
        }

        // REMOVED: Redundant 'Stadtbezirke' logic. 
        // This is now handled centrally in 'prepareChefredakteurPayload.ts' (V40 Architecture).

        return `- **ID "${p.id}" (Title: ${p.titel}, Type: ${p.typ}):**${factsContext}\n  INSTRUCTION: ${anweisung}`;
    }).join('\n\n----------------\n\n');

    const role = `You are an experienced Editor-in-Chief for premium travel guides. Your task is to write engaging, informative, and well-structured detail texts in Markdown format for a given list of sights.`;

    const contextData = {
        strategic_guideline: strategicBriefing,
        task_list_preview: "See below for full tasks"
    };

    // UPDATED INSTRUCTIONS: Merged Style & Output Format (Thinking-Safe)
    const instructions = `# EDITORIAL STYLE (BINDING)
- **Style:** Your writing style must be factual, detailed, and informative.
- **Strategy:** Consider the "strategic_guideline" for tonality and content weighting.
- **Depth:** Actively enrich your texts with interesting background stories, historical facts, and entertaining anecdotes.
- **Forbidden:** Explicitly ignore the general "Emotional Vibe" of the trip. The tone should be encyclopedic.

# QUALITY REQUIREMENTS (ANTI-LOOP & DEPTH)
1. **Narrative Depth over Lists:** Pure lists are forbidden. Write flowing, coherent paragraphs.
2. **Love for Detail:** Do not just describe THAT there is something to see, but HOW it looks, smells, or sounds.
3. **Length & Cutoff:** Write extensively (Target: 250-400 words per sight), but stop immediately when relevant info is exhausted.

# TASKS TO PROCESS${chunkingInfo}
Here is the list of IDs and corresponding instructions you must implement exactly.

---
${aufgabenListe}
---

# RESEARCH PROTOCOL (HYBRID)
1. **Fact Anchor:** You MUST treat the provided "HARD FACTS" (Address, Location) as the absolute truth.
2. **Deep Dive:** You ARE allowed to perform live internet research to find historical background, stories, and current exhibitions.
3. **Conflict Resolution:** If your research finds a different address than the "HARD FACTS", IGNORE your research and trust the "HARD FACTS".

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
      "waypoints": [ { "name": "Station A", "address": "Address A" } ] // Only for Districts/Tours
    }
  ]
}

# FINAL RULES
- The value of the \`id\` field MUST match the original ID from the task list exactly.
- Format ALL URLs in the text as clickable links with descriptive text.
- **MOST IMPORTANT FORMAT RULE:** The entire value of the "content" field must be a **single string**. All line breaks within your text **MUST** be escaped as \`\\n\`.`;

    const builder = new PromptBuilder();
    
    builder.withRole(role);
    builder.withContext(JSON.stringify(contextData, null, 2), "EDITORIAL BRIEFING");
    builder.withInstruction(instructions);
    
    return builder.build();
};
// --- END OF FILE 134 Zeilen ---