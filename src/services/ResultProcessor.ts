// 23.02.2026 14:55 - FIX: Restored Facade/Router architecture. Added hotel-sync helper to bridge the data gap.
// 06.02.2026 16:15 - FIX: Added handler for 'details' task (mapped to Chefredakteur).
// - Acts as a Facade/Router. Delegates logic to specialized processors.
// src/services/ResultProcessor.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../store/useTripStore';
import type { WorkflowStepId, TaskKey } from '../core/types';

// Importing Specialized Processors
import { PlaceProcessor } from './processors/PlaceProcessor';
import { FoodProcessor } from './processors/FoodProcessor';
import { PlanningProcessor } from './processors/PlanningProcessor';

export const ResultProcessor = {
  process: (step: WorkflowStepId | TaskKey, data: any) => {
    const state = useTripStore.getState();
    const { aiSettings, logEvent } = state; 

    // Debug Logging
    if (aiSettings.debug) {
      logEvent({
        task: step,
        type: 'info',
        content: `Processing Result for ${step}`,
        meta: { dataKeys: Object.keys(data || {}) }
      });
    }

    // --- ROUTING LOGIC ---
    switch (step) {
      // 1. PLACE DOMAIN
      case 'basis':
        PlaceProcessor.processBasis(data);
        break;

      case 'anreicherer':
        PlaceProcessor.processAnreicherer(data, aiSettings.debug);
        break;

      case 'details': 
      case 'chefredakteur':
        PlaceProcessor.processDetails(data, aiSettings.debug);
        break;

      // 2. FOOD & HOTEL DOMAIN
      case 'foodScout':
      case 'foodEnricher':
        FoodProcessor.processFoodOrHotel(data, step, aiSettings.debug);
        break;

      case 'hotelScout':
        FoodProcessor.processFoodOrHotel(data, step, aiSettings.debug);
        // NEW: Mirror results to places for map visibility
        if (data.candidates) ResultProcessor.syncHotelsToPlaces(data.candidates);
        break;

      // 3. PLANNING & STRATEGY DOMAIN
      case 'chefPlaner':
        PlanningProcessor.processAnalysis(step, data);
        // NEW: Mirror manual hotels to places
        if (data.validated_hotels) ResultProcessor.syncHotelsToPlaces(data.validated_hotels);
        break;

      case 'routeArchitect':
      case 'initialTagesplaner':
      case 'transferPlanner':
      case 'geoAnalyst':
        PlanningProcessor.processAnalysis(step, data);
        break;
      
      // 4. CONTENT & SPECIALS
      case 'ideenScout':
        PlanningProcessor.processIdeenScout(data, aiSettings.debug);
        break;

      case 'infoAutor':
        PlanningProcessor.processInfoAutor(data);
        break;

      case 'tourGuide':
        PlanningProcessor.processTourGuide(data);
        break;

      case 'countryScout':
        PlanningProcessor.processCountryScout(data);
        break;

      default:
        console.warn(`[ResultProcessor] ⚠️ No handler found for step: ${step}`);
    }
  },

  /**
   * Private Helper: Synchronizes hotels into the 'places' collection for the map.
   * Keeps the dispatcher clean while solving the visibility issue.
   */
  syncHotelsToPlaces: (hotels: any[]) => {
      const { project, setProject } = useTripStore.getState();
      const updatedPlaces = { ...project.data.places };
      let hasChanges = false;

      hotels.forEach(h => {
          const name = h.official_name || h.name;
          if (!name) return;
          const exists = Object.values(updatedPlaces).some((p: any) => p.name === name);
          if (!exists) {
              const id = h.id || `hotel-${uuidv4()}`;
              updatedPlaces[id] = {
                  id, name, official_name: name, category: 'hotel',
                  address: h.address || h.station || '', location: h.location || null,
                  userPriority: 1, visited: false, coordinatesValidated: !!h.location
              };
              hasChanges = true;
          }
      });
      if (hasChanges) setProject({ ...project, data: { ...project.data, places: updatedPlaces } });
  }
};
// --- END OF FILE 105 Zeilen ---