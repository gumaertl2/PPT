// 22.01.2026 23:30 - FIX: Synchronized Schema with CoT Instruction (added _thought_process).
// 20.01.2026 22:00 - FIX: Restored V40 Architecture. Applied strict V30 logic to Rule 4 (No Food/Hotels).
// src/core/prompts/templates/basis.ts
// 19.01.2026 17:05 - FIX: Updated property access to match German keys in types.ts (ChefPlanerResult).
// 18.01.2026 12:20 - REFACTOR: Verified and maintained clean Data Model access (searchStrategy vs writingGuideline).
// 17.01.2026 23:50 - REFACTOR: Migrated to class-based PromptBuilder.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';
import { INTEREST_DATA } from '../../../data/interests';

/**
 * Helper: Extract month name
 */
const getMonthName = (dateStr: string, lang: 'de' | 'en'): string => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'long' });
    } catch (e) {
        return '';
    }
};

/**
 * Generiert das "Kreative Briefing" basierend auf der SAUBEREN searchStrategy.
 */
const generateCreativeBriefing = (project: TripProject, lang: 'de' | 'en'): string => {
  const { userInputs } = project;
  const interests = userInputs.selectedInterests || [];
  
  if (interests.length === 0) return "";

  let briefing = "### CREATIVE BRIEFING (Interests & Search Rules)\n";
  
  interests.forEach(id => {
    const def = INTEREST_DATA ? INTEREST_DATA[id] : null;
    if (def) {
      const label = (def.label as any)[lang] || id;
      
      // 1. ZUGRIFF AUF NEUES FELD (Core Logic)
      let searchStrategy = (def.searchStrategy as any)?.[lang];

      // Fallback
      if (!searchStrategy) {
           const legacy = (def.aiInstruction as any)?.[lang] || "";
           searchStrategy = legacy || `Find suitable candidates related to ${label}.`;
      }
      
      // 2. USER OVERRIDES
      const customStrat = userInputs.customSearchStrategies?.[id];
      if (customStrat) {
          searchStrategy = `CUSTOM STRATEGY OVERRIDE: ${customStrat}`;
      }

      // 3. User Wishes
      const customPref = userInputs.customPreferences[id] 
        ? `(USER SPECIFIC WISH: "${userInputs.customPreferences[id]}")` 
        : "";
      
      briefing += `\n**Topic: ${label}**\n`;
      briefing += `- STRATEGY: ${searchStrategy} ${customPref}\n`;
    }
  });

  return briefing;
};

