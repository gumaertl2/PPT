// 24.01.2026 14:30 - FEAT: Advanced Basis Preparer. Implements "Hierarchy of Truth": ChefPlaner > RouteArchitect > UserInput.
// src/core/prompts/preparers/prepareBasisPayload.ts

import type { TripProject } from '../../types';
import { INTEREST_DATA } from '../../../data/interests';

/**
 * Helper: Extract month name for Seasonality Context
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
 * Generiert das "Kreative Briefing" basierend auf den Interessen.
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
      
      // 1. Core Logic: Search Strategy aus INTEREST_DATA
      let searchStrategy = (def.searchStrategy as any)?.[lang];

      // Fallback
      if (!searchStrategy) {
           const legacy = (def.aiInstruction as any)?.[lang] || "";
           searchStrategy = legacy || `Find suitable candidates related to ${label}.`;
      }
      
      // 2. User Overrides (Custom Strategy)
      const customStrat = userInputs.customSearchStrategies?.[id];
      if (customStrat) {
          searchStrategy = `CUSTOM STRATEGY OVERRIDE: ${customStrat}`;
      }

      // 3. User Specific Wishes (Custom Preference field)
      const customPref = userInputs.customPreferences[id] 
        ? `(USER SPECIFIC WISH: "${userInputs.customPreferences[id]}")` 
        : "";
      
      briefing += `\n**Topic: ${label}**\n`;
      briefing += `- STRATEGY: ${searchStrategy} ${customPref}\n`;
    }
  });

  return briefing;
};

/**
 * Der Preparer für den "Sammler" (Basis).
 * Berechnet alle Kontext-Variablen im Voraus und respektiert die Daten-Hierarchie.
 */
export const prepareBasisPayload = (project: TripProject) => {
    const { userInputs, meta, analysis } = project;
    const chefPlaner = analysis.chefPlaner;
    const routeArchitect = analysis.routeArchitect; // <--- LEVEL 2 TRUTH
    const { logistics, dates } = userInputs;
    
    const uiLang = meta.language === 'en' ? 'en' : 'de';
    
    // 1. Data Sources (Hierarchy Check)
    const strategicBriefing = chefPlaner?.strategic_briefing;
    const validatedAppointments = chefPlaner?.validated_appointments || [];
    const existingNames = Object.values(project.data.places || {}).map((p: any) => p.name);
    
    // 2. Context: Season & Transport
    const travelMonth = getMonthName(dates.start, uiLang) || "Unknown Season";
    const transportMode = (dates.arrival as any).type || 'car';
    
    let transportContext = "";
    if (transportMode === 'camper' || transportMode === 'mobile_home') {
        transportContext = "Transport: Large Camper/RV. Avoid narrow centers. Prefer nature & scenic stops.";
    } else {
        transportContext = `Transport: ${transportMode}.`;
    }

    // 3. Logic: Geo Context (The "Hierarchy of Truth" Implementation)
    let searchRadiusInstruction = (strategicBriefing as any)?.search_radius_instruction || "Search within the destination.";
    
    if (logistics.mode === 'mobil') {
        // CASE: RUNDREISE
        let routeString = "";
        
        // CHECK: Haben wir eine berechnete Route vom RouteArchitect?
        const calculatedRoute = routeArchitect?.routes?.[0];
        
        if (calculatedRoute && calculatedRoute.stages && calculatedRoute.stages.length > 0) {
            // OPTION A: Nehme die berechnete Route (SSOT)
            const stages = calculatedRoute.stages.map(s => s.location_name).join(" -> ");
            const waypoints = calculatedRoute.waypoints?.map(w => w.location).join(", ") || "";
            routeString = `CALCULATED ROUTE: ${stages}. (Waypoints: ${waypoints})`;
        } else {
            // OPTION B: Fallback auf User Inputs
            const stops = logistics.roundtrip.stops || [];
            const region = logistics.roundtrip.region || "Region";
            const start = logistics.roundtrip.startLocation || region;
            const end = logistics.roundtrip.endLocation || start;
            
            routeString = stops.length > 0
                 ? `${start} -> ${stops.map(s => s.location).join(" -> ")} -> ${end}`
                 : `Route from ${start} to ${end} through ${region}`;
        }
             
        searchRadiusInstruction = `
        **MODE: ROUNDTRIP**
        Do not search in a single radius. 
        Search strictly along this route corridor: ${routeString}.
        Focus on stops and logical breaks along the path.
        `;
    } else if (logistics.mode === 'stationaer') {
         // CASE: STATIONÄR
         const base = logistics.stationary.destination;
         const region = logistics.stationary.region;
         searchRadiusInstruction = `**MODE: STATIONARY**\nBase Location: ${base} (${region}).\nSearch for day-trips reachable from here.`;
    }
    
    // 4. Strategic Inputs & Supplements
    const sammlerBriefing = (strategicBriefing as any)?.sammler_briefing || ""; 
    const noGos = userInputs.customPreferences['noGos'] || (uiLang === 'de' ? 'Keine' : 'None');
    
    // User Supplements (Traue keiner KI allein)
    const userNotes = userInputs.notes ? `USER NOTES: "${userInputs.notes}"` : "";
    const userVibe = userInputs.vibe ? `DESIRED VIBE: ${userInputs.vibe}` : "";

    // 5. Generate the Creative Briefing Block
    const creativeBriefingBlock = generateCreativeBriefing(project, uiLang);

    // Return the clean Payload Object
    return {
        context: {
            travel_season: travelMonth,
            transport_mode_context: transportContext,
            already_known_places_block: existingNames,
            mandatory_appointments: validatedAppointments,
            no_gos: noGos,
            user_supplements: `${userVibe}\n${userNotes}` // Adding user voice
        },
        instructions: {
            search_radius: searchRadiusInstruction,
            architect_strategy: sammlerBriefing,
            creative_briefing: creativeBriefingBlock
        },
        constraints: {
            target_count: userInputs.searchSettings?.sightsCount || 30
        }
    };
};
// --- END OF FILE 145 Zeilen ---