// 03.02.2026 15:30 - FIX: HARD GATEKEEPER & Guide Harvester.
// Enforces "No Source = No Entry" policy and prevents category overwrites.
// src/services/ResultProcessor.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../store/useTripStore';
import type { WorkflowStepId, TaskKey } from '../core/types';
import { globalGuideMatrix } from '../data/countries'; 

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

// --- HELPER: SMART ID FINDER (CATEGORY AWARE) ---
const resolvePlaceId = (item: any, existingPlaces: Record<string, any>, debug: boolean, incomingCategory?: string): string | undefined => {
    // 1. Direct ID Match (Strongest Signal)
    if (item.id && existingPlaces[item.id]) {
        // SAFETY CHECK: Even if IDs match, check for Category Conflict!
        if (incomingCategory === 'Restaurant') {
             const p = existingPlaces[item.id];
             const isExistingSight = ['Sight', 'Attraktion', 'Landmark', 'Sehenswürdigkeit'].includes(p.category);
             if (isExistingSight) {
                 if (debug) console.warn(`[ResultProcessor] 🛡️ ID Collision Shield: Ignored ID match for "${p.name}" (Sight) vs "${item.name}" (Restaurant).`);
                 return undefined; 
             }
        }
        return item.id;
    }

    // 2. Fuzzy Name Match
    const nameToCheck = item.name || item.original_name || item.name_official;
    if (nameToCheck) {
        const searchName = nameToCheck.trim().toLowerCase();
        let bestMatchId: string | undefined = undefined;
        let bestScore = 0;

        Object.values(existingPlaces).forEach((p: any) => {
            if (!p.name) return;

            // --- SAFETY CHECK: CATEGORY CONFLICT ---
            if (incomingCategory === 'Restaurant') {
                const isExistingSight = ['Sight', 'Attraktion', 'Landmark', 'Sehenswürdigkeit'].includes(p.category);
                if (isExistingSight) return;
            }
            // ---------------------------------------

            const targetName = p.name.trim().toLowerCase();
            const score = getSimilarity(searchName, targetName);
            if (score > bestScore) {
                bestScore = score;
                bestMatchId = p.id;
            }
        });

        if (bestScore > 0.85 && bestMatchId) { 
            if (debug) console.log(`[ResultProcessor] 🧠 Fuzzy Match: "${searchName}" ≈ "${existingPlaces[bestMatchId].name}" (${(bestScore*100).toFixed(0)}%)`);
            return bestMatchId;
        }
    }
    return undefined;
};

// --- HELPER: THE VACUUM CLEANER V4 (Strict Mode) ---
const extractItems = (data: any, allowStrings: boolean = true): any[] => {
    let items: any[] = [];

    if (!data) return [];

    if (Array.isArray(data)) {
        data.forEach(element => {
            if (typeof element === 'object' && element !== null) {
                items = items.concat(extractItems(element, allowStrings));
            } else if (typeof element === 'string') {
                if (allowStrings && element.trim().length > 0) {
                    items.push(element);
                }
            }
        });
        return items;
    }

    if (typeof data !== 'object') return [];

    // ⛔️ ECHO-BLOCKER
    if (data.context || data.input || data.candidates_list || data.original_input) {
         // Stop recursion into known input containers
    }

    // Case B: Object - Is this a candidate?
    const isPlace = (data.name || data.id || data.original_name) 
        && !data.candidates && !data.enriched_places && !data.places && !data.results && !data.recommended_hubs
        && !data.context && !data.input; 

    if (isPlace) {
        items.push(data);
    }

    // 2. Scan specific container keys
    const containerKeys = ['candidates', 'enriched_candidates', 'processed_places', 'enriched_places', 'sights', 'items', 'places', 'results', 'chapters', 'recommendations', 'articles'];
    let foundContainer = false;

    for (const key of containerKeys) {
        if (data[key]) {
            items = items.concat(extractItems(data[key], allowStrings));
            foundContainer = true;
        }
    }

    // 3. Fallback: DEEP SEARCH
    if (!foundContainer && !data.recommended_hubs) {
         Object.keys(data).forEach(key => {
             if (['context', 'input', 'logs', 'meta', 'candidates_list', 'original_input', 'analysis'].includes(key)) return;

             const value = data[key];
             if (typeof value === 'object' && value !== null) {
                 items = items.concat(extractItems(value, allowStrings));
             }
         });
    }

    return items;
};

// --- BLACKLIST CHECKER ---
const isGarbageName = (name: string): boolean => {
    if (!name) return true;
    const lower = name.toLowerCase().trim();
    const blacklist = [
        'michelin', 'falstaff', 'gault&millau', 'gault & millau', 'gault millau', 
        'feinschmecker', 'der feinschmecker', 'tripadvisor', 'travelers\' choice', 
        'google maps', 'google reviews', 'yelp', 'guide', 'restaurantführer'
    ];
    if (blacklist.includes(lower)) return true;
    if (lower.includes('michelin') && lower.length < 15) return true;
    return false;
};

// --- SSOT HELPER ---
const isEnrichedItem = (item: any): boolean => {
    return !!(item.original_name || (item.user_ratings_total !== undefined) || item.logistics_tip);
};

// --- NEW HELPER: DOWNLOAD GENERATOR ---
const triggerCountriesDownload = (updatedMatrix: Record<string, string[]>) => {
    const fileContent = `// src/data/countries.ts
// UPDATED AUTOMATICALLY BY FOODSCOUT HARVESTER
// ${new Date().toISOString()}

export const metadata = {
    lastUpdated: "${new Date().toISOString()}"
};

export const globalGuideMatrix: Record<string, string[]> = ${JSON.stringify(updatedMatrix, null, 4)};

export function getGuidesForCountry(countryName: string | undefined): string[] {
    if (!countryName) return globalGuideMatrix["Welt"];
    
    // 1. Direkter Treffer
    if (globalGuideMatrix[countryName]) return globalGuideMatrix[countryName];
    
    const normalized = countryName.toLowerCase();
    
    // 2. Fuzzy Suche
    const foundKey = Object.keys(globalGuideMatrix).find(k => 
        k.toLowerCase() === normalized || 
        normalized.includes(k.toLowerCase()) || 
        k.toLowerCase().includes(normalized)
    );
    
    if (foundKey) return globalGuideMatrix[foundKey];

    // 3. Fallback (Safe)
    return globalGuideMatrix["Welt"];
}
`;
    const blob = new Blob([fileContent], { type: 'application/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'countries.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


export const ResultProcessor = {
  process: (step: WorkflowStepId | TaskKey, data: any) => {
    const state = useTripStore.getState();
    const { aiSettings, logEvent, setAnalysisResult, updatePlace, project } = state; 

    if (aiSettings.debug) {
      logEvent({
        task: step,
        type: 'info',
        content: `Processing Result for ${step}`,
        meta: { dataKeys: Object.keys(data || {}) }
      });
    }

    if (step === 'geoAnalyst') {
        if (data && data.recommended_hubs) {
            setAnalysisResult('geoAnalyst', data);
            console.log(`[GeoAnalyst] Stored ${data.recommended_hubs.length} recommended hubs.`);
        }
        return; 
    }

    const allowStrings = ['basis', 'sightCollector', 'ideenScout', 'infos', 'infoAutor', 'countryScout'].includes(step);
    const extractedItems = extractItems(data, allowStrings);

    switch (step) {
      case 'basis': {
        if (extractedItems.length > 0) {
            extractedItems.forEach((item: any) => {
                const isString = typeof item === 'string';
                const name = isString ? item : item.name;
                if (name) {
                    const existingPlaces = project.data?.places || {};
                    const existingId = resolvePlaceId({ name }, existingPlaces, false);
                    const id = existingId || (isString ? uuidv4() : (item.id || uuidv4()));

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
        } 
        break;
      }

      case 'anreicherer': {
        const existingPlaces = project.data?.places || {};
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
                      user_ratings_total: item.user_ratings_total,
                      duration: item.duration,
                      website: item.website
                    });
                    successCount++;
                }
            });
            console.log(`[Enricher] Updated ${successCount} items.`);
        }
        break;
      }

      case 'chefredakteur':
      case 'details': {
          const existingPlaces = project.data?.places || {};
          if (extractedItems.length > 0) {
              let successCount = 0;
              extractedItems.forEach((item: any) => {
                  const targetId = resolvePlaceId(item, existingPlaces, aiSettings.debug);
                  if (targetId) {
                      const content = item.text || item.article || item.detailed_description || item.description || item.content;
                      updatePlace(targetId, {
                          detailContent: content,
                          reasoning: item.reasoning,
                          waypoints: item.waypoints
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
        const systemCategory = ['food', 'foodScout', 'foodEnricher'].includes(step) ? 'Restaurant' : 'Hotel';
        
        if (extractedItems.length > 0) {
            const rawCandidates: any[] = []; 
            const existingPlaces = project.data?.places || {};

            let savedCount = 0;

            extractedItems.forEach((item: any) => {
                if (typeof item === 'string') return;

                const name = item.name || item.name_official || item.original_name;

                if (isGarbageName(name)) return;
                
                if (name) {
                    if (step === 'foodEnricher' && !isEnrichedItem(item)) {
                        return; // Gatekeeper: Skip raw echo
                    }

                    // --- 🧠 SMART MATCH ---
                    const resolvedId = resolvePlaceId({ ...item, name }, existingPlaces, false, systemCategory);
                    
                    let id: string;
                    if (resolvedId) {
                        id = resolvedId;
                    } else {
                        if (item.id && existingPlaces[item.id]) {
                             id = uuidv4();
                        } else {
                             id = item.id || uuidv4();
                        }
                    }
                    
                    const existingPlace = existingPlaces[id];

                    // --- SSOT PROTECTION ---
                    const incomingIsEnriched = isEnrichedItem(item);
                    const existingIsEnriched = existingPlace && isEnrichedItem(existingPlace);

                    if (existingIsEnriched && !incomingIsEnriched) {
                        return; // SKIP DOWNGRADE
                    }
                    
                    const finalName = item.name_official || name;

                    // FIX: Prevent AI from overwriting system category (e.g. "hidden-gem")
                    const { category: _aiCategory, ...cleanItem } = item;

                    updatePlace(id, {
                        id,
                        name: finalName,
                        
                        address: item.address,
                        location: item.location,
                        rating: item.rating || 0,
                        description: item.description || item.cuisine || '',
                        
                        phone: item.phone_number,
                        awards: item.awards,
                        openingHoursHint: item.opening_hours_hint,
                        cuisine: item.cuisine,
                        vibe: item.vibe,
                        website: item.website,
                        priceLevel: item.price_level,
                        source_url: item.source_url, 
                        
                        location_match: item.location_match,
                        price_estimate: item.price_estimate,
                        bookingUrl: item.bookingUrl,
                        pros: item.pros,
                        signature_dish: item.signature_dish,
                        
                        user_ratings_total: item.user_ratings_total,
                        logistics_tip: item.logistics_tip,
                        original_name: item.original_name,
                        
                        ...cleanItem, // Spread clean item (without category)

                        category: systemCategory // Enforce System Category
                    });
                    savedCount++;

                    if (step === 'foodScout' || step === 'food') {
                        // --- HARD GATEKEEPER: THE LAW ---
                        // Drops any FoodScout candidate that has no Source Citation.
                        if (!item.guides || item.guides.length === 0) {
                             if (aiSettings.debug) console.warn(`[ResultProcessor] 👮‍♀️ The Law: Dropped candidate "${name}" (No Source Citation).`);
                             return; // SKIP THIS ITEM
                        }
                        // --------------------------------

                        rawCandidates.push({
                            id,
                            name: finalName,
                            city: item.city || item.ort,
                            guides: item.guides,
                            source_url: item.source_url,
                            address: item.address,
                            location: item.location 
                        });
                    }
                }
            });
            
            if ((step === 'foodScout' || step === 'food') && rawCandidates.length > 0) {
                console.log(`[ResultProcessor] 🤝 Handing over ${rawCandidates.length} candidates to FoodEnricher.`);
                useTripStore.setState((s) => ({
                    project: {
                        ...s.project,
                        data: {
                            ...s.project.data,
                            content: {
                                ...s.project.data.content,
                                rawFoodCandidates: rawCandidates 
                            }
                        }
                    }
                }));

                // --- NEW: GUIDE HARVESTER LOGIC ---
                const foundGuides = new Set<string>();
                extractedItems.forEach((item: any) => {
                    if (Array.isArray(item.guides)) {
                        item.guides.forEach((g: string) => {
                            if (g && g.length > 3 && !g.includes("Google") && !g.includes("Unknown")) {
                                foundGuides.add(g);
                            }
                        });
                    }
                });

                if (foundGuides.size > 0) {
                    const targetCountry = (project.userInputs?.logistics as any)?.target_countries?.[0] || 
                                          project.userInputs?.logistics?.stationary?.destination || 
                                          "Unknown";
                    
                    const existingGuides = globalGuideMatrix[targetCountry] || [];
                    const newGuides = Array.from(foundGuides).filter(g => !existingGuides.includes(g));

                    if (newGuides.length > 0) {
                        const guideList = newGuides.join("\n- ");
                        
                        // USER INTERACTION
                        const userConfirmed = window.confirm(
                            `📍 UPDATE FÜR ${targetCountry.toUpperCase()}\n\n` +
                            `Der FoodScout hat neue Quellen gefunden:\n- ${guideList}\n\n` +
                            `Soll die Datei "countries.ts" aktualisiert heruntergeladen werden?`
                        );

                        if (userConfirmed) {
                            const newMatrix = { ...globalGuideMatrix };
                            newMatrix[targetCountry] = Array.from(new Set([...existingGuides, ...newGuides]));
                            triggerCountriesDownload(newMatrix);
                        }
                    }
                }
                // --- END GUIDE HARVESTER ---
            }

            console.log(`[${systemCategory}] Stored/Updated ${savedCount} items.`);
        }
        break;
      }

      case 'sondertage':
      case 'ideenScout':
          // FIX: Add 'wildcard_ideas' to processing
          if (data) setAnalysisResult('ideenScout', data);
          if (data && data.results && Array.isArray(data.results)) {
              const existingPlaces = project.data?.places || {};
              let addedCount = 0;
              data.results.forEach((group: any) => {
                  const groupLocation = group.location || "Unbekannte Region";
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
                              city: groupLocation, 
                              location: item.location || { lat: 0, lng: 0 }, 
                              details: {
                                  specialType: subType, // 'sunny', 'rainy', 'wildcard'
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
                  // NEW: Added Wildcard processing
                  processList(group.wildcard_ideas, 'wildcard');
              });
              console.log(`[IdeenScout] Added ${addedCount} special places (inc. Wildcards).`);
          }
          break;

      case 'tourGuide':
          // FIX: Robust handling for TourGuide
          if (data) {
              setAnalysisResult('tourGuide', data);
              // If the data contains specific tour definitions, log it
              if (data.guide && data.guide.tours) {
                  console.log(`[TourGuide] Persisted ${data.guide.tours.length} tours to analysis.tourGuide`);
              }
          }
          break;

      case 'countryScout': {
          // Logic for explicit CountryScout result
           if (data.recommended_guides && data.country_profile?.official_name) {
               const country = data.country_profile.official_name;
               const newGuides = data.recommended_guides;
               const userConfirmed = window.confirm(`Länder-Scout erfolgreich!\n\nGuides für ${country}:\n${newGuides.join(', ')}\n\nDatei aktualisieren?`);
               if (userConfirmed) {
                   const newMatrix = { ...globalGuideMatrix };
                   newMatrix[country] = newGuides;
                   triggerCountriesDownload(newMatrix);
               }
           }
           break;
      }

      case 'transferPlanner':
      case 'chefPlaner':
      case 'routeArchitect':
      case 'routenArchitekt':
      case 'initialTagesplaner':
      case 'dayplan':
        if (data) setAnalysisResult(step as any, data);
        break;
      
      case 'infoAutor':
      case 'infos': {
          if (extractedItems.length > 0) {
              const currentContent = project.data.content || {};
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

      default:
        console.log(`Processor: No specific handler for ${step}`, data);
    }
  }
};
// Lines: 636