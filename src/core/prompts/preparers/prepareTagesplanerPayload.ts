// 17.02.2026 19:40 - FIX: Added 'import type' to resolve binding error.
// 17.02.2026 19:10 - FIX: Removed invalid import (calculateDuration). Logic is inline.
// 17.02.2026 17:30 - FEAT: New Payload Preparer for Tagesplaner (V40 Logic).
// src/core/prompts/preparers/prepareTagesplanerPayload.ts

import type { TripProject, Place } from '../../types/models';

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
    geo: string; // "lat, lng"
  };
  available_sights: string; // Formatted list
  constraints: string; // Additional text constraints
}

export const prepareTagesplanerPayload = (project: TripProject): TagesplanerPayload => {
  const { userInputs, data } = project;
  const places = Object.values(data.places || {});

  // 1. Calculate Dates
  const startDate = userInputs.dates.start;
  const endDate = userInputs.dates.end;
  
  // Simple duration calc (Inline logic to avoid dependency issues)
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // 2. Identify Hotel (Logic: Stationary > Roundtrip Stop 1 > First Hotel found)
  let hotelPlace: Place | undefined;
  
  if (userInputs.logistics.mode === 'stationaer' && userInputs.logistics.stationary.hotel) {
      hotelPlace = data.places[userInputs.logistics.stationary.hotel];
  } 
  
  // Fallback: Search for any hotel with priority or first available
  if (!hotelPlace) {
      hotelPlace = places.find(p => p.category === 'accommodation' || p.category === 'Hotel');
  }

  const hotelBase = {
      name: hotelPlace?.name || "Zentraler Startpunkt",
      address: hotelPlace?.address || userInputs.logistics.stationary.destination || "Stadtzentrum",
      geo: hotelPlace?.geo ? `${hotelPlace.geo.lat}, ${hotelPlace.geo.lng}` : 
           hotelPlace?.location ? `${hotelPlace.location.lat}, ${hotelPlace.location.lng}` : "0,0"
  };

  // 3. Filter & Format Sights
  // Rule: Exclude Priority -1 (Ignore). Include everything else.
  const validPlaces = places.filter(p => {
      // Exclude Hotels from the "Sights" list to avoid confusion.
      if (p.id === hotelPlace?.id) return false;
      
      const prio = p.userPriority ?? (p.userSelection?.priority || 0);
      return prio !== -1;
  });

  const formattedSights = validPlaces.map(p => {
      const prio = p.userPriority ?? (p.userSelection?.priority || 0);
      const isFixed = p.isFixed;
      const duration = p.visitDuration || p.estimatedDuration || 60; // Fallback 60m
      
      const geoStr = p.geo ? `${p.geo.lat.toFixed(4)}, ${p.geo.lng.toFixed(4)}` : 
                     p.location ? `${p.location.lat.toFixed(4)}, ${p.location.lng.toFixed(4)}` : "0,0";

      let tags = `[ID: ${p.id}] [GEO: ${geoStr}] [DURATION: ${duration}m]`;
      
      if (isFixed && p.fixedDate) {
          // Hard Constraint
          const time = p.fixedTime || "10:00";
          tags += ` [FIXED: ${p.fixedDate} ${time}] [PRIO: 1]`; 
      } else {
          // Soft Constraint
          tags += ` [PRIO: ${prio}]`;
      }
      
      // Opening Hours Hint
      if (p.openingHours) {
         const oh = Array.isArray(p.openingHours) ? p.openingHours.join(' | ') : p.openingHours;
         tags += ` [OPEN: ${oh.substring(0, 100)}...]`; 
      }

      return `- ${tags} ${p.name} (${p.category || 'Sight'}): ${p.address || ''}`;
  }).join('\n');

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
    constraints: `Reisegruppe: ${userInputs.travelers.adults} Erwachsene, ${userInputs.travelers.children} Kinder. Tempo: ${userInputs.pace || 'moderat'}.`
  };
};
// --- END OF FILE 95 Zeilen ---