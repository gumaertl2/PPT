// 19.02.2026 11:50 - FIX: Changed 'geo' to 'location' & 'estimatedDuration' to 'duration' (TS2339).
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
      name: hotelPlace?.name || "Zentraler Startpunkt",
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
// --- END OF FILE 90 Zeilen ---