// 22.01.2026 15:30 - FEAT: Created ResultProcessor to decouple data logic from UI hooks (Refactoring).
// src/services/ResultProcessor.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../store/useTripStore';
import type { WorkflowStepId, TaskKey } from '../core/types';

// --- HELPER: UNIVERSAL ARRAY UNPACKER ---
const findDataArray = (obj: any): any[] => {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;

    // Check known keys first
    const knownKeys = ['candidates', 'processed_places', 'enriched_places', 'sights', 'items', 'places', 'results', 'data', 'output'];
    for (const key of knownKeys) {
        if (Array.isArray(obj[key])) return obj[key];
    }

    // Fallback: Check ALL keys
    if (typeof obj === 'object') {
        for (const key in obj) {
            if (Array.isArray(obj[key]) && obj[key].length > 0) return obj[key];
        }
    }

    return [];
};

export const ResultProcessor = {
  process: (step: WorkflowStepId | TaskKey, data: any) => {
    const state = useTripStore.getState();
    const { 
        aiSettings,
        logEvent,
        setAnalysisResult,
        updatePlace
    } = state;

    if (aiSettings.debug) {
      logEvent({
        task: step,
        type: 'info',
        content: `Processing Result for ${step}`,
        meta: { dataKeys: Object.keys(data || {}) }
      });
    }

    switch (step) {
      case 'basis': {
        const candidates = findDataArray(data);

        if (candidates.length > 0) {
            candidates.forEach((item: any) => {
                // FIX: Strict Type Conversion (The ID Factory)
                const isString = typeof item === 'string';
                const name = isString ? item : item.name;

                if (name) {
                    const id = isString ? uuidv4() : (item.id || uuidv4());

                    // Log conversion for debugging
                    if (isString && aiSettings.debug) {
                        console.log(`[Basis] Auto-converted string to object: "${name}" -> ${id}`);
                    }

                    updatePlace(id, {
                      id,
                      name,
                      category: 'Sight',
                      userPriority: 0,
                      visited: false,
                      // Preserve other fields if item was an object
                      ...(isString ? {} : item)
                    });
                }
            });
            console.log(`[Basis] ${candidates.length} candidates stored.`);
        } else {
            console.warn(`[Basis] Warning: No 'candidates' found.`, data);
        }
        break;
      }

      case 'anreicherer': {
        let enrichedItems = findDataArray(data);

        if (enrichedItems.length === 0 && data && typeof data === 'object' && (data.id || data.name)) {
            enrichedItems = [data];
        }

        if (enrichedItems.length > 0) {
            enrichedItems.forEach((item: any) => {
                const targetId = item.id;
                const existingPlaces = useTripStore.getState().project.data?.places || {};

                if (targetId && existingPlaces[targetId]) {
                   updatePlace(targetId, {
                     ...item,
                     id: targetId,
                     category: item.category || 'Sight',
                     address: item.address,
                     location: item.location,
                     description: item.description,
                     openingHours: item.openingHours
                   });
                } else {
                    console.warn(`[Enricher] ID Mismatch/Missing. Ignoring update for: ${item.name} (ID: ${targetId})`);
                }
            });
            console.log(`[Enricher] ${enrichedItems.length} places processed.`);
        } else {
             console.warn(`[Enricher] Warning: No data found.`, data);
        }
        break;
      }

      case 'chefredakteur':
      case 'details': {
         let details = findDataArray(data);
         if (details.length === 0 && data && typeof data === 'object' && (data.id || data.detailed_description || data.description)) {
             details = [data];
         }

         if (details.length > 0) {
             details.forEach((item: any) => {
                 const targetId = item.id;
                 const existingPlaces = useTripStore.getState().project.data?.places || {};

                 if (targetId && existingPlaces[targetId]) {
                     updatePlace(targetId, {
                         description: item.detailed_description || item.description || item.content,
                         reasoning: item.reasoning
                     });
                 } else {
                     console.warn(`[Details] ID Mismatch/Missing. Ignoring update for: ${item.name} (ID: ${targetId})`);
                 }
             });
             console.log(`[Details] Updated ${details.length} places.`);
         } else {
             console.warn('[Details] No content found. Received:', data);
         }
         break;
      }

      case 'sondertage':
      case 'ideenScout': {
          if (data) setAnalysisResult('ideenScout', data);
          break;
      }

      case 'guide': {
          if (data) setAnalysisResult('tourGuide', data);
          break;
      }

      case 'infoAutor':
      case 'infos': {
          let finalData = data;
          const arr = findDataArray(data);
          if (arr.length > 0) {
              finalData = { chapters: arr };
          }

          if (finalData) {
              setAnalysisResult('infoAutor', finalData);
          }
          break;
      }

      case 'food':
      case 'foodScout':
      case 'foodEnricher': {
        let foodItems = findDataArray(data);
        if (foodItems.length === 0 && data && typeof data === 'object' && data.name) {
            foodItems = [data];
        }

        if (foodItems.length > 0) {
            foodItems.forEach((item: any) => {
                // FIX: Strict Type Conversion for Food
                const isString = typeof item === 'string';
                const name = isString ? item : item.name;

                if (name) {
                    const id = isString ? uuidv4() : (item.id || uuidv4());

                    if (isString && aiSettings.debug) {
                        console.log(`[Food] Auto-converted string to object: "${name}" -> ${id}`);
                    }

                    updatePlace(id, {
                        id,
                        name,
                        category: 'Restaurant',
                        address: isString ? undefined : item.address,
                        location: isString ? undefined : item.location,
                        rating: isString ? 0 : (item.rating || 0),
                        description: isString ? 'Restaurant' : `${item.cuisine || ''} - ${item.priceLevel || ''} (${item.guides?.join(', ') || ''})`,
                        ...(isString ? {} : item)
                    });
                }
            });
            console.log(`[Food] ${foodItems.length} restaurants stored.`);
        }
        break;
      }

      case 'accommodation':
      case 'hotelScout': {
        let hotelItems = findDataArray(data);
        if (hotelItems.length === 0 && data && typeof data === 'object' && data.name) {
            hotelItems = [data];
        }

        if (hotelItems.length > 0) {
            hotelItems.forEach((item: any) => {
                // FIX: Strict Type Conversion for Hotels
                const isString = typeof item === 'string';
                const name = isString ? item : item.name;

                if (name) {
                    const id = isString ? uuidv4() : (item.id || uuidv4());

                    if (isString && aiSettings.debug) {
                        console.log(`[Hotel] Auto-converted string to object: "${name}" -> ${id}`);
                    }

                    updatePlace(id, {
                        id,
                        name,
                        category: 'Hotel',
                        address: isString ? undefined : item.address,
                        location: isString ? undefined : item.location,
                        rating: isString ? 0 : (item.rating || 0),
                        description: isString ? 'Hotel' : (item.description || item.reasoning),
                        ...(isString ? {} : item)
                    });
                }
            });
            console.log(`[Hotel] ${hotelItems.length} hotels stored.`);
        }
        break;
      }

      case 'tourGuide': {
         if (data) setAnalysisResult('tourGuide', data);
         break;
      }

      case 'transferPlanner': {
         if (data) setAnalysisResult('transferPlanner', data);
         break;
      }

      case 'chefPlaner':
         if (data) setAnalysisResult('chefPlaner', data);
         break;

      case 'routeArchitect':
      case 'routenArchitekt':
         if (data) setAnalysisResult('routeArchitect', data);
         break;

      case 'geoAnalyst':
         if (data) setAnalysisResult('geoAnalyst', data);
         break;

      case 'initialTagesplaner':
      case 'dayplan':
         if (data) setAnalysisResult('initialTagesplaner', data);
         break;

      default:
        console.log(`Processor: No specific handler for ${step}`, data);
    }
  }
};
// --- END OF FILE 250 Zeilen ---