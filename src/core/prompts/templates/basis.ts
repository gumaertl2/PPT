// src/core/prompts/templates/basis.ts
// 17.01.2026 23:50 - REFACTOR: Migrated to class-based PromptBuilder.
// 15.01.2026 16:00 - UPDATE: Preserved Season, Transport Mode & Precise Routing Logic.

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
 * Generiert das "Kreative Briefing" (Such-Regeln basierend auf Interessen)
 */
const generateCreativeBriefing = (project: TripProject, lang: 'de' | 'en'): string => {
  const { userInputs } = project;
  const interests = userInputs.selectedInterests || [];
  
  if (interests.length === 0) return "";

  let briefing = "### CREATIVE BRIEFING (Interests & Search Rules)\n";
  
  interests.forEach(id => {
    // Safety check: INTEREST_DATA might be undefined if not loaded properly
    const def = INTEREST_DATA ? INTEREST_DATA[id] : null;
    if (def) {
      const label = (def.label as any)[lang] || id;
      // Fallback: Falls keine explizite Regel da ist
      const rule = (def.aiInstruction as any)?.[lang] || `Find places related to ${label}.`;
      
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
    const { logistics, dates } = userInputs;
    
    const uiLang = meta.language === 'en' ? 'en' : 'de';
    
    // 1. CHEF PLANER DATEN
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
         // Explizite Übernahme der Base Location Logik
         const base = logistics.stationary.destination;
         searchRadiusInstruction = `**MODE: STATIONARY**\nBase Location: ${base}.\nSearch for day-trips reachable from here.`;
    }
    
    const sammlerBriefing = (strategicBriefing as any)?.sammler_briefing || ""; 
    const validierteTermine = chefPlaner?.validated_appointments || [];
    
    // 4. DEDUPLIZIERUNG
    const existingNames = Object.values(project.data.places || {}).map((p: any) => p.name);

    // 5. TARGETS & CONSTRAINTS
    const targetCount = userInputs.searchSettings?.sightsCount || 30;
    const noGos = userInputs.customPreferences['noGos'] || (uiLang === 'de' ? 'Keine' : 'None');

    // 6. GENERATE BRIEFING STRING
    const creativeBriefingBlock = generateCreativeBriefing(project, uiLang);

    // --- PROMPT CONSTRUCTION via Builder ---

    const role = `You are a "Chief Curator" for a premium travel guide. Your reputation depends on the excellence and relevance of your selection. Your **sole task** is to create a qualitatively outstanding and suitable list of **NAMES** for sights and activities.`;

    const contextData = {
        travel_season: travelMonth,
        transport_mode_context: transportContext,
        already_known_places_block: existingNames, // DEDUPLICATION
        mandatory_appointments: validierteTermine,  // MISSION 1
        no_gos: noGos
    };

    const instructions = `# LOGISTICS & GEO CONTEXT (MANDATORY)
${searchRadiusInstruction}

# ARCHITECT'S STRATEGY
"${sammlerBriefing}"

# MISSION 1: THE IMMUTABLE FIXTURES
- Integrate **all** "mandatory_appointments" from the context.
- Use their exact \`official_name\`.

# MISSION 2: THE SECTION SEARCH
${creativeBriefingBlock}
- For each Topic, find 3-5 concrete candidates that satisfy the SEARCH RULE.
- Strictly obey technical limits (e.g. "Child-friendly").

# MISSION 3: TOP SIGHTS
- Fill the rest with "Must-Sees" if not covered.

# RULES
1. **Deduplication:** NO names from "already_known_places_block".
2. **Quantity:** Exactly **${targetCount} suggestions**.
3. **No-Gos:** Strictly avoid "${noGos}".
4. **Content:** No generic restaurants/bars. Focus on Sights, Nature, Activities.`;

    // Wir ändern das Output-Schema auf ein Objekt, da dies robuster ist als ein Root-Array
    const outputSchema = {
        "kandidaten_liste": [
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
// --- END OF FILE 136 Zeilen ---