export const buildBasisPrompt = (project: TripProject): string => {
    const { userInputs, meta, analysis } = project;
    const chefPlaner = analysis.chefPlaner;
    const { logistics, dates } = userInputs;
    
    const uiLang = meta.language === 'en' ? 'en' : 'de';
    
    // FIX: Accessing V40 English Keys
    const strategicBriefing = chefPlaner?.strategic_briefing;
    
    // 2. CONTEXT: SEASON & TRANSPORT
    const travelMonth = getMonthName(dates.start, uiLang) || "Unknown Season";
    const transportMode = (dates.arrival as any).type || 'car';
    
    let transportContext = "";
    if (transportMode === 'camper' || transportMode === 'mobile_home') {
        transportContext = "Transport: Large Camper/RV. Avoid narrow centers. Prefer nature & scenic stops.";
    } else {
        transportContext = `Transport: ${transportMode}.`;
    }

    // 3. LOGIC: GEO CONTEXT
    let searchRadiusInstruction = (strategicBriefing as any)?.search_radius_instruction || "Search within the destination.";
    
    if (logistics.mode === 'mobil') {
        const stops = logistics.roundtrip.stops || [];
        const region = logistics.roundtrip.region || "Region";
        const start = logistics.roundtrip.startLocation || region;
        const end = logistics.roundtrip.endLocation || start;
        
        const routeString = stops.length > 0
             ? `${start} -> ${stops.map(s => s.location).join(" -> ")} -> ${end}`
             : `Route from ${start} to ${end} through ${region}`;
             
        searchRadiusInstruction = `
        **MODE: ROUNDTRIP**
        Do not search in a single radius. 
        Search strictly along this route corridor: ${routeString}.
        Focus on stops and logical breaks along the path.
        `;
    } else if (logistics.mode === 'stationaer') {
         const base = logistics.stationary.destination;
         searchRadiusInstruction = `**MODE: STATIONARY**\nBase Location: ${base}.\nSearch for day-trips reachable from here.`;
    }
    
    const sammlerBriefing = (strategicBriefing as any)?.sammler_briefing || ""; 
    
    // FIX: Accessing V40 English Key
    const validatedAppointments = chefPlaner?.validated_appointments || [];
    
    // 4. DEDUPLIZIERUNG
    const existingNames = Object.values(project.data.places || {}).map((p: any) => p.name);

    // 5. TARGETS & CONSTRAINTS
    const targetCount = userInputs.searchSettings?.sightsCount || 30;
    const noGos = userInputs.customPreferences['noGos'] || (uiLang === 'de' ? 'Keine' : 'None');

    // 6. GENERATE BRIEFING STRING
    const creativeBriefingBlock = generateCreativeBriefing(project, uiLang);

    // --- PROMPT CONSTRUCTION via Builder ---

    const role = `You are a "Chief Curator" for a premium travel guide (The "Collector"). Your reputation depends on the excellence and relevance of your selection. 
    Your **sole task** is to create a qualitatively outstanding and suitable list of **NAMES** for sights and activities based on the user's interests.
    You do NOT write descriptions. You ONLY collect the best candidates.`;

    const contextData = {
        travel_season: travelMonth,
        transport_mode_context: transportContext,
        already_known_places_block: existingNames, 
        mandatory_appointments: validatedAppointments,  // FIX: Using new variable
        no_gos: noGos
    };

    const instructions = `# LOGISTICS & GEO CONTEXT (MANDATORY)
${searchRadiusInstruction}

# ARCHITECT'S STRATEGY
"${sammlerBriefing}"

# MISSION 1: THE IMMUTABLE FIXTURES
- Integrate **all** "mandatory_appointments" from the context.
- Use their exact \`official_name\`.

# MISSION 2: THE CURATED SELECTION (CORE TASK)
${creativeBriefingBlock}

For each Topic above:
1. Understand the "STRATEGY".
2. Find 3-5 concrete, high-quality candidates that match this strategy.
3. Ensure the place is open/accessible in ${travelMonth}.

# MISSION 3: FILL THE REST
- If the curated selection doesn't reach the target count, fill the rest with absolute "Must-Sees" for the region.

# RULES
1. **Deduplication:** NO names from "already_known_places_block".
2. **Quantity:** Exactly **${targetCount} suggestions**.
3. **No-Gos:** Strictly avoid "${noGos}".
4. **Content (STRICT):** ABSOLUTELY FORBIDDEN: Restaurants, Hotels, Accommodations, Cafés, Bars. Even if requested in topics. These are handled by specialized agents. Focus ONLY on Sights, Nature, Activities.
5. **Names:** Output precise, official names (e.g., "Eiffelturm" instead of "Tower in Paris").
6. **Route:** Strictly adhere to the defined route corridor (if Roundtrip).`;

    // FIX: Explicitly added _thought_process to Schema for CoT sync
    const outputSchema = {
        "_thought_process": "String (Strategy check: Seasonality, Mix & Dedup)",
        "candidates": [
            "String (Name of Candidate 1)",
            "String (Name of Candidate 2)",
            "..."
        ]
    };

    return new PromptBuilder()
        .withOS()
        .withRole(role)
        .withContext(contextData, "DATA BASIS & CONSTRAINTS")
        .withInstruction(instructions)
        .withOutputSchema(outputSchema)
        .withSelfCheck(['basic', 'research'])
        .build();
};
// --- END OF FILE 142 Zeilen ---