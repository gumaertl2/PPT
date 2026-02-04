// 05.02.2026 16:35 - REFACTOR: RESULT PROCESSOR (DISPATCHER).
// - Acts as a Facade/Router.
// - Delegates logic to specialized processors.
// - All Legacy Logic removed.
// src/services/ResultProcessor.ts

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

      case 'chefredakteur':
        PlaceProcessor.processDetails(data, aiSettings.debug);
        break;

      // 2. FOOD & HOTEL DOMAIN
      case 'foodScout':
      case 'foodEnricher':
      case 'hotelScout':
        FoodProcessor.processFoodOrHotel(data, step, aiSettings.debug);
        break;

      // 3. PLANNING & STRATEGY DOMAIN
      case 'chefPlaner':
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
  }
};
// --- END OF FILE 79 Zeilen ---