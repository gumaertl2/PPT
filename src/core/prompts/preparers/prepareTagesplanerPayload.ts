// 19.02.2026 18:00 - FEAT: Injected deep PACE_OPTIONS instructions into constraints.
// 19.02.2026 11:50 - FIX: Changed 'geo' to 'location' & 'estimatedDuration' to 'duration'.
// src/core/prompts/preparers/prepareTagesplanerPayload.ts

import type { TripProject, Place } from '../../types/models';
import { PACE_OPTIONS } from '../../../data/options';

export interface TagesplanerPayload {
  travel_dates: {
    start: string;
    end: string;
    total_days: number;
    daily_start: string;
    daily_end: string;
  };
  hotel_base: {
    name: string;
    address: string;
    geo: string; 
  };
  available_sights: string; 
  constraints: string; 
}

export const prepareTagesplanerPayload = (project: TripProject): TagesplanerPayload => {
  const { userInputs, data } = project;
  const places = Object.values(data.places || {});

  const startDate = userInputs.dates.start;
  const endDate = userInputs.dates.end;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  let hotelPlace: Place | undefined;
  
  if (userInputs.logistics.mode === 'stationaer' && userInputs.logistics.stationary.hotel) {
      hotelPlace = data.places[userInputs.logistics.stationary.hotel];
  } 
  
  if (!hotelPlace) {
      hotelPlace = places.find(p => p.category === 'accommodation' || p.category === 'Hotel');
  }

  const hotelBase = {
      name: hotelPlace?.name || "Unterkunft",
      address: hotelPlace?.address || userInputs.logistics.stationary.destination || "Stadtzentrum",
      geo: hotelPlace?.location ? `${hotelPlace.location.lat}, ${hotelPlace.location.lng}` : "0,0"
  };

  const validPlaces = places.filter(p => {
      if (p.id === hotelPlace?.id) return false;
      const prio = p.userPriority ?? (p.userSelection?.priority || 0);
      return prio !== -1;
  });

  const formattedSights = validPlaces.map(p => {
      const prio = p.userPriority ?? (p.userSelection?.priority || 0);
      const isFixed = p.isFixed;
      const duration = p.visitDuration || p.duration || 60; 
      
      const geoStr = p.location ? `${p.location.lat.toFixed(4)}, ${p.location.lng.toFixed(4)}` : "0,0";

      let tags = `[ID: ${p.id}] [GEO: ${geoStr}] [DURATION: ${duration}m]`;
      
      if (isFixed && p.fixedDate) {
          const time = p.fixedTime || "10:00";
          tags += ` [FIXED: ${p.fixedDate} ${time}] [PRIO: 1]`; 
      } else {
          tags += ` [PRIO: ${prio}]`;
      }
      
      if (p.openingHours) {
         const oh = Array.isArray(p.openingHours) ? p.openingHours.join(' | ') : p.openingHours;
         tags += ` [OPEN: ${oh.substring(0, 100)}...]`; 
      }

      return `- ${tags} ${p.name} (${p.category || 'Sight'}): ${p.address || ''}`;
  }).join('\n');

  // FIX: Extract deep instruction from PACE_OPTIONS
  const paceKey = userInputs.pace || 'balanced';
  const paceConfig = PACE_OPTIONS[paceKey];
  const paceInstruction = paceConfig?.promptInstruction?.en || paceConfig?.promptInstruction?.de || 'Standard pace. Include a 60 min lunch break.';

  return {
    travel_dates: {
        start: startDate,
        end: endDate,
        total_days: totalDays,
        daily_start: userInputs.dates.dailyStartTime || "09:00",
        daily_end: userInputs.dates.dailyEndTime || "18:00"
    },
    hotel_base: hotelBase,
    available_sights: formattedSights,
    constraints: `TRAVEL GROUP: ${userInputs.travelers.adults} Adults, ${userInputs.travelers.children} Children.
PACE & RHYTHM RULES (CRITICAL): ${paceInstruction}
USER TIME OVERRIDES: The user explicitly requested daily start at ${userInputs.dates.dailyStartTime || "09:00"} and end at ${userInputs.dates.dailyEndTime || "18:00"}. Adjust the pace instruction times to fit these overrides if necessary!`
  };
};
// --- END OF FILE 98 Zeilen ---