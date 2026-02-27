// 27.02.2026 19:00 - FEAT: Added intelligent Intercept Switch. Prevents blind save if Prio 1/2 places are unassigned.
// 23.02.2026 20:15 - FIX: Separated Logistics and Places state updates in chefPlaner.
// src/services/processors/PlanningProcessor.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../../store/useTripStore';
import { extractItems, resolvePlaceId, triggerCountriesDownload } from './resultUtils';
import { countryGuideConfig, type GuideDef } from '../../data/countries';

export const PlanningProcessor = {
    
    // --- STRATEGY & ROUTES ---
    processAnalysis: (step: string, data: any) => {
        const store = useTripStore.getState();
        const { setAnalysisResult, updatePlace } = store; 
        
        if (data) {
            setAnalysisResult(step as any, data);
            console.log(`[${step}] Analysis result persisted.`);

            // FEAT: Intelligent Intercept for Tagesplaner
            if (step === 'initialTagesplaner' && data.itinerary) {
                const currentState = useTripStore.getState();
                const places = currentState.project.data.places || {};
                const unassigned = data.unassigned || [];
                
                // Identify high-priority dropouts
                const conflicts = unassigned.filter((u: any) => {
                    const place = places[u.id];
                    if (!place) return false;
                    const prio = place.userPriority ?? (place.userSelection?.priority || 0);
                    return prio >= 1 || place.isFixed;
                }).map((u: any) => ({
                    id: u.id,
                    name: places[u.id]?.name || u.name,
                    reason: u.reason,
                    prio: places[u.id]?.userPriority ?? (places[u.id]?.userSelection?.priority || 0)
                }));

                if (conflicts.length > 0) {
                    console.log(`[PlanningProcessor] Intercepted ${conflicts.length} high-priority conflicts! Triggering UI Modal.`);
                    // Send to waiting room, do NOT save yet.
                    currentState.setPlannerConflictData(conflicts, data);
                } else {
                    console.log(`[PlanningProcessor] Mapped itinerary directly to SSOT (No conflicts).`);
                    // Happy Path: Save directly
                    useTripStore.setState((state) => ({
                        project: {
                            ...state.project,
                            itinerary: {
                                ...state.project.itinerary,
                                days: data.itinerary
                            }
                        }
                    }));
                }
            }

            // FIX: Apply Geography Correction & Typo Fixes from ChefPlaner to Store
            if (step === 'chefPlaner') {
                const corrections = data.corrections || {};
                const validatedHotels = data.validated_hotels || [];

                // --- HELPER: Fuzzy Matching ---
                const calculateSimilarity = (str1: string, str2: string): number => {
                    if (!str1 || !str2) return 0;
                    if (str1.toLowerCase() === str2.toLowerCase()) return 1;
                    const getBigrams = (s: string) => {
                        const bg = [];
                        const str = s.toLowerCase().replace(/\s+/g, '');
                        for (let i = 0; i < str.length - 1; i++) bg.push(str.substring(i, i + 2));
                        return bg;
                    };
                    const bg1 = getBigrams(str1);
                    const bg2 = getBigrams(str2);
                    if (bg1.length === 0 || bg2.length === 0) return 0;
                    let intersection = 0;
                    const bg2Copy = [...bg2];
                    for (const bg of bg1) {
                        const idx = bg2Copy.indexOf(bg);
                        if (idx !== -1) { intersection++; bg2Copy.splice(idx, 1); }
                    }
                    return (2.0 * intersection) / (bg1.length + bg2.length);
                };

                const isTypo = (original: string, corrected: string) => {
                    if (!original || !corrected) return false;
                    if (original === corrected) return false;
                    return calculateSimilarity(original, corrected) > 0.70; // 70% threshold
                };

                // PART 1: UPDATE LOGISTICS (COCKPIT)
                useTripStore.setState((state) => {
                    const logistics = JSON.parse(JSON.stringify(state.project.userInputs.logistics)); 
                    let stateChanged = false;

                    if (corrections.inferred_country) {
                        const currentCountries = logistics.target_countries || [];
                        if (currentCountries.length === 0 || (currentCountries.length === 1 && !currentCountries[0])) {
                            logistics.target_countries = [corrections.inferred_country];
                            stateChanged = true;
                        }
                    }

                    if (corrections.destination_typo_found && corrections.corrected_destination) {
                        const correctDest = corrections.corrected_destination;
                        
                        if (logistics.mode === 'stationaer' && isTypo(logistics.stationary.destination, correctDest)) {
                            logistics.stationary.destination = correctDest;
                            stateChanged = true;
                        } else if (logistics.mode === 'mobil' || logistics.mode === 'roundtrip') {
                            if (isTypo(logistics.roundtrip.startLocation, correctDest)) {
                                logistics.roundtrip.startLocation = correctDest;
                                stateChanged = true;
                            }
                            if (isTypo(logistics.roundtrip.endLocation, correctDest)) {
                                logistics.roundtrip.endLocation = correctDest;
                                stateChanged = true;
                            }
                            if (logistics.roundtrip.stops) {
                                logistics.roundtrip.stops.forEach((stop: any) => {
                                    if (isTypo(stop.location, correctDest)) {
                                        stop.location = correctDest;
                                        stateChanged = true;
                                    }
                                });
                            }
                        }
                    }

                    if (validatedHotels.length > 0 && (logistics.mode === 'mobil' || logistics.mode === 'roundtrip') && logistics.roundtrip.stops) {
                        logistics.roundtrip.stops.forEach((stop: any) => {
                            const match = validatedHotels.find((vh: any) => 
                                vh.station === stop.location || isTypo(stop.location, vh.station)
                            );
                            
                            if (match && match.official_name) {
                                if (stop.hotel !== match.official_name) {
                                    stop.hotel = match.official_name;
                                    stateChanged = true;
                                }
                            }
                        });
                    }

                    if (stateChanged) {
                        return {
                            project: {
                                ...state.project,
                                userInputs: {
                                    ...state.project.userInputs,
                                    logistics
                                }
                            }
                        };
                    }
                    return state; 
                });

                // PART 2: UPDATE PLACES (Guide View)
                if (validatedHotels.length > 0) {
                    const currentState = useTripStore.getState();
                    const currentLogistics = currentState.project.userInputs.logistics;
                    
                    if ((currentLogistics.mode === 'mobil' || currentLogistics.mode === 'roundtrip') && currentLogistics.roundtrip.stops) {
                        currentLogistics.roundtrip.stops.forEach((stop: any) => {
                            const match = validatedHotels.find((vh: any) => 
                                vh.station === stop.location || isTypo(stop.location, vh.station)
                            );
                            
                            if (match && match.official_name) {
                                const currentPlaces = useTripStore.getState().project.data.places || {};
                                const existingHotelId = resolvePlaceId({ name: match.official_name }, currentPlaces, false);
                                
                                const hotelId = existingHotelId || `hotel-${match.official_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
                                
                                updatePlace(hotelId, {
                                    id: hotelId,
                                    name: match.official_name,
                                    official_name: match.official_name,
                                    category: 'hotel',
                                    address: match.address,
                                    city: match.station,
                                    valid: true,
                                    userPriority: 1
                                });
                            }
                        });
                    }
                }
            }
        }
    },

    processIdeenScout: (data: any, debug: boolean) => {
        const { updatePlace, project, setAnalysisResult } = useTripStore.getState();
        if (data) setAnalysisResult('ideenScout', data);
        
        if (data && data.results && Array.isArray(data.results)) {
             let runningPlaces = { ...(project.data?.places || {}) };

             data.results.forEach((group: any) => {
                 const groupLocation = group.location || "Unbekannte Region";
                 const processList = (list: any[], subType: string) => {
                     if (!Array.isArray(list)) return;
                     list.forEach((item: any) => {
                         const targetId = resolvePlaceId(item, runningPlaces, debug);
                         const id = targetId || uuidv4();
                         
                         const placeUpdate = {
                             id,
                             name: item.name,
                             category: 'special',
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
                         };
                         
                         updatePlace(id, placeUpdate);
                         runningPlaces[id] = { ...runningPlaces[id], ...placeUpdate };
                     });
                 };
                 processList(group.sunny_day_ideas, 'sunny');
                 processList(group.rainy_day_ideas, 'rainy');
                 processList(group.wildcard_ideas, 'wildcard');
             });
        }
    },

    processInfoAutor: (data: any) => {
        const { project } = useTripStore.getState();
        const extractedItems = extractItems(data, true);
        
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
        }
    },

    processTourGuide: (data: any) => {
         const { setAnalysisResult } = useTripStore.getState();
         if (data) setAnalysisResult('tourGuide', data);
    },

    processCountryScout: (data: any) => {
        if (data.recommended_guides && data.country_profile?.official_name) {
             const country = data.country_profile.official_name;
             const newGuides = data.recommended_guides; 
             
             const userConfirmed = window.confirm(`Länder-Scout: Neue Guides für ${country} gefunden.\n\n${newGuides.join(', ')}\n\nDatenbank aktualisieren?`);
             
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
    }
};
// --- END OF FILE 314 Zeilen ---