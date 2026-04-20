// 20.04.2026 14:10 - FIX: Included 'region' fallback for stationary trips so the ChefPlaner doesn't crash before the Basecamp Scout runs.
// 08.04.2026 15:45 - FIX: Removed legacy local language resolution to ensure SSOT via PromptBuilder.
// 19.03.2026 17:15 - FEAT: Injected 'vibe', 'budget', and 'pace' into context so the Architect can validate feasibility based on persona.
// 27.02.2026 13:55 - FEAT: Injected 'localMobility' into ChefPlaner logistics briefing so the AI knows how the user travels.
// src/core/prompts/preparers/prepareChefPlanerPayload.ts

import type { TripProject, LocalizedContent } from '../../types';
import { INTEREST_DATA, STRATEGY_OPTIONS } from '../../../data/staticData';

// --- DEFINITIONS & WHITELISTS ---

const EXCLUDED_INTERESTS = [
    'hotel', 'camping', 'accommodation',  
    'restaurant', 'food', 'culinary',     
    'logistics', 'transport',             
    'budget',                             
    'city_info', 'general_info'           
];

// --- HELPER FUNCTIONS ---

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
 */
export const prepareChefPlanerPayload = (project: TripProject, feedback?: string) => {
    const { userInputs, meta } = project;
    const uiLang = meta.language === 'en' ? 'en' : 'de';

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

    const strategyDef = STRATEGY_OPTIONS ? STRATEGY_OPTIONS[userInputs.strategyId] : null;
    const strategyInfo = {
        name: resolveText(strategyDef?.label, uiLang) || userInputs.strategyId,
        instruction: resolveText(strategyDef?.promptInstruction, uiLang)
    };

    const extractedHotels = extractHotels(userInputs);
    const rawEvents = userInputs.dates.fixedEvents || [];
    const fixedEvents = rawEvents.filter(e => e.name && e.name.trim().length > 0);

    let logisticsBriefing = {};
    
    // FEAT: Inject local mobility for better spatial awareness
    const localMobility = userInputs.logistics.localMobility || 'car';
    
    if (userInputs.logistics.mode === 'stationaer') {
        const maxDriveTimeMins = userInputs.logistics.stationary.constraints?.maxDriveTimeDay || 180;
        const maxDriveTimeHours = (maxDriveTimeMins / 60).toFixed(1);
        
        // FIX: Berücksichtige die Region, falls die Destination noch fehlt!
        const destination = userInputs.logistics.stationary.destination;
        const region = userInputs.logistics.stationary.region;
        const effectiveLocation = destination || region || "Not defined";
        
        let scoutingNote = "";
        if (!destination && region) {
             scoutingNote = " NOTE: The user has ONLY provided a target region. The exact base-camp city will be scouted in the next step. For now, base your general season and logistics analysis on the provided region.";
        }
        
        logisticsBriefing = {
            type: "STATIONARY (Hub & Spoke)",
            base_location: effectiveLocation,
            mandatory_region: region || null,
            local_mobility_preference: localMobility,
            constraint_description: `Search Radius Limit: Max ${maxDriveTimeHours} hours travel time (round trip) using ${localMobility}.${scoutingNote}`,
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
            local_mobility_preference: localMobility,
            mandatory_region: region || null,
            constraint_description: `Route Feasibility: Max ${maxLegHours} hours drive time between hotels (Legs). Max ${maxHotelChanges} hotel changes allowed. User uses ${localMobility} locally. ${regionConstraint}`,
            max_drive_time_leg_hours: parseFloat(maxLegHours),
            max_hotel_changes: maxHotelChanges,
            implied_local_radius_hours: localRadiusHours
        };
    }

    const targetSightsCount = userInputs.searchSettings?.sightsCount || 50;
    const travelMonth = getMonthName(userInputs.dates.start, uiLang);
    const transportMode = userInputs.dates.arrival.type || 'car';

    let feedbackSection = '';
    if (feedback) {
        feedbackSection = `\n### IMPORTANT: USER FEEDBACK (CORRECTION LOOP)\nThe user reviewed your previous analysis and requests these changes:\n"""\n${feedback}\n"""\n`;
    }

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
            interests: activeInterests, 
            custom_notes: userInputs.notes,
            custom_preferences: userInputs.customPreferences,
            vibe: userInputs.vibe,
            budget: userInputs.budget,
            pace: userInputs.pace
        },
        meta: {
            target_sights_count: targetSightsCount,
            feedbackSection 
        }
    };
};