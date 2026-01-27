// 28.01.2026 17:40 - FIX: Added 'waypoints' mapping for Chefredakteur (Walking Tours).
// 28.01.2026 17:05 - FIX: Enhanced mapping for 'details' (Chefredakteur) to catch 'text' and 'article' fields.
// 27.01.2026 23:15 - FIX: Mapping 'user_ratings_total' and 'duration' in Enricher (Gatekeeper Logic).
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
    const containerKeys = ['candidates', 'processed_places', 'enriched_places', 'sights', 'items', 'places', 'results', 'data', 'chapters', 'recommendations', 'articles'];
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
                     rating: item.rating,
                     // FIX: Explicitly map the new fields (Gatekeeper Update)
                     user_ratings_total: item.user_ratings_total,
                     duration: item.duration,
                     website: item.website
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
                     // FIX: Catch all possible content keys to prevent data loss
                     const content = item.text || item.article || item.detailed_description || item.description || item.content;
                     
                     updatePlace(targetId, {
                         detailContent: content,
                         reasoning: item.reasoning,
                         waypoints: item.waypoints // NEW: Map walking tour waypoints
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
        // Hier wird 'Restaurant' als Kategorie für Food gesetzt
        const category = ['food', 'foodScout', 'foodEnricher'].includes(step) ? 'Restaurant' : 'Hotel';
        
        if (extractedItems.length > 0) {
            const rawCandidates: any[] = []; // Collect items for Handover

            extractedItems.forEach((item: any) => {
                const isString = typeof item === 'string';
                const name = isString ? item : item.name;
                
                if (name) {
                    const id = item.id || uuidv4();
                    
                    // 1. Store in DB (SSOT)
                    updatePlace(id, {
                        id,
                        name,
                        category,
                        address: item.address,
                        location: item.location,
                        rating: item.rating || 0,
                        description: isString ? category : (item.description || item.cuisine || ''),
                        
                        // FIX: V30 Data Mapping (Phone, Awards, etc.)
                        phone: item.phone_number,
                        awards: item.awards,
                        openingHoursHint: item.opening_hours_hint,
                        cuisine: item.cuisine,
                        vibe: item.vibe,
                        website: item.website,
                        priceLevel: item.price_level,

                        ...(isString ? {} : item)
                    });

                    // 2. Add to Handover List (if it's the Scout running)
                    if (step === 'foodScout' || step === 'food') {
                        rawCandidates.push({
                            id,
                            name,
                            city: item.city || item.ort,
                            guides: item.guides
                        });
                    }
                }
            });
            
            // --- FIX: HANDOVER TO ENRICHER ---
            // Wir speichern die Kandidaten explizit in 'rawFoodCandidates',
            // damit der Enricher im nächsten Schritt weiß, was er tun soll.
            if ((step === 'foodScout' || step === 'food') && rawCandidates.length > 0) {
                console.log(`[ResultProcessor] 🤝 Handing over ${rawCandidates.length} candidates to FoodEnricher (rawFoodCandidates).`);
                
                useTripStore.setState((s) => ({
                    project: {
                        ...s.project,
                        data: {
                            ...s.project.data,
                            content: {
                                ...s.project.data.content,
                                rawFoodCandidates: rawCandidates // <--- DIE LÖSUNG
                            }
                        }
                    }
                }));
            }

            console.log(`[${category}] Stored ${extractedItems.length} items.`);
        }
        break;
      }

      case 'sondertage':
      case 'ideenScout':
          // 1. Save Analysis Result (UI Panel)
          if (data) setAnalysisResult('ideenScout', data);

          // 2. Convert to Places (Map/Guide) with category 'special'
          if (data && data.results && Array.isArray(data.results)) {
              const existingPlaces = useTripStore.getState().project.data?.places || {};
              let addedCount = 0;

              data.results.forEach((group: any) => {
                  const processList = (list: any[], subType: string) => {
                      if (!Array.isArray(list)) return;
                      list.forEach((item: any) => {
                          const targetId = resolvePlaceId(item, existingPlaces, aiSettings.debug);
                          const id = targetId || uuidv4();
                          
                          updatePlace(id, {
                              id,
                              name: item.name,
                              category: 'special',
                              address: item.address,
                              description: item.description,
                              location: item.location || { lat: 0, lng: 0 }, 
                              
                              details: {
                                  specialType: subType,
                                  duration: item.estimated_duration_minutes,
                                  note: item.planning_note,
                                  website: item.website_url,
                                  source: 'ideenScout'
                              }
                          });
                          addedCount++;
                      });
                  };

                  processList(group.sunny_day_ideas, 'sunny');
                  processList(group.rainy_day_ideas, 'rainy');
              });
              console.log(`[IdeenScout] Added ${addedCount} special places.`);
          }
          break;

      case 'guide':
          if (data) setAnalysisResult('tourGuide', data);
          break;

      case 'infoAutor':
      case 'infos': {
          if (extractedItems.length > 0) {
              const currentContent = useTripStore.getState().project.data.content || {};
              const currentInfos = Array.isArray(currentContent.infos) ? [...currentContent.infos] : [];
              
              const processedChapters = extractedItems.map((chapter: any) => {
                  return {
                      id: chapter.id || uuidv4(),
                      type: chapter.type || 'info',
                      title: chapter.title || chapter.name || (chapter.id ? chapter.id.replace(/_/g, ' ') : 'Information'),
                      content: chapter.content || chapter.description
                  };
              }).filter(c => c.content); 

              processedChapters.forEach(newChap => {
                  const idx = currentInfos.findIndex(c => c.id === newChap.id || c.title === newChap.title);
                  if (idx >= 0) {
                      currentInfos[idx] = newChap;
                  } else {
                      currentInfos.push(newChap);
                  }
              });

              useTripStore.setState((s) => ({
                  project: {
                      ...s.project,
                      data: {
                          ...s.project.data,
                          content: {
                              ...s.project.data.content,
                              infos: currentInfos 
                          }
                      }
                  }
              }));

              console.log(`[InfoAutor] Persisted ${processedChapters.length} chapters to data.content.infos`);
              setAnalysisResult('infoAutor', { chapters: processedChapters });
          } else if (data) {
              setAnalysisResult('infoAutor', data);
          }
          break;
      }

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
// --- END OF FILE 402 Zeilen ---