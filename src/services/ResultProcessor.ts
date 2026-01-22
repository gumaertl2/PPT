// 22.01.2026 20:10 - FIX: Enable String-Extraction in Arrays & Restore ID Logging.
// src/services/ResultProcessor.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../store/useTripStore';
import type { WorkflowStepId, TaskKey } from '../core/types';

// --- HELPER: LEVENSHTEIN DISTANCE ---
const getSimilarity = (s1: string, s2: string): number => {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;

    const costs = new Array();
    for (let i = 0; i <= longer.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= shorter.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[shorter.length] = lastValue;
    }
    return (longerLength - costs[shorter.length]) / longerLength;
};

// --- HELPER: SMART ID FINDER ---
const resolvePlaceId = (item: any, existingPlaces: Record<string, any>, debug: boolean): string | undefined => {
    if (item.id && existingPlaces[item.id]) return item.id;

    if (item.name) {
        const searchName = item.name.trim().toLowerCase();
        let bestMatchId: string | undefined = undefined;
        let bestScore = 0;

        Object.values(existingPlaces).forEach((p: any) => {
            if (!p.name) return;
            const targetName = p.name.trim().toLowerCase();
            const score = getSimilarity(searchName, targetName);
            if (score > bestScore) {
                bestScore = score;
                bestMatchId = p.id;
            }
        });

        if (bestScore > 0.8 && bestMatchId) {
            if (debug) console.log(`[ResultProcessor] 🧠 Fuzzy Match: "${item.name}" ≈ "${existingPlaces[bestMatchId].name}" (${(bestScore*100).toFixed(0)}%)`);
            return bestMatchId;
        }
    }
    return undefined;
};

// --- HELPER: THE VACUUM CLEANER V3 (String Support Enabled) ---
const extractItems = (data: any): any[] => {
    let items: any[] = [];

    if (!data) return [];

    // Case A: Array - recurse into elements
    if (Array.isArray(data)) {
        data.forEach(element => {
            if (typeof element === 'object' && element !== null) {
                items = items.concat(extractItems(element));
            } else if (typeof element === 'string') {
                // Allow strings! (Needed for Basis candidates)
                if (element.trim().length > 0) items.push(element);
            }
        });
        return items;
    }

    // Primitives (outside of arrays) are usually not what we want from the root
    if (typeof data !== 'object') return [];

    // Case B: Object
    // 1. Is this a candidate/place itself?
    const isPlace = (data.name || data.id)
        && !data.candidates && !data.enriched_places && !data.places && !data.results;

    if (isPlace) {
        items.push(data);
    }

    // 2. Scan specific container keys (Priority search)
    const containerKeys = ['candidates', 'processed_places', 'enriched_places', 'sights', 'items', 'places', 'results', 'data', 'chapters', 'recommendations'];
    let foundContainer = false;

    for (const key of containerKeys) {
        if (data[key]) {
            items = items.concat(extractItems(data[key]));
            foundContainer = true;
        }
    }

    // 3. Fallback: DEEP SEARCH
    if (!foundContainer) {
         Object.values(data).forEach(value => {
             if (typeof value === 'object' && value !== null) {
                 items = items.concat(extractItems(value));
             }
         });
    }

    return items;
};

