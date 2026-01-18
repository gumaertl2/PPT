// 19.01.2026 13:15 - FIX: Restored V30 Legacy Schema (German Keys) for SSOT compliance.
// src/core/prompts/templates/chefPlaner.ts
// 14.01.2026 17:10 - FIX: Added safety checks for undefined optional properties.
// 15.01.2026 15:30 - UPDATE: Filter empty appointments & Enforce Region Constraint.
// 15.01.2026 15:45 - FIX: Added Start/End Location & Transport Mode.
// 17.01.2026 23:45 - REFACTOR: Migrated to new class-based PromptBuilder pattern.

import type { TripProject, LocalizedContent } from '../../types';
import { PromptBuilder } from '../PromptBuilder';
import { INTEREST_DATA, STRATEGY_OPTIONS } from '../../../data/staticData';

const getFullLanguageName = (code: string): string => {
  const map: Record<string, string> = {
    'de': 'German', 'en': 'English', 'es': 'Spanish', 'fr': 'French',
    'it': 'Italian', 'tr': 'Turkish', 'pt': 'Portuguese', 'nl': 'Dutch',
    'pl': 'Polish', 'ru': 'Russian', 'ja': 'Japanese', 'zh': 'Chinese'
  };
  return map[code] || 'German';
};

/**
 * Hilfsfunktion: Extrahiert Hotels.
 */
const extractHotels = (userInputs: TripProject['userInputs']) => {
  const hotels: any[] = [];
  
  if (userInputs.logistics.mode === 'stationaer') {
    if (userInputs.logistics.stationary.hotel) {
      hotels.push({
        station: userInputs.logistics.stationary.destination,
        hotel: userInputs.logistics.stationary.hotel
      });
    }
  } else {
    // Rundreise: Stops durchgehen
    userInputs.logistics.roundtrip.stops.forEach((stop: any) => {
      if (stop.hotel) {
        hotels.push({
          station: stop.location,
          hotel: stop.hotel
        });
      }
    });
  }
  return hotels;
};

// Helper to resolve localized text
const resolveText = (content: string | LocalizedContent | undefined, lang: 'de' | 'en'): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return content[lang] || content['de'] || '';
};

// Helper: Extract month name from date string (YYYY-MM-DD)
const getMonthName = (dateStr: string, lang: 'de' | 'en'): string => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'long' });
    } catch (e) {
        return '';
    }
};

export const buildChefPlanerPrompt = (project: TripProject, feedback?: string): string => {
  const { userInputs, meta } = project;
  
  // 1. SPRACHE
  const desiredLangCode = userInputs.aiOutputLanguage || meta.language;
  const targetLanguageName = getFullLanguageName(desiredLangCode);
  const uiLang = meta.language === 'en' ? 'en' : 'de';

  // 2. DATEN-AUFBEREITUNG (Interessen & Strategie)
  const activeInterests = userInputs.selectedInterests.map(id => {
    const def = INTEREST_DATA ? INTEREST_DATA[id] : null;
    return { 
      id, 
      label: resolveText(def?.label, uiLang) || id, 
      instruction: resolveText(def?.aiInstruction, uiLang) 
    };
  });

  const strategyDef = STRATEGY_OPTIONS ? STRATEGY_OPTIONS[userInputs.strategyId] : null;
  const strategyInfo = {
    name: resolveText(strategyDef?.label, uiLang) || userInputs.strategyId,
    instruction: resolveText(strategyDef?.promptInstruction, uiLang)
  };

  const extractedHotels = extractHotels(userInputs);
  
  const rawEvents = userInputs.dates.fixedEvents || [];
  const fixedEvents = rawEvents.filter(e => e.name && e.name.trim().length > 0);

  // 3. LOGISTIK-CONSTRAINTS VERBALISIEREN
  let logisticsBriefing = {};
  
  if (userInputs.logistics.mode === 'stationaer') {
    const maxDriveTimeMins = userInputs.logistics.stationary.constraints?.maxDriveTimeDay || 180;
    const maxDriveTimeHours = (maxDriveTimeMins / 60).toFixed(1);
    
    logisticsBriefing = {
      type: "STATIONARY (Hub & Spoke)",
      base_location: userInputs.logistics.stationary.destination,
      constraint_description: `Search Radius Limit: Max ${maxDriveTimeHours} hours drive time (round trip) from base location for daily excursions.`,
      max_drive_time_day_hours: parseFloat(maxDriveTimeHours)
    };
  } else {
    const maxLegMins = userInputs.logistics.roundtrip.constraints?.maxDriveTimeLeg || 360;
    const maxLegHours = (maxLegMins / 60).toFixed(1);
    const maxHotelChanges = userInputs.logistics.roundtrip.constraints?.maxHotelChanges || 99;
    const localRadiusHours = 3; 

    const region = userInputs.logistics.roundtrip.region;
    const regionConstraint = region 
        ? `MANDATORY REGION: "${region}". The trip MUST take place INSIDE this region.` 
        : "Region: Open.";

    const startLoc = userInputs.logistics.roundtrip.startLocation || region || "Not defined";
    const endLoc = userInputs.logistics.roundtrip.endLocation || startLoc;

    logisticsBriefing = {
      type: "ROUNDTRIP (Moving Chain)",
      start_location: startLoc,
      end_location: endLoc,
      stops: userInputs.logistics.roundtrip.stops.map(s => s.location),
      mandatory_region: region || null,
      constraint_description: `Route Feasibility: Max ${maxLegHours} hours drive time between hotels (Legs). Max ${maxHotelChanges} hotel changes allowed. ${regionConstraint}`,
      max_drive_time_leg_hours: parseFloat(maxLegHours),
      max_hotel_changes: maxHotelChanges,
      implied_local_radius_hours: localRadiusHours
    };
  }

  const targetSightsCount = userInputs.searchSettings?.sightsCount || 50;
  const travelMonth = getMonthName(userInputs.dates.start, uiLang);
  const transportMode = userInputs.dates.arrival.type || 'car';

  const contextData = {
    travelers: {
      ...userInputs.travelers,
      pets_included: userInputs.travelers.pets
    },
    dates: {
        start: userInputs.dates.start,
        end: userInputs.dates.end,
        duration: userInputs.dates.duration,
        travel_month: travelMonth,
        arrival: userInputs.dates.arrival
    },
    transport_mode: transportMode,
    logistics_briefing: logisticsBriefing,
    hotels_to_validate: extractedHotels,
    appointments_to_validate: fixedEvents,
    target_sights_count: targetSightsCount,
    strategy: strategyInfo,
    interests: activeInterests,
    custom_notes: userInputs.notes,
    custom_preferences: userInputs.customPreferences,
    target_output_language: targetLanguageName
  };

  // FIX: Schema completely reverted to German V30 keys
  const outputSchema = {
    "gedankenschritte": [
      "String (Schritt 1: Verifiziere Inputs & Logistik...)", 
      "String (Schritt 2: Prüfe Machbarkeit der Distanzen...)",
      "String (Schritt 3: Definiere Suchstrategie...)"
    ],
    "plausibilitaets_check": "String (Einschätzung: Ist die Route/Basis machbar?) | null",
    
    "korrekturen": {
      "destination_typo_found": "Boolean",
      "corrected_destination": "String | null",
      "notes": [ "String" ]
    },

    "validierte_termine": [
      {
        "original_input": "String", "official_name": "String", "address": "String",
        "estimated_duration_min": "Integer"
      }
    ],
    "validierte_hotels": [
      { "station": "String", "official_name": "String", "address": "String" }
    ],
    
    "strategisches_briefing": {
      "search_radius_instruction": "String (Anweisung für den Sammler basierend auf Logistik)", 
      "sammler_briefing": "String (Briefing für Sammler: Fokus auf Strategie & Pet Needs)", 
      "itinerary_rules": "String"
    },
    
    "smart_limit_empfehlung": { 
        "reasoning": "String (Warum diese Anzahl?)", 
        "value": "Integer (Zielanzahl POIs, nah an target_sights_count)" 
    }
  };

  let feedbackSection = '';
  if (feedback) {
    feedbackSection = `\n### IMPORTANT: USER FEEDBACK (CORRECTION LOOP)\nThe user reviewed your previous analysis and requests these changes:\n"""\n${feedback}\n"""\n`;
  }

  const role = `You are the **Lead Travel Architect** ("Chef-Planer").
Your task is to analyze the trip inputs, fix errors, and establish a strategic foundation.${feedbackSection}`;

  const instructions = `# CRITICAL LOGISTICS INSTRUCTIONS
You must strictly adhere to the 'logistics_briefing':
1. **Stationary**: Ensure the search radius does not exceed the 'max_drive_time_day_hours' (round trip).
2. **Roundtrip**: Ensure the legs between stops are feasible within 'max_drive_time_leg_hours'. Respect 'max_hotel_changes'.
3. **Region Constraint**: If 'mandatory_region' is set, you MUST NOT suggest places outside of it.
4. **Target Count**: Aim for a strategy that yields approx. **${targetSightsCount}** candidates.
5. **Start/End**: Use 'start_location' and 'end_location' as fixed anchors.

# WORKFLOW STEPS
1. **ERROR SCAN**: Check for typos.
2. **VALIDATION**: Research official names for hotels/appointments.
3. **PLAUSIBILITY**: Check if the plan works with the given drive-time limits AND transport mode.
4. **BRIEFING**: Write instructions (field 'strategisches_briefing') for the "Collector" agent.

# LANGUAGE
Generate ALL user-facing text in **${targetLanguageName}**.`;

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(contextData, "PROJECT CONTEXT")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'planning'])
    .build();
};
// --- END OF FILE 230 Zeilen ---