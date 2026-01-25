// 25.01.2026 13:45 - REFACTOR: Template Simplified.
// Hardcoded logic removed to allow V30 instructions from Preparer/Interests to take precedence.
// src/core/prompts/templates/infoAutor.ts

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildInfoAutorPrompt = (
    project: TripProject,
    tasksChunk: any[], 
    currentChunk: number = 1, 
    totalChunks: number = 1, 
    detectedCountries: string[] = []
): string | null => {
    
    if (!tasksChunk || tasksChunk.length === 0) {
        return null;
    }

    const { userInputs, analysis } = project;
    const { logistics } = userInputs;
    
    const chunkingInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

    // 1. STRATEGIC BRIEFING (V40 English Key)
    const strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || 
                              (analysis.chefPlaner as any)?.strategisches_briefing?.sammler_briefing || 
                              "";

    // Data Mapping
    let home = 'Unknown';
    if (logistics.mode === 'roundtrip' && logistics.roundtrip.startLocation) {
        home = logistics.roundtrip.startLocation;
    } else if (logistics.mode === 'stationaer' && (logistics.stationary as any).origin) {
        home = (logistics.stationary as any).origin;
    }

    const arrivalType = (logistics as any).arrivalType || 'Plane/Car';
    const uniqueCountries = [...new Set(detectedCountries)].filter(Boolean);
    const countriesListString = uniqueCountries.length > 0 ? uniqueCountries.join(', ') : 'Unknown (please determine)';

    // Generate Task Logic
    const taskList = tasksChunk.map(p => {
        // REFACTOR: We now trust the 'anweisung' provided by the Smart Preparer (V30 Quality).
        // We do NOT inject hardcoded logistics questions here anymore to avoid duplication.
        
        let instruction = p.anweisung || `Create a general, useful description for '${p.titel}'.`;

        // Context Injection (Minimal)
        // If the preparer set a context (e.g. "Italy" or "Munich"), we enforce focus.
        if (p.contextLocation) {
             instruction += `\n\n**CONTEXT:** Focus exclusively on: ${p.contextLocation}`;
        }

        return `- **ID "${p.id}" (Title: ${p.titel}, Type: ${p.typ}):**\n  ${instruction}`;
    }).join('\n\n');

    const role = `You are an experienced Editor-in-Chief for travel guides, specializing in logistics and legal advice. Your task is to fill text placeholders with precise, researched facts.`;

    const instructions = `# EDITORIAL STYLE
- **Focus:** Utility value, safety, and avoiding tourist traps.
- **Style:** Factual, direct, warning where necessary.

# QUALITY REQUIREMENTS
1.  **Explain instead of listing:** Write at least one full sentence for each point.
2.  **The W-Questions:** Do not just say "There is a toll", but: WHAT does it cost? WHERE do you buy it?
3.  **Length:** Respect the specific length instructions in each task (e.g. "half a page").

# TASKS TO PROCESS${chunkingInfo}
Here is the list of IDs and corresponding instructions (AIA).

---
${taskList}
---`;

    // FIX: Schema converted to V40 English keys
    const outputSchema = {
      "_thought_process": [
        "String (Step 1: Analyze task...)",
        "String (Step 2: Research facts...)"
      ],
      "chapters": [
        { 
            id: "String", 
            type: "String (MUST match the Type from the task list exactly)", 
            content: "String (Markdown formatted, escape all line breaks as \\n)"
        }
      ]
    };

    return new PromptBuilder()
        .withOS()
        .withRole(role)
        .withContext({ home, arrival: arrivalType, target_areas: countriesListString }, "LOGISTICS PARAMETERS")
        .withContext(strategicBriefing, "STRATEGIC GUIDELINE")
        .withInstruction(instructions)
        .withOutputSchema(outputSchema)
        .withSelfCheck(['basic', 'research'])
        .build();
};
// --- END OF FILE 94 Zeilen ---