export const ResultProcessor = {
  process: (step: WorkflowStepId | TaskKey, data: any) => {
    const state = useTripStore.getState();
    const { aiSettings, logEvent, setAnalysisResult, updatePlace } = state;

    if (aiSettings.debug) {
      logEvent({
        task: step,
        type: 'info',
        content: `Processing Result for ${step}`,
        meta: { dataKeys: Object.keys(data || {}) }
      });
    }

    // --- UNIVERSAL EXTRACTION ---
    const extractedItems = extractItems(data);

    switch (step) {
      case 'basis': {
        if (extractedItems.length > 0) {
            extractedItems.forEach((item: any) => {
                const isString = typeof item === 'string';
                const name = isString ? item : item.name;

                if (name) {
                    const existingPlaces = state.project.data?.places || {};
                    const existingId = resolvePlaceId({ name }, existingPlaces, false);
                    const id = existingId || (isString ? uuidv4() : (item.id || uuidv4()));

                    if (aiSettings.debug) {
                         const logMsg = isString ? `[Basis] String: "${name}"` : `[Basis] Object: "${name}"`;
                         // FIX: Added ID back to log output
                         console.log(existingId ? `${logMsg} -> Merged (${id})` : `${logMsg} -> New ID (${id})`);
                    }

                    updatePlace(id, {
                      id,
                      name,
                      category: 'Sight',
                      userPriority: 0,
                      visited: false,
                      ...(isString ? {} : item)
                    });
                }
            });
            console.log(`[Basis] Processed ${extractedItems.length} items.`);
        } else {
            // DEBUG: Show what we actually got if extraction fails
            console.warn(`[Basis] No items found in payload. Raw Keys:`, Object.keys(data || {}));
            if (aiSettings.debug) console.log('Raw Data Dump:', JSON.stringify(data).substring(0, 200) + '...');
        }
        break;
      }

      case 'anreicherer': {
        const existingPlaces = useTripStore.getState().project.data?.places || {};

        if (extractedItems.length > 0) {
            let successCount = 0;
            extractedItems.forEach((item: any) => {
                const targetId = resolvePlaceId(item, existingPlaces, aiSettings.debug);

                if (targetId) {
                   updatePlace(targetId, {
                     ...item,
                     id: targetId,
                     category: item.category || 'Sight',
                     address: item.address,
                     location: item.location,
                     description: item.description,
                     openingHours: item.openingHours,
                     rating: item.rating
                   });
                   successCount++;
                } else {
                    if (item.name || (typeof item === 'string')) {
                         const n = typeof item === 'string' ? item : item.name;
                         console.warn(`[Enricher] Dropped (No Match): "${n}"`);
                    }
                }
            });
            console.log(`[Enricher] Updated ${successCount} / ${extractedItems.length} extracted items.`);
        } else {
             console.warn(`[Enricher] No items found. Raw keys:`, Object.keys(data || {}));
        }
        break;
      }

      case 'chefredakteur':
      case 'details': {
         const existingPlaces = useTripStore.getState().project.data?.places || {};
         if (extractedItems.length > 0) {
             let successCount = 0;
             extractedItems.forEach((item: any) => {
                 const targetId = resolvePlaceId(item, existingPlaces, aiSettings.debug);
                 if (targetId) {
                     updatePlace(targetId, {
                         description: item.detailed_description || item.description || item.content,
                         reasoning: item.reasoning
                     });
                     successCount++;
                 }
             });
             console.log(`[Details] Updated ${successCount} items.`);
         }
         break;
      }

      case 'food':
      case 'foodScout':
      case 'foodEnricher':
      case 'accommodation':
      case 'hotelScout': {
        const category = ['food', 'foodScout', 'foodEnricher'].includes(step) ? 'Restaurant' : 'Hotel';
        if (extractedItems.length > 0) {
            extractedItems.forEach((item: any) => {
                const isString = typeof item === 'string';
                const name = isString ? item : item.name;
                if (name) {
                    const id = item.id || uuidv4();
                    updatePlace(id, {
                        id,
                        name,
                        category,
                        address: item.address,
                        location: item.location,
                        rating: item.rating || 0,
                        description: isString ? category : (item.description || item.cuisine || ''),
                        ...(isString ? {} : item)
                    });
                }
            });
            console.log(`[${category}] Stored ${extractedItems.length} items.`);
        }
        break;
      }

      case 'sondertage':
      case 'ideenScout':
          if (data) setAnalysisResult('ideenScout', data);
          break;

      case 'guide':
          if (data) setAnalysisResult('tourGuide', data);
          break;

      case 'infoAutor':
      case 'infos':
          if (extractedItems.length > 0) setAnalysisResult('infoAutor', { chapters: extractedItems });
          else if (data) setAnalysisResult('infoAutor', data);
          break;

      case 'tourGuide':
      case 'transferPlanner':
      case 'chefPlaner':
      case 'routeArchitect':
      case 'routenArchitekt':
      case 'geoAnalyst':
      case 'initialTagesplaner':
      case 'dayplan':
         if (data) setAnalysisResult(step as any, data);
         break;

      default:
        console.log(`Processor: No specific handler for ${step}`, data);
    }
  }
};
// --- END OF FILE 308 Zeilen ---