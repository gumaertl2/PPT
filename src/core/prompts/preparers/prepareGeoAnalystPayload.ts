// 31.01.2026 15:00 - FEAT: Smart Sight Selection. Prioritize active itinerary sights over random collection.
// 29.01.2026 18:00 - FEAT: Created GeoAnalyst Preparer (Sights Clustering Logic).
// src/core/prompts/preparers/prepareGeoAnalystPayload.ts

import type { TripProject } from '../../types';

export const prepareGeoAnalystPayload = (project: TripProject) => {
  const { userInputs, data, itinerary } = project;
  const { logistics } = userInputs;

  // 1. COLLECT SIGHTS FOR CLUSTERING
  // Logic: "Active Sights" (from Itinerary) > "All Sights" (Fallback)
  let validSights: any[] = [];
  
  // Check if we have a valid itinerary with days
  const hasItinerary = itinerary?.days && Array.isArray(itinerary.days) && itinerary.days.length > 0;

  if (hasItinerary) {
      // Extract IDs from Dayplan (Active Sights)
      const activeIds = new Set<string>();
      itinerary.days.forEach((day: any) => {
          // Check standard activity structure
          if (day.aktivitaeten && Array.isArray(day.aktivitaeten)) {
               day.aktivitaeten.forEach((act: any) => {
                   if (act.placeId) activeIds.add(act.placeId);
                   if (act.original_sight_id) activeIds.add(act.original_sight_id);
                   if (act.id) activeIds.add(act.id);
               });
          }
          // English Fallback
          if (day.activities && Array.isArray(day.activities)) {
              day.activities.forEach((act: any) => {
                  if (act.placeId) activeIds.add(act.placeId);
                  if (act.original_sight_id) activeIds.add(act.original_sight_id);
                  if (act.id) activeIds.add(act.id);
              });
          }
      });

      // Filter collected places using the Active Set
      validSights = Object.values(data.places || {})
          .filter(p => activeIds.has(p.id))
          .map(p => ({
              name: p.name,
              location: p.location,
              category: p.category
          }));
      
      // Fallback: If itinerary has no linked sights (e.g. empty days), fall back to ALL sights
      // to ensure we don't send an empty cluster.
      if (validSights.length === 0) {
           validSights = Object.values(data.places || {}).map(p => ({
              name: p.name,
              location: p.location,
              category: p.category
          }));
      }

  } else {
      // No Itinerary -> Use all collected sights (Pre-Planning Phase)
      validSights = Object.values(data.places || {}).map(p => ({
        name: p.name,
        location: p.location,
        category: p.category
      }));
  }

  // Limit payload size if too many sights (Top 50 is enough for clustering)
  const sightsCluster = validSights.slice(0, 50);

  // 2. DEFINE CONTEXT
  let context: any = {
    mode: logistics.mode,
    arrival: userInputs.dates.arrival,
    sights_cluster: sightsCluster
  };

  if (logistics.mode === 'stationaer') {
    context.destination = logistics.stationary.destination;
    context.region = logistics.stationary.region;
  } else {
    context.route_stops = logistics.roundtrip.stops;
    context.region = logistics.roundtrip.region;
  }

  // 3. STRATEGIC INSTRUCTION
  const instruction = `Analyze the provided 'sights_cluster'. Identify the optimal base (District or Hub) that minimizes travel time to these locations.`;

  return {
    context,
    instructions: {
      role: "You are the Location Strategist. Ignore individual hotels, find the best AREA.",
      task_override: instruction
    }
  };
};
// --- END OF FILE 87 Zeilen ---