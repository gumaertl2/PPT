// src/core/prompts/templates/basis.ts
// 10.01.2026
// TEMPLATE: BASIS (Sammler) - V40 Port of 'prompt-sammler.js'
// Strategie: Nutzt ChefPlaner-Briefing & User-Interessen für präzise Kandidaten-Suche.
// 14.01.2026 21:55 - FIX: Added Roundtrip Logic with STRICT Integrity (Original Content Preserved).

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';
import { INTEREST_DATA } from '../../../data/interests'; 

/**
 * Generiert das "Kreative Briefing" analog zu V30.
 * Listet jedes gewählte Interesse mit seiner spezifischen AI-Instruktion ("Such-Regel") auf.
 */
const generateCreativeBriefing = (project: TripProject, lang: 'de' | 'en'): string => {
  const { userInputs } = project;
  const interests = userInputs.selectedInterests || [];
  
  if (interests.length === 0) return "";

  let briefing = "### CREATIVE BRIEFING (Interests & Search Rules)\n";
  
  interests.forEach(id => {
    const def = INTEREST_DATA[id];
    if (def) {
      const label = def.label[lang] || id;
      // Fallback: Falls keine explizite Regel da ist, nutzen wir den Label-Namen
      const rule = def.aiInstruction?.[lang] || `Find places related to ${label}.`;
      
      const customPref = userInputs.customPreferences[id] 
        ? `(User Note: "${userInputs.customPreferences[id]}")` 
        : "";
      
      briefing += `\n**Topic: ${label}**\n`;
      briefing += `- SEARCH RULE: ${rule} ${customPref}\n`;
    }
  });

  return briefing;
};

export const buildBasisPrompt = (project: TripProject): string => {
    const { userInputs, meta, analysis } = project;
    const chefPlaner = analysis.chefPlaner;
    const { logistics } = userInputs;
    
    // UI Sprache für Labels
    const uiLang = meta.language === 'en' ? 'en' : 'de';
    
    // 1. CHEF PLANER DATEN
    const strategicBriefing = chefPlaner?.strategic_briefing;
    
    // --- START FIX: ROUNDTRIP LOGIC ---
    // Wir nutzen die Instruktion vom Chef-Planer, überschreiben sie aber bei Rundreisen.
    let searchRadiusInstruction = strategicBriefing?.search_radius_instruction || "Search within the destination.";
    
    if (logistics.mode === 'roundtrip') {
        const stops = logistics.roundtrip.stops || [];
        const region = logistics.roundtrip.region || "Region";
        
        const routeString = stops.length > 0
             ? stops.map(s => s.location).join(" -> ")
             : `Route through ${region}`;
             
        searchRadiusInstruction = `
        **MODE: ROUNDTRIP**
        Do not search in a single radius. 
        Search strictly along this route corridor: ${routeString}.
        Focus on stops and logical breaks along the path.
        `;
    }
    // --- END FIX ---

    const sammlerBriefing = strategicBriefing?.sammler_briefing || ""; 
    const validierteTermine = chefPlaner?.validated_appointments || [];
    
    // 2. DEDUPLIZIERUNG (Bereits bekannte Orte ausschließen)
    const existingNames = Object.values(project.data.places || {}).map((p: any) => p.name);

    // 3. TARGETS & CONSTRAINTS
    const targetCount = userInputs.searchSettings?.sightsCount || 30;
    const noGos = userInputs.customPreferences['noGos'] || (uiLang === 'de' ? 'Keine' : 'None');

    // 4. GENERATE BRIEFING
    const creativeBriefingBlock = generateCreativeBriefing(project, uiLang);
    
    // 5. BUILD PROMPT (System Instructions in English for performance)
    const prompt = `
# YOUR ROLE & TASK
You are a "Chief Curator" for a premium travel guide. Your reputation depends on the excellence and relevance of your selection. Your **sole task** is to create a qualitatively outstanding and suitable list of **NAMES** for sights and activities.

# MANDATORY CONTEXT (FROM ARCHITECT)
**Search Radius / Logistics Rule:**
"${searchRadiusInstruction}"

**Architect's Briefing:**
"${sammlerBriefing}"

# MISSION 1: THE IMMUTABLE FIXTURES (MOST IMPORTANT!)
- **Goal:** Integrate **all** fixed appointments validated by the Architect.
- **Data:** Use the list under "Validated Appointments" below.
- **Action:** Adopt the exact **\`official_name\`** of EVERY appointment from this list into your final suggestion list.

# MISSION 2: THE SECTION SEARCH (Quality through Specification)
Go through the "Creative Briefing" (Interests) listed below step by step.
- **Step A:** Identify the **"SEARCH RULE"** for EACH interest.
- **Step B:** Find 3 to 5 **concrete candidates** that exactly satisfy this rule.
- **Step C:** If a rule has technical limits (e.g., "Child-friendly"), you MUST NOT choose a place that violates it.

# MISSION 3: THE INDISPENSABLE TOP SIGHTS
- **Goal:** Identify the most famous and important sights ("Must-Sees") if they were not already covered by Mission 2.

# YOUR WORKING METHOD & RULES

### ⚠️ PRIME DIRECTIVE: TECHNICAL CONSTRAINTS ⚠️
In the "Creative Briefing", you will find lines starting with **"SEARCH RULE:"**.
- These rules are **hard filters**.
- A suggestion violating one of these rules (e.g., a 20km hike when 15km is the limit) **MUST** be discarded, no matter how famous.

### Additional Rules
- **Rule 1 (Strict Deduplication):** Your final list must contain **no duplicates** and **NOT A SINGLE PLACE** from the "Already Known Places" list.
- **Rule 2 (Strict Quantity):** The user wants exactly **${targetCount} suggestions**. Stick strictly to this number. Not more, not less (unless physically impossible).
- **Rule 3 (Content):** **FORBIDDEN** are: \`Restaurants\`, \`Cafés\`, \`Bars\`. Do not invent "buffer" activities.
- **Rule 4 (No-Gos):** The following topics are absolute No-Gos: **${noGos}**.

# DATA BASIS

### Already Known Places (Deduplication)
\`\`\`json
${JSON.stringify(existingNames, null, 2)}
\`\`\`

### Validated Appointments (Mission 1)
\`\`\`json
${JSON.stringify(validierteTermine, null, 2)}
\`\`\`

${creativeBriefingBlock}

# MANDATORY OUTPUT FORMAT
Your response MUST be a JSON Array containing the final, deduplicated names of the suggestions as strings.
Example: ["Colosseum", "Forum Romanum", ...]

Response in valid JSON only.
`;

    // PromptBuilder handhabt die Wrapper und Zielsprache (meta.language)
    // FIX: Using type assertion 'as any' for language to ensure compatibility 
    // with strict typing if meta.language is generic string.
    return PromptBuilder.build({
        system: prompt,
        task: "",
        language: project.meta.language as any
    });
};
// --- END OF FILE 140 Zeilen ---