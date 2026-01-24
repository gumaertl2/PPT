// 24.01.2026 19:30 - FEAT: New Preparer for ChefPlaner.
// Implements "Exclusion Protocol": Filters out Non-Sammler interests (Hotels, Restaurants)
// to prevent the ChefPlaner from assigning wrong tasks to the Collector.
// src/core/prompts/preparers/prepareChefPlanerPayload.ts

import type { TripProject, LocalizedContent } from '../../types';
import { INTEREST_DATA, STRATEGY_OPTIONS } from '../../../data/staticData';

// --- DEFINITIONS & WHITELISTS ---

// These categories are handled by SPECIALIST AGENTS (HotelScout, FoodScout).
// The ChefPlaner must NOT instruct the Collector (Sammler) to search for these.
const EXCLUDED_INTERESTS = [
    'hotel', 'camping', 'accommodation',  // -> HotelScout
    'restaurant', 'food', 'culinary',     // -> FoodScout
    'logistics', 'transport',             // -> RouteArchitect
    'budget',                             // -> Controller
    'city_info', 'general_info'           // -> ContentScout
];

// --- HELPER FUNCTIONS (Ported from Template) ---

const getFullLanguageName = (code: string): string => {
  const map: Record<string, string> = {
    'de': 'German', 'en': 'English', 'es': 'Spanish', 'fr': 'French',
    'it': 'Italian', 'tr': 'Turkish', 'pt': 'Portuguese', 'nl': 'Dutch',
    'pl': 'Polish', 'ru': 'Russian', 'ja': 'Japanese', 'zh': 'Chinese'
  };
  return map[code] || 'German';
};

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

const resolveText = (content: string | LocalizedContent | undefined, lang: 'de' | 'en'): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return content[lang] || content['de'] || '';
};

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
 * Der Preparer für den "ChefPlaner".
 * Bereitet alle Daten vor und filtert falsche Interessen heraus.
 */
export const prepareChefPlanerPayload = (project: TripProject, feedback?: string) => {
    const { userInputs, meta } = project;
    const uiLang = meta.language === 'en' ? 'en' : 'de';

    // 1. LANGUAGE & META
    const desiredLangCode = userInputs.aiOutputLanguage || meta.language;
    const targetLanguageName = getFullLanguageName(desiredLangCode);

    // 2. INTERESTS FILTERING (THE FIX)
    // We only pass interests that are NOT in the exclusion list.
    const safeInterestIds = userInputs.selectedInterests.filter(id => 
        !EXCLUDED_INTERESTS.includes(id.toLowerCase())
    );

    const activeInterests = safeInterestIds.map(id => {
        const def = INTEREST_DATA ? INTEREST_DATA[id] : null;
        return { 
            id, 
            label: resolveText(def?.label, uiLang) || id, 
            instruction: resolveText(def?.aiInstruction, uiLang) 
        };
    });

    // 3. STRATEGY
    const strategyDef = STRATEGY_OPTIONS ? STRATEGY_OPTIONS[userInputs.strategyId] : null;
    const strategyInfo = {
        name: resolveText(strategyDef?.label, uiLang) || userInputs.strategyId,
        instruction: resolveText(strategyDef?.promptInstruction, uiLang)
    };

    // 4. LOGISTICS & CONSTRAINTS
    const extractedHotels = extractHotels(userInputs);
    const rawEvents = userInputs.dates.fixedEvents || [];
    const fixedEvents = rawEvents.filter(e => e.name && e.name.trim().length > 0);

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

    // 5. FEEDBACK LOOP
    let feedbackSection = '';
    if (feedback) {
        feedbackSection = `\n### IMPORTANT: USER FEEDBACK (CORRECTION LOOP)\nThe user reviewed your previous analysis and requests these changes:\n"""\n${feedback}\n"""\n`;
    }

    // 6. BUILD FINAL CONTEXT
    return {
        context: {
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
            interests: activeInterests, // <-- FILTERED LIST
            custom_notes: userInputs.notes,
            custom_preferences: userInputs.customPreferences,
            target_output_language: targetLanguageName
        },
        meta: {
            target_sights_count: targetSightsCount,
            targetLanguageName,
            feedbackSection // We pass this separate to inject into role/instruction if needed
        }
    };
};
// --- END OF FILE 168 Zeilen --- 