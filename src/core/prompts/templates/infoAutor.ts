// 19.01.2026 17:43 - REFACTOR: "Operation Clean Sweep" - Migrated to V40 English Keys.
// src/core/prompts/templates/infoAutor.ts
// 19.01.2026 19:25 - FIX: Corrected PromptBuilder pattern for Strategic Briefing injection.
// 17.01.2026 19:15 - FEAT: Ported 'InfoAutor' (Logistics & Safety) from V30.
// 18.01.2026 00:15 - FIX: Restored full complex logic (Country detection, Logistics Matrix).

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
        let instruction = p.anweisung || `No specific instruction found for type '${p.typ}'. Create a general, useful description for '${p.titel}'.`;

        // CASE A: City Info (Parking & Logistics)
        if (p.typ === 'StadtInfo' && p.contextLocation) {
            instruction = instruction.replace('für jede wichtige Stadt auf meiner Reise', `for the city: **${p.contextLocation}**`);
            instruction = instruction.replace('Erstelle für jede Stadt eine detaillierte, mehrteilige Zusammenfassung im Anhang.', `Create the detailed summary in the appendix **exclusively for the city ${p.contextLocation}**.`);
            
            // Safety Catch: Countries masked as Cities
            if (['Tschechien', 'Österreich', 'Deutschland', 'Schweiz', 'Italien', 'France', 'Spain'].includes(p.contextLocation)) {
                 instruction = `ATTENTION: The location "${p.contextLocation}" is a COUNTRY, not a city. Create a short overview of the most important tourist regions of this country instead. Ignore the instruction regarding city center parking.`;
            } else {
                 instruction += `\n\n**LOGISTICS MANDATORY:** Research and name concrete **parking options** for day tourists (e.g. large car park XY). Is the city center car-free?`;
            }
        }

        // CASE B: Travel Information (Country specific)
        if (p.typ === 'Reiseinformationen') {
            const targetLocation = p.contextLocation || countriesListString;
            
            instruction += `\n\n--------------------------------------------------\n`;
            instruction += `**LOGISTICS MATRIX (Hard Facts):**\n`;
            instruction += `* **Origin:** ${home}\n`;
            instruction += `* **Target Area:** ${targetLocation}\n`;
            instruction += `* **Arrival:** ${arrivalType}\n\n`;
            
            instruction += `**YOUR TASK - SPECIFIC RESEARCH:**\n`;
            
            if (p.contextLocation) {
                instruction += `1.  **FOCUS ON ${p.contextLocation.toUpperCase()}:**\n`;
                instruction += `    * Write ONLY about ${p.contextLocation}.\n`;
                instruction += `    * **Tolls & Vignette:** Prices 2025? Where to buy?\n`;
                instruction += `    * **Traffic Rules:** Speed limits, headlights required?\n`;
                instruction += `    * **Currency & Payment:** Card payment common?\n`;
                
                if (p.contextLocation !== 'Deutschland' && home.includes('Deutschland')) {
                     instruction += `    * **Entry:** ID requirements for German citizens?\n`;
                }
            } else {
                instruction += `1.  **COUNTRY CHECK:** Analyze the route through ${targetLocation}.\n`;
            }
            instruction += `--------------------------------------------------\n`;
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
3.  **Length:** 300-500 words per topic. No repetitions!

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
// --- END OF FILE 136 Zeilen ---