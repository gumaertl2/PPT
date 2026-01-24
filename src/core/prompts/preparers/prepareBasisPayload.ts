// 24.01.2026 16:00 - FEAT: Smart Interest Logic. 
// IF interests selected -> Append them. 
// IF NO interests -> Explicit instruction to rely purely on Character/Vibe.
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
 * Generiert das "Kreative Briefing" ODER die "Fallback-Instruktion".
 */
const generateCreativeBriefing = (project: TripProject, lang: 'de' | 'en'): string => {
  const { userInputs } = project;
  const interests = userInputs.selectedInterests || [];
  
  // LOGIC CHANGE: Smart Fallback
  if (interests.length === 0) {
      // CASE 1: Keine Interessen gewählt. 
      // Wir geben eine harte Anweisung, NICHT zu raten, sondern sich auf Charakter/Vibe zu verlassen.
      if (lang === 'de') {
          return "### CREATIVE BRIEFING\nKEINE SPEZIFISCHEN INTERESSEN GEWÄHLT.\nIgnoriere das Thema 'Interessen'. Konzentriere dich zu 100% auf die oben definierte STRATEGIE (Charakter) und den gewünschten VIBE (Emotion). Suche Orte, die diese Stimmung perfekt einfangen.";
      } else {
          return "### CREATIVE BRIEFING\nNO SPECIFIC INTERESTS SELECTED.\nIgnore the topic of 'Interests'. Focus 100% on the STRATEGY (Character) defined above and the desired VIBE (Emotion). Find places that perfectly capture this atmosphere.";
      }
  }

  // CASE 2: Interessen gewählt -> Wir bauen das detaillierte Briefing.
  let briefing = "### CREATIVE BRIEFING (Interests & Search Rules)\n";
  
  interests.forEach(id => {
    const def = INTEREST_DATA ? INTEREST_DATA[id] : null;
    if (def) {
      const label = (def.label as any)[lang] || id;
      
      let searchStrategy = (def.searchStrategy as any)?.[lang];

      if (!searchStrategy) {
           const legacy = (def.aiInstruction as any)?.[lang] || "";
           searchStrategy = legacy || `Find suitable candidates related to ${label}.`;
      }
      
      const customStrat = userInputs.customSearchStrategies?.[id];
      if (customStrat) {
          searchStrategy = `CUSTOM STRATEGY OVERRIDE: ${customStrat}`;
      }

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
 */
export const prepareBasisPayload = (project: TripProject) => {
    const { userInputs, meta, analysis } = project;
    const chefPlaner = analysis.chefPlaner;
    const routeArchitect = analysis.routeArchitect; 
    const { logistics, dates } = userInputs;
    
    const uiLang = meta.language === 'en' ? 'en' : 'de';
    
    // 1. Data Sources
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

    // 3. Logic: Geo Context
    let searchRadiusInstruction = (strategicBriefing as any)?.search_radius_instruction || "Search within the destination.";
    
    if (logistics.mode === 'mobil') {
        let routeString = "";
        const calculatedRoute = routeArchitect?.routes?.[0];
        
        if (calculatedRoute && calculatedRoute.stages && calculatedRoute.stages.length > 0) {
            const stages = calculatedRoute.stages.map(s => s.location_name).join(" -> ");
            const waypoints = calculatedRoute.waypoints?.map(w => w.location).join(", ") || "";
            routeString = `CALCULATED ROUTE: ${stages}. (Waypoints: ${waypoints})`;
        } else {
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
         const base = logistics.stationary.destination;
         const region = logistics.stationary.region;
         searchRadiusInstruction = `**MODE: STATIONARY**\nBase Location: ${base} (${region}).\nSearch for day-trips reachable from here.`;
    }
    
    // 4. Strategic Inputs & Supplements
    const sammlerBriefing = (strategicBriefing as any)?.sammler_briefing || ""; 
    const noGos = userInputs.customPreferences['noGos'] || (uiLang === 'de' ? 'Keine' : 'None');
    
    const userNotes = userInputs.notes ? `USER NOTES: "${userInputs.notes}"` : "";
    const userVibe = userInputs.vibe ? `DESIRED VIBE: ${userInputs.vibe}` : "";

    // 5. Generate the Creative Briefing Block (with new logic)
    const creativeBriefingBlock = generateCreativeBriefing(project, uiLang);

    return {
        context: {
            travel_season: travelMonth,
            transport_mode_context: transportContext,
            already_known_places_block: existingNames,
            mandatory_appointments: validatedAppointments,
            no_gos: noGos,
            user_supplements: `${userVibe}\n${userNotes}` 
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
// --- END OF FILE 153 Zeilen ---