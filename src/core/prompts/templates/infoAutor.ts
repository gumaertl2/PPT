// 01.02.2026 22:15 - PROMPT HYBRID: Merged V40 Payload Pattern with Legacy Arguments.
// Focused on "Appendix/Meta-Info" tasks (Visa, Toll, Safety).
// src/core/prompts/templates/infoAutor.ts

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildInfoAutorPrompt = (
    projectOrPayload: TripProject | any,
    tasksChunk?: any[],
    currentChunk: number = 1,
    totalChunks: number = 1,
    detectedCountries: string[] = []
): string | null => {

    // 1. RESOLVE INPUT (Hybrid Support)
    let tasks = tasksChunk;
    let strategicBriefing = "";
    let chunkInfo = "";
    let home = 'Unknown';
    let arrivalType = 'Plane/Car';
    let countriesListString = "";

    if (projectOrPayload.context && projectOrPayload.instructions) {
        // V40 Payload Mode
        const payload = projectOrPayload;
        tasks = payload.context.tasks_chunk || [];
        strategicBriefing = payload.context.strategic_guideline || "";
        chunkInfo = payload.context.chunk_info || "";
        home = payload.context.home_location || "Unknown";
        arrivalType = payload.context.arrival_type || "Unknown";
        countriesListString = payload.context.target_countries || "Unknown";
    } else {
        // Legacy Project Mode
        const project = projectOrPayload as TripProject;
        if (!tasks || tasks.length === 0) return null;
        
        const { userInputs, analysis } = project;
        const { logistics } = userInputs;

        chunkInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';
        strategicBriefing = (analysis.chefPlaner as any)?.strategic_briefing?.sammler_briefing || "";

        // Data Mapping
        if (logistics.mode === 'roundtrip' && logistics.roundtrip.startLocation) {
            home = logistics.roundtrip.startLocation;
        } else if (logistics.mode === 'stationaer' && (logistics.stationary as any).origin) {
            home = (logistics.stationary as any).origin;
        }
        arrivalType = (logistics as any).arrivalType || 'Plane/Car';
        const uniqueCountries = [...new Set(detectedCountries)].filter(Boolean);
        countriesListString = uniqueCountries.length > 0 ? uniqueCountries.join(', ') : 'Unknown (please determine)';
    }

    // Safety Check
    if (!tasks || tasks.length === 0) {
        return "ERROR: No tasks provided for Info Autor.";
    }

    // 2. GENERATE TASK LIST
    const taskList = tasks.map((p: any) => {
        // COMPATIBILITY: Support both new 'instruction' and legacy 'anweisung'
        let instruction = p.instruction || p.anweisung || `Create a general, useful description for '${p.title || p.titel}'.`;
        const title = p.title || p.titel || "Unknown Title";
        const type = p.type || p.typ || "general";

        // Context Injection
        const contextLoc = p.context || p.contextLocation;
        if (contextLoc) {
             instruction += `\n\n**CONTEXT:** Focus exclusively on: ${contextLoc}`;
        }

        return `- **ID "${p.id}" (Title: ${title}, Type: ${type}):**\n  ${instruction}`;
    }).join('\n\n');

    // 3. ROLE
    const role = `You are an experienced Editor-in-Chief for travel guides, specializing in logistics and legal advice. Your task is to fill text placeholders with precise, researched facts (Visa, Tolls, Safety).`;

    // 4. INSTRUCTIONS
    const instructions = `# EDITORIAL STYLE
- **Focus:** Utility value, safety, and avoiding tourist traps.
- **Style:** Factual, direct, warning where necessary.

# RESEARCH PROTOCOL (LIVE)
1. **LIVE RESEARCH REQUIRED:** You MUST search the internet to find current facts for these topics (Visa rules, Toll prices, Public transport ticket names).
2. **Fact Check:** Ensure numbers (prices, limits) are reasonably current.
3. **Validation:** If you find conflicting info, use the most recent official source (e.g. embassy websites).

# QUALITY REQUIREMENTS
1. **Explain instead of listing:** Write at least one full sentence for each point.
2. **The W-Questions:** Do not just say "There is a toll", but: WHAT does it cost? WHERE do you buy it?
3. **Length:** Respect the specific length instructions in each task (e.g. "half a page").

# TASKS TO PROCESS${chunkInfo}
Here is the list of IDs and corresponding instructions (AIA).

---
${taskList}
---`;

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
// --- END OF FILE 128 Zeilen ---