// 19.02.2026 21:30 - FEAT: Added smart Pace Logistics mapping (Start, End, Break times).
// 19.02.2026 21:15 - FIX: Maximized Payload Builder with Roundtrip & full tags.
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

// INTELLIGENTES MAPPING DER REISETEMPI
const PACE_LOGISTICS = {
  relaxed: { start: "10:00", end: "16:30", breakMin: 120 },
  balanced: { start: "09:30", end: "17:30", breakMin: 90 },
  packed: { start: "08:30", end: "19:00", breakMin: 60 }
};

export const prepareTagesplanerPayload = (project: TripProject): TagesplanerPayload => {
  const { userInputs, data } = project;
  const places = Object.values(data.places || {}) as Place[];

  const startDate = userInputs.dates.start;
  const endDate = userInputs.dates.end;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // 1. Logistik & Unterkunfts-Planung (Rundreise vs. Stationär)
  const isRoundtrip = userInputs.logistics.mode === 'roundtrip';
  let accommodationSchedule = "";
  let firstHotel: Place | undefined;

  if (isRoundtrip) {
      let currentDay = 1;
      const stops = userInputs.logistics.roundtrip.stops || [];
      stops.forEach((stop, index) => {
          const hotel = stop.hotel ? data.places[stop.hotel] : undefined;
          if (index === 0) firstHotel = hotel;
          const nights = stop.nights || 1;
          const lastDayOfStop = currentDay + nights - 1;
          accommodationSchedule += `- Day ${currentDay} to ${lastDayOfStop}: Stay in ${stop.city} at "${hotel?.name || 'Local Hotel'}" (${hotel?.address || stop.city})\n`;
          currentDay += nights;
      });
  } else {
      const hotelId = userInputs.logistics.stationary.hotel;
      firstHotel = hotelId ? data.places[hotelId] : places.find(p => p.category === 'accommodation' || p.category === 'Hotel');
      accommodationSchedule = `STATIONARY: Stay all ${totalDays} days at "${firstHotel?.name || 'Unterkunft'}" (${firstHotel?.address || 'Stadtzentrum'})`;
  }

  const hotelBase = {
      name: firstHotel?.name || "Unterkunft",
      address: firstHotel?.address || userInputs.logistics.stationary.destination || "Stadtzentrum",
      geo: firstHotel?.location ? `${firstHotel.location.lat}, ${firstHotel.location.lng}` : "0,0"
  };

  // 2. Kandidatenliste formatieren (Mit allen Tags: [GEO], [DURATION], [PRIO], [FIXED], [OPEN])
  const formattedSights = places
    .filter(p => {
        if (p.category === 'accommodation' || p.category === 'Hotel') return false;
        const prio = p.userPriority ?? (p.userSelection?.priority || 0);
        return prio !== -1;
    })
    .map(p => {
      const prio = p.userPriority ?? (p.userSelection?.priority || 0);
      const isFixed = p.isFixed;
      const duration = p.visitDuration || p.duration || 60; 
      const geoStr = p.location ? `${p.location.lat.toFixed(4)}, ${p.location.lng.toFixed(4)}` : "0,0";

      let tags = `[ID: ${p.id}] [GEO: ${geoStr}] [DURATION: ${duration}m]`;
      if (isFixed && p.fixedDate) {
          tags += ` [FIXED: ${p.fixedDate} ${p.fixedTime || "10:00"}] [PRIO: 1]`; 
      } else {
          tags += ` [PRIO: ${prio}]`;
      }
      if (p.openingHours) {
         const oh = Array.isArray(p.openingHours) ? p.openingHours.join(' | ') : p.openingHours;
         tags += ` [OPEN: ${oh.substring(0, 100)}...]`; 
      }

      return `- ${tags} ${p.name} (${p.category || 'Sight'}): ${p.address || ''}`;
    }).join('\n');

  // 3. Transport-Modi & Reisetempo (Pace)
  const arrival = userInputs.dates.arrival;
  const departure = userInputs.dates.departure;
  const origin = userInputs.travelers.origin || "Heimatort";
  const paceKey = userInputs.pace || 'balanced';
  const paceConfig = PACE_OPTIONS[paceKey];
  const paceInstruction = paceConfig?.promptInstruction?.en || paceConfig?.promptInstruction?.de || 'Standard pace.';
  
  // smarte Zeit-Logik: User-Eingabe ODER Tempo-Standard
  const smartPace = PACE_LOGISTICS[paceKey as keyof typeof PACE_LOGISTICS] || PACE_LOGISTICS.balanced;
  const finalStart = userInputs.dates.dailyStartTime || smartPace.start;
  const finalEnd = userInputs.dates.dailyEndTime || smartPace.end;

  let transportLogistics = `ARRIVAL MODE: ${arrival?.type || 'car'}, DEPARTURE MODE: ${departure?.type || 'car'}.`;
  if (arrival?.type === 'car' || arrival?.type === 'rv') {
      transportLogistics += ` CRITICAL: Start Day 1 directly from ${origin} (Home) by road. DO NOT simulate airport luggage claim.`;
  } else if (arrival?.type === 'flight') {
      transportLogistics += ` FLIGHT ARRIVAL: Time ${arrival.time || '10:00'}. Apply 60min luggage claim rule.`;
  } else if (arrival?.type === 'train') {
      transportLogistics += ` TRAIN ARRIVAL: Time ${arrival.time || '10:00'}. Start from local station.`;
  }

  return {
    travel_dates: {
        start: startDate,
        end: endDate,
        total_days: totalDays,
        daily_start: finalStart,
        daily_end: finalEnd
    },
    hotel_base: hotelBase,
    available_sights: formattedSights,
    constraints: `ACCOMMODATION SCHEDULE (CRITICAL):
${accommodationSchedule}

LOGISTICS & BOUNDARIES:
- ${transportLogistics}
- Return to ${origin} (Home) on the last day.

PACE & RHYTHM:
${paceInstruction}
- Mandatory Lunch Break: ${smartPace.breakMin} minutes.

TIME BOUNDARIES (CRITICAL):
- Day Start: ${finalStart}
- Day End: ${finalEnd}`
  };
};
// --- END OF FILE 141 Zeilen ---