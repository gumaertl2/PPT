// 23.02.2026 18:45 - FIX: Implemented intermediate cache sync in processIdeenScout to prevent duplicate creation.
// 23.02.2026 18:00 - FEAT: Added Write-Back logic for ChefPlaner Typo-Corrections & Hotel-Validation to userInputs.
// 19.02.2026 15:10 - FIX: Mapped initialTagesplaner data to SSOT (project.itinerary.days).
// 05.02.2026 16:30 - REFACTOR: PLANNING PROCESSOR.
// 06.02.2026 18:10 - FIX: TS2345 Solved. Direct State Update for 'target_countries'.
// Handles Strategy, Routes, Special Days, Content and Tours.
// src/services/processors/PlanningProcessor.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../../store/useTripStore';
import { extractItems, resolvePlaceId, triggerCountriesDownload } from './resultUtils';
import { countryGuideConfig, type GuideDef } from '../../data/countries';

export const PlanningProcessor = {
    
    // --- STRATEGY & ROUTES ---
    processAnalysis: (step: string, data: any) => {
        const store = useTripStore.getState();
        const { setAnalysisResult } = store; 
        
        if (data) {
            setAnalysisResult(step as any, data);
            console.log(`[${step}] Analysis result persisted.`);

            // FIX: Map initialTagesplaner to SSOT (project.itinerary.days)
            if (step === 'initialTagesplaner' && data.itinerary) {
                useTripStore.setState((state) => ({
                    project: {
                        ...state.project,
                        itinerary: {
                            ...state.project.itinerary,
                            days: data.itinerary
                        }
                    }
                }));
                console.log(`[PlanningProcessor] Mapped itinerary to project.itinerary SSOT.`);
            }

            // FIX: Apply Geography Correction & Typo Fixes from ChefPlaner to Store
            if (step === 'chefPlaner') {
                const corrections = data.corrections || {};
                const validatedHotels = data.validated_hotels || [];

                useTripStore.setState((state) => {
                    const logistics = JSON.parse(JSON.stringify(state.project.userInputs.logistics)); 
                    let stateChanged = false;

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

                    // 1. Inferred Country
                    if (corrections.inferred_country) {
                        const currentCountries = logistics.target_countries || [];
                        if (currentCountries.length === 0 || (currentCountries.length === 1 && !currentCountries[0])) {
                            console.log(`[PlanningProcessor] Applying inferred country: ${corrections.inferred_country}`);
                            logistics.target_countries = [corrections.inferred_country];
                            stateChanged = true;
                        }
                    }

                    // 2. Destination Typos
                    if (corrections.destination_typo_found && corrections.corrected_destination) {
                        const correctDest = corrections.corrected_destination;
                        
                        if (logistics.mode === 'stationaer' && isTypo(logistics.stationary.destination, correctDest)) {
                            console.log(`[PlanningProcessor] Typo Fix (Stationary): ${logistics.stationary.destination} -> ${correctDest}`);
                            logistics.stationary.destination = correctDest;
                            stateChanged = true;
                        } else if (logistics.mode === 'mobil') {
                            if (isTypo(logistics.roundtrip.startLocation, correctDest)) {
                                console.log(`[PlanningProcessor] Typo Fix (Start): ${logistics.roundtrip.startLocation} -> ${correctDest}`);
                                logistics.roundtrip.startLocation = correctDest;
                                stateChanged = true;
                            }
                            if (isTypo(logistics.roundtrip.endLocation, correctDest)) {
                                console.log(`[PlanningProcessor] Typo Fix (End): ${logistics.roundtrip.endLocation} -> ${correctDest}`);
                                logistics.roundtrip.endLocation = correctDest;
                                stateChanged = true;
                            }
                            if (logistics.roundtrip.stops) {
                                logistics.roundtrip.stops.forEach((stop: any) => {
                                    if (isTypo(stop.location, correctDest)) {
                                        console.log(`[PlanningProcessor] Typo Fix (Stop): ${stop.location} -> ${correctDest}`);
                                        stop.location = correctDest;
                                        stateChanged = true;
                                    }
                                });
                            }
                        }
                    }

                    // 3. Hotel Validation (Write-back official names)
                    if (validatedHotels.length > 0 && logistics.mode === 'mobil' && logistics.roundtrip.stops) {
                        logistics.roundtrip.stops.forEach((stop: any) => {
                            if (stop.hotel) {
                                const match = validatedHotels.find((vh: any) => 
                                    vh.station === stop.location || isTypo(stop.location, vh.station)
                                );
                                
                                if (match && match.official_name && stop.hotel !== match.official_name) {
                                    console.log(`[PlanningProcessor] Hotel Fix: ${stop.hotel} -> ${match.official_name}`);
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
            }
        }
    },

    // --- IDEEN SCOUT (WILDCARDS) ---
    processIdeenScout: (data: any, debug: boolean) => {
        const { updatePlace, project, setAnalysisResult } = useTripStore.getState();
        if (data) setAnalysisResult('ideenScout', data);
        
        if (data && data.results && Array.isArray(data.results)) {
             // ROOT FIX: Wir nutzen einen lokalen Cache (runningPlaces), der innerhalb der Schleife aktualisiert wird!
             let runningPlaces = { ...(project.data?.places || {}) };
             let addedCount = 0;

             data.results.forEach((group: any) => {
                 const groupLocation = group.location || "Unbekannte Region";
                 const processList = (list: any[], subType: string) => {
                     if (!Array.isArray(list)) return;
                     list.forEach((item: any) => {
                         // Wir prüfen gegen runningPlaces, damit Dubletten im gleichen Batch erkannt werden
                         const targetId = resolvePlaceId(item, runningPlaces, debug);
                         const id = targetId || uuidv4();
                         
                         const placeData = {
                             id,
                             name: item.name,
                             category: 'special', // Unified category
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

                         updatePlace(id, placeData);
                         
                         // Sofortige Synchronisation für den nächsten Eintrag im Batch
                         runningPlaces[id] = { ...runningPlaces[id], ...placeData };
                         addedCount++;
                     });
                 };
                 processList(group.sunny_day_ideas, 'sunny');
                 processList(group.rainy_day_ideas, 'rainy');
                 processList(group.wildcard_ideas, 'wildcard');
             });
             console.log(`[IdeenScout] Added ${addedCount} special places with intermediate sync.`);
        }
    },

    // --- INFO AUTOR (CONTENT) ---
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
            console.log(`[InfoAutor] Persisted ${processedChapters.length} chapters.`);
        }
    },

    // --- TOUR GUIDE ---
    processTourGuide: (data: any) => {
         const { setAnalysisResult } = useTripStore.getState();
         if (data) {
              setAnalysisResult('tourGuide', data);
              if (data.guide && data.guide.tours) {
                  console.log(`[TourGuide] Persisted ${data.guide.tours.length} tours.`);
              }
         }
    },

    // --- COUNTRY SCOUT ---
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
// --- END OF FILE 270 Zeilen ---