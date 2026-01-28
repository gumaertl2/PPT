// 29.01.2026 18:00 - FEAT: Created GeoAnalyst Preparer (Sights Clustering Logic).
// src/core/prompts/preparers/prepareGeoAnalystPayload.ts

import type { TripProject } from '../../types';

export const prepareGeoAnalystPayload = (project: TripProject) => {
  const { userInputs, data } = project;
  const { logistics } = userInputs;

  // 1. COLLECT SIGHTS FOR CLUSTERING
  // We grab all places to let the AI find the "Center of Gravity"
  const allPlaces = Object.values(data.places || {}).map(p => ({
    name: p.name,
    location: p.location,
    category: p.category
  }));

  // Limit payload size if too many sights (Top 50 is enough for clustering)
  const sightsCluster = allPlaces.slice(0, 50);

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
// --- END OF FILE 42 Zeilen ---