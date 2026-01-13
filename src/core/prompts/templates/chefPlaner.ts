// src/core/prompts/templates/chefPlaner.ts
// 09.01.2026 13:45
/**
 * * TEMPLATE: CHEF-PLANER (V40 Final Optimized)
 * * STATUS: V40 Ready
 * * FEATURES: 
 * - Smart Time Constraints (Stationary vs. Roundtrip)
 * - Smart Override (Candidate Count)
 * - Hotel Change Logic included
 */

import type { TripProject } from '../../types';
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
      label: def?.label[uiLang] || id, 
      instruction: def?.aiInstruction[uiLang] || '' 
    };
  });

  const strategyDef = STRATEGY_OPTIONS ? STRATEGY_OPTIONS[userInputs.strategyId] : null;
  const strategyInfo = {
    name: strategyDef?.label[uiLang] || userInputs.strategyId,
    instruction: strategyDef?.promptInstruction[uiLang] || '' 
  };

  const extractedHotels = extractHotels(userInputs);
  const fixedEvents = userInputs.dates.fixedEvents || [];

  // 3. LOGISTIK-CONSTRAINTS VERBALISIEREN
  // Wir bereiten die Logistik-Regeln so auf, dass der Chefplaner sie direkt versteht.
  let logisticsBriefing = {};
  
  if (userInputs.logistics.mode === 'stationaer') {
    // STATIONÄR: Hub & Spoke
    // Default 3h (180 min) falls nicht gesetzt
    const maxDriveTimeMins = userInputs.logistics.stationary.constraints?.maxDriveTimeDay || 180;
    const maxDriveTimeHours = (maxDriveTimeMins / 60).toFixed(1);
    
    logisticsBriefing = {
      type: "STATIONARY (Hub & Spoke)",
      base_location: userInputs.logistics.stationary.destination,
      constraint_description: `Search Radius Limit: Max ${maxDriveTimeHours} hours drive time (round trip) from base location for daily excursions.`,
      max_drive_time_day_hours: parseFloat(maxDriveTimeHours)
    };
  } else {
    // RUNDREISE: Moving Chain
    // Default 6h (360 min) falls nicht gesetzt
    // Fix: Zugriff auf 'maxDriveTimeLeg' laut types.ts (nicht PerLeg)
    const maxLegMins = userInputs.logistics.roundtrip.constraints?.maxDriveTimeLeg || 360;
    const maxLegHours = (maxLegMins / 60).toFixed(1);
    
    // Fix: Hotelwechsel Constraint
    const maxHotelChanges = userInputs.logistics.roundtrip.constraints?.maxHotelChanges || 99;

    // Annahme für Radius vor Ort bei Rundreise: ~3h (ähnlich stationär), 
    // damit der Chefplaner nicht POIs plant, die 5h vom Etappenziel weg sind.
    const localRadiusHours = 3; 

    logisticsBriefing = {
      type: "ROUNDTRIP (Moving Chain)",
      stops: userInputs.logistics.roundtrip.stops.map(s => s.location),
      constraint_description: `Route Feasibility: Max ${maxLegHours} hours drive time between hotels (Legs). Max ${maxHotelChanges} hotel changes allowed. Local Exploration: Max ${localRadiusHours} hours radius around each stop.`,
      max_drive_time_leg_hours: parseFloat(maxLegHours),
      max_hotel_changes: maxHotelChanges,
      implied_local_radius_hours: localRadiusHours
    };
  }

  // Target Count aus Search Settings (Default 50)
  const targetSightsCount = userInputs.searchSettings?.sightsCount || 50;


  const contextData = {
    // Basis-Daten
    travelers: {
      ...userInputs.travelers,
      pets_included: userInputs.travelers.pets
    },
    dates: {
        start: userInputs.dates.start,
        end: userInputs.dates.end,
        duration: userInputs.dates.duration,
        arrival: userInputs.dates.arrival
    },
    
    // --- NEU: Präzise Logistik-Anweisungen ---
    logistics_briefing: logisticsBriefing,
    
    // Listen zur Validierung
    hotels_to_validate: extractedHotels,
    appointments_to_validate: fixedEvents,

    // Strategie & Wünsche
    target_sights_count: targetSightsCount, // <--- Zielwert für Chefplaner
    strategy: strategyInfo,
    interests: activeInterests,
    
    custom_notes: userInputs.notes,
    custom_preferences: userInputs.customPreferences, // Enthält auch No-Gos
    
    target_output_language: targetLanguageName
  };

  // 3. JSON SCHEMA
  // Wir definieren hier nur die Felder für den Prompt-Text zur Erklärung.
  // Das eigentliche Schema wird durch die API/Types erzwungen, aber der Text hilft der KI.
  const outputSchema = {
    "_thought_process": [
      "String (Step 1: Verify inputs & logistics constraints...)", 
      "String (Step 2: Check feasibility of distances based on logistics_briefing...)",
      "String (Step 3: Define search strategy...)"
    ],
    "plausibility_check": "String (Assessment: Is the route/base plausible given the drive time limits?) | null",
    
    "corrections": {
      "destination_typo_found": "Boolean",
      "corrected_destination": "String | null",
      "notes": [ "String" ]
    },

    "validated_appointments": [
      {
        "original_input": "String", "official_name": "String", "address": "String",
        "estimated_duration_min": "Integer"
      }
    ],
    "validated_hotels": [
      { "station": "String", "official_name": "String", "address": "String" }
    ],
    
    "strategic_briefing": {
      "search_radius_instruction": "String (Specific instruction for the Collector based on logistics_briefing constraints)", 
      "sammler_briefing": "String (Briefing for Collector: focus on strategy and pet requirements if applicable)", 
      "itinerary_rules": "String"
    },
    
    "smart_limit_recommendation": { 
        "reasoning": "String (Why this amount?)", 
        "value": "Integer (The target amount. Usually close to target_sights_count unless specific reasons dictate otherwise)" 
    }
  };

  // 4. TASK INSTRUCTION
  let feedbackSection = '';
  if (feedback) {
    feedbackSection = `\n### IMPORTANT: USER FEEDBACK (CORRECTION LOOP)\nThe user reviewed your previous analysis and requests these changes:\n"""\n${feedback}\n"""\n`;
  }

  const taskInstruction = `
# ROLE & OBJECTIVE
You are the **Lead Travel Architect** ("Chef-Planer").
Your task is to analyze the trip inputs, fix errors, and establish a strategic foundation.

${feedbackSection}

# CRITICAL LOGISTICS INSTRUCTIONS
You must strictly adhere to the 'logistics_briefing':
1. **Stationary**: Ensure the search radius does not exceed the 'max_drive_time_day_hours' (round trip).
2. **Roundtrip**: Ensure the legs between stops are feasible within 'max_drive_time_leg_hours'. Respect 'max_hotel_changes'.
3. **Target Count**: Aim for a strategy that yields approx. **${targetSightsCount}** candidates (smart_limit_recommendation).

# WORKFLOW STEPS
1. **ERROR SCAN**: Check for typos.
2. **VALIDATION**: Research official names for hotels/appointments.
3. **PLAUSIBILITY**: Check if the plan works with the given drive-time limits.
4. **BRIEFING**: Write instructions for the "Collector" agent (next step).

# LANGUAGE
Generate ALL user-facing text in **${targetLanguageName}**.

# RESPONSE FORMAT
Respond with valid JSON only:
\`\`\`json
${JSON.stringify(outputSchema, null, 2)}
\`\`\`
`;

  return PromptBuilder.build(taskInstruction, JSON.stringify(contextData, null, 2), desiredLangCode as any);
};