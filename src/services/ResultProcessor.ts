// 02.02.2026 21:30 - FIX: RESULT PROCESSOR V40.10 (Ultimate Scraper).
// - Added 'Deep Scan' strategy to find items even if container keys match partially.
// - Added rigorous Input-Logging (Keys only) to debug data flow.
// src/services/ResultProcessor.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../store/useTripStore';
import type { WorkflowStepId, TaskKey } from '../core/types';
import { countryGuideConfig, getGuidesForCountry } from '../data/countries'; 

// Local definition to avoid import issues
interface GuideDef {
    name: string;
    searchUrl: string;
}

//#region --- HELPERS ---

const getSimilarity = (s1: string, s2: string): number => {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    const costs = new Array();
    for (let i = 0; i <= longer.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= shorter.length; j++) {
            if (i === 0) { costs[j] = j; } 
            else if (j > 0) {
                let newValue = costs[j - 1];
                if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[shorter.length] = lastValue;
    }
    return (longerLength - costs[shorter.length]) / longerLength;
};

const resolvePlaceId = (item: any, existingPlaces: Record<string, any>, debug: boolean, incomingCategory?: string): string | undefined => {
    if (item.id && existingPlaces[item.id]) {
        if (incomingCategory === 'Restaurant') {
             const p = existingPlaces[item.id];
             const isExistingSight = ['Sight', 'Attraktion', 'Landmark', 'Sehenswürdigkeit'].includes(p.category);
             if (isExistingSight) return undefined; 
        }
        return item.id;
    }
    const nameToCheck = item.name || item.original_name || item.name_official;
    if (nameToCheck) {
        const searchName = nameToCheck.trim().toLowerCase();
        let bestMatchId: string | undefined = undefined;
        let bestScore = 0;
        Object.values(existingPlaces).forEach((p: any) => {
            if (!p.name) return;
            if (incomingCategory === 'Restaurant') {
                const isExistingSight = ['Sight', 'Attraktion', 'Landmark', 'Sehenswürdigkeit'].includes(p.category);
                if (isExistingSight) return;
            }
            const targetName = p.name.trim().toLowerCase();
            let score = getSimilarity(searchName, targetName);
            if (targetName.includes(searchName) || searchName.includes(targetName)) {
                if (Math.min(targetName.length, searchName.length) > 4) score = Math.max(score, 0.95);
            }
            if (score > bestScore) { bestScore = score; bestMatchId = p.id; }
        });
        if (bestScore > 0.85 && bestMatchId) return bestMatchId;
    }
    return undefined;
};

const sanitizeUrl = (url: string | undefined, item: any): string => {
    const query = `${item.name || item.original_name} ${item.city || ''}`.trim().replace(/\s+/g, '+');
    const cleanFallback = `https://www.google.com/search?q=${query}`;
    if (!url || url.trim() === '') return cleanFallback;
    let safeUrl = url.trim();
    if (safeUrl.includes('gl=lk')) safeUrl = safeUrl.replace(/&?gl=lk/g, '');
    if (safeUrl.includes('gl=us')) safeUrl = safeUrl.replace(/&?gl=us/g, '');
    if (!safeUrl.startsWith('http')) return cleanFallback;
    return safeUrl;
};

// --- THE VACUUM CLEANER V6 (Ultimate Scraper) ---
const extractItems = (data: any, allowStrings: boolean = true): any[] => {
    let items: any[] = [];
    if (!data) return [];

    // Case A: Direct Array
    if (Array.isArray(data)) {
        data.forEach(element => {
            if (typeof element === 'object' && element !== null) items = items.concat(extractItems(element, allowStrings));
            else if (typeof element === 'string' && allowStrings && element.trim().length > 0) items.push(element);
        });
        return items;
    }

    if (typeof data !== 'object') return [];

    // Case B: Explicit Containers (Greedy)
    const containerKeys = ['candidates', 'enriched_candidates', 'processed_places', 'places', 'results', 'chapters', 'sights', 'items'];
    for (const key of containerKeys) {
        if (data[key]) {
            items = items.concat(extractItems(data[key], allowStrings));
        }
    }
    
    // Case C: Single Item (Heuristic - Duck Typing)
    // Does it look like a Place?
    const hasName = !!(data.name || data.name_official || data.original_name);
    const hasDetails = !!(data.description || data.address || data.city || data.location);
    const isNotContainer = !data.candidates && !data.results;
    
    if (hasName && hasDetails && isNotContainer) {
        items.push(data);
    }

    // Case D: Deep Recursive Search (Last Resort)
    // If we haven't found anything yet, look deeper
    if (items.length === 0) {
         Object.keys(data).forEach(key => {
             if (['context', 'input', 'logs', 'meta', 'analysis', '_thought_process'].includes(key)) return; 
             const value = data[key];
             if (typeof value === 'object' && value !== null) {
                 items = items.concat(extractItems(value, allowStrings));
             }
         });
    }
    return items;
};

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

const isEnrichedItem = (item: any): boolean => {
    return !!(
        item.original_name || 
        (item.user_ratings_total !== undefined) || 
        item.logistics_tip ||
        item.verification_status === 'verified' ||
        (Array.isArray(item.awards) && item.awards.length > 0) ||
        (Array.isArray(item.guides) && item.guides.length > 0) || 
        item.signature_dish
    );
};

const triggerCountriesDownload = (updatedConfig: Record<string, GuideDef[]>) => {
    const fileContent = `// src/data/countries.ts\n// UPDATED AUTOMATICALLY BY FOODSCOUT\nexport const metadata = { lastUpdated: "${new Date().toISOString()}" };\n\nexport interface GuideDef { name: string; searchUrl: string; }\n\nexport const countryGuideConfig: Record<string, GuideDef[]> = ${JSON.stringify(updatedConfig, null, 4)};\n\nexport function getGuidesForCountry(countryName: string | undefined): GuideDef[] { if(!countryName) return []; if(countryGuideConfig[countryName]) return countryGuideConfig[countryName]; const normalized = countryName.toLowerCase(); const foundKey = Object.keys(countryGuideConfig).find(k => k.toLowerCase() === normalized || normalized.includes(k.toLowerCase()) || k.toLowerCase().includes(normalized)); if (foundKey) return countryGuideConfig[foundKey]; return []; }`;
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

//#endregion

export const ResultProcessor = {
  process: (step: WorkflowStepId | TaskKey, data: any) => {
    const state = useTripStore.getState();
    const { aiSettings, logEvent, setAnalysisResult, updatePlace, project } = state; 

    // --- DEBUG: INPUT X-RAY ---
    const inputKeys = typeof data === 'object' ? Object.keys(data || {}) : ['(Not an Object)'];
    console.log(`[ResultProcessor] 🟢 START Processing for "${step}". Input Keys: [${inputKeys.join(', ')}]`);

    if (step === 'geoAnalyst') {
        if (data && data.recommended_hubs) {
            setAnalysisResult('geoAnalyst', data);
            console.log(`[GeoAnalyst] Stored ${data.recommended_hubs.length} recommended hubs.`);
        }
        return; 
    }

    // --- EXTRACTION ---
    const allowStrings = ['basis', 'sightCollector', 'ideenScout', 'infos', 'infoAutor', 'countryScout'].includes(step);
    let extractedItems: any[] = [];
    try {
        extractedItems = extractItems(data, allowStrings);
        console.log(`[ResultProcessor] 🔍 Extracted ${extractedItems.length} raw items for "${step}".`);
    } catch (err) {
        console.error(`[ResultProcessor] 🔴 CRITICAL ERROR in extractItems:`, err);
        return;
    }

    // --- PROCESSING SWITCH ---
    switch (step) {
      //#region BASIS & SIGHTS
      case 'basis': {
        if (extractedItems.length > 0) {
            extractedItems.forEach((item: any) => {
                const isString = typeof item === 'string';
                const name = isString ? item : item.name;
                if (name) {
                    const existingPlaces = project.data?.places || {};
                    const existingId = resolvePlaceId({ name }, existingPlaces, false);
                    const id = existingId || (isString ? uuidv4() : (item.id || uuidv4()));

                    if (updatePlace) {
                        updatePlace(id, {
                          id,
                          name,
                          category: 'Sight',
                          userPriority: 0,
                          visited: false,
                          ...(isString ? {} : item)
                        });
                    }
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
                if (targetId && updatePlace) {
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
                  if (targetId && updatePlace) {
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
      //#endregion

      //#region FOOD & HOTELS (INVERTED SEARCH)
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
                    // --- SSOT: GATEKEEPER ---
                    if (step === 'foodEnricher' && !isEnrichedItem(item)) {
                        // V40.10: Log dropped items to understand why
                        if (aiSettings.debug) console.warn(`[ResultProcessor] Dropped echo/raw item: ${name}`);
                        return; 
                    }

                    // --- 🧠 SMART MATCH ---
                    const resolvedId = resolvePlaceId({ ...item, name }, existingPlaces, false, systemCategory);
                    const id = resolvedId || uuidv4();
                    
                    const existingPlace = existingPlaces[id];

                    // --- SSOT PROTECTION ---
                    const incomingIsEnriched = isEnrichedItem(item);
                    const existingIsEnriched = existingPlace && isEnrichedItem(existingPlace);

                    if (existingIsEnriched && !incomingIsEnriched) {
                        return; // SKIP DOWNGRADE
                    }

                    // --- HARD GATEKEEPER (THE LAW) ---
                    if (step === 'foodEnricher') {
                         const hasAwards = (item.awards && item.awards.length > 0);
                         const hasGuides = (item.guides && item.guides.length > 0);
                         const isVerified = item.verification_status === 'verified';
                         const hasDish = !!item.signature_dish;

                         // Must have at least ONE signal of quality/verification
                         if (!hasAwards && !hasGuides && !isVerified && !hasDish) {
                             if (aiSettings.debug) console.warn(`[ResultProcessor] 👮‍♀️ Dropped: "${name}" (No signal).`);
                             return; 
                         }
                    }
                    
                    const finalName = item.name_official || name;
                    const { category: _aiCategory, source_url: _aiUrl, ...cleanItem } = item;

                    // --- CLEAN URL ---
                    const cleanSourceUrl = sanitizeUrl(item.source_url, item);

                    if (updatePlace) {
                        updatePlace(id, {
                            id,
                            name: finalName,
                            category: systemCategory, 
                            
                            // Native Field Support
                            awards: (item.awards && item.awards.length > 0) ? item.awards : (existingPlace ? (existingPlace as any).awards : []),
                            phone: item.phone,
                            website: item.website,
                            openingHours: item.openingHours,
                            vibe: item.vibe,
                            signature_dish: item.signature_dish,
                            cuisine: item.cuisine,
                            priceLevel: item.priceLevel,
                            
                            source_url: cleanSourceUrl,

                            ...cleanItem 
                        });
                        savedCount++;
                    } else {
                        console.error("[ResultProcessor] 🔴 CRITICAL: updatePlace missing!");
                    }

                    // Collector Logic (FoodScout)
                    if (step === 'foodScout' || step === 'food') {
                        rawCandidates.push({
                            id,
                            name: finalName,
                            city: item.city || item.ort,
                            address: item.address,
                            location: item.location 
                        });
                    }
                }
            });
            
            // Handover for Pipeline
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

                // Harvester Logic (Guides)
                const foundGuides = new Set<string>();
                extractedItems.forEach((item: any) => {
                    const sources = [...(item.awards || []), ...(item.guides || [])];
                    if (Array.isArray(sources)) {
                        sources.forEach((g: string) => {
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
                    
                    const existingConfig = countryGuideConfig[targetCountry] || [];
                    const existingNames = existingConfig.map(g => g.name);
                    const newGuideNames = Array.from(foundGuides).filter(g => !existingNames.includes(g));

                    if (newGuideNames.length > 0) {
                        const guideList = newGuideNames.join("\n- ");
                        console.log(`[GuideHarvester] Found new guides for ${targetCountry}: \n${guideList}`);
                    }
                }
            }

            console.log(`[${systemCategory}] Stored/Updated ${savedCount} items.`);
        } else {
            console.warn(`[ResultProcessor] ⚠️ No items found in extracted data for ${step}.`);
        }
        break;
      }
      //#endregion

      //#region IDEEN SCOUT & SPECIALS
      case 'sondertage':
      case 'ideenScout':
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
                          
                          const finalCategory = subType === 'wildcard' ? 'Wildcard' : 'special';

                          if (updatePlace) {
                              updatePlace(id, {
                                  id,
                                  name: item.name,
                                  category: finalCategory, 
                                  address: item.address,
                                  description: item.description,
                                  city: groupLocation, 
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
                          }
                      });
                  };
                  processList(group.sunny_day_ideas, 'sunny');
                  processList(group.rainy_day_ideas, 'rainy');
                  processList(group.wildcard_ideas, 'wildcard');
              });
              console.log(`[IdeenScout] Added ${addedCount} special places (inc. Wildcards).`);
          }
          break;
      //#endregion

      //#region OTHER STEPS (TourGuide, CountryScout, etc.)
      case 'tourGuide':
          if (data) {
              setAnalysisResult('tourGuide', data);
              if (data.guide && data.guide.tours) {
                  console.log(`[TourGuide] Persisted ${data.guide.tours.length} tours to analysis.tourGuide`);
              }
          }
          break;

      case 'countryScout': {
           if (data.recommended_guides && data.country_profile?.official_name) {
               const country = data.country_profile.official_name;
               const newGuides = data.recommended_guides; 
               const userConfirmed = window.confirm(`Länder-Scout erfolgreich!\n\nGuides für ${country}:\n${newGuides.join(', ')}\n\nDatei aktualisieren?`);
               if (userConfirmed) {
                   const newConfig = { ...countryGuideConfig };
                   const newDefs: GuideDef[] = newGuides.map((name: string) => ({
                       name,
                       searchUrl: `https://www.google.com/search?q=${encodeURIComponent(name + ' restaurant ' + country)}`
                   }));
                   newConfig[country] = newDefs;
                   triggerCountriesDownload(newConfig);
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
      //#endregion

      default:
        console.log(`Processor: No specific handler for ${step}`, data);
    }
  }
};
// --- END OF FILE 495 Lines ---