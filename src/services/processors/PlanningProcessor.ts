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

            // FIX: Apply Geography Correction from ChefPlaner to Store
            if (step === 'chefPlaner' && data.corrections?.inferred_country) {
                const inferredCountry = data.corrections.inferred_country;
                const currentCountries = store.project.userInputs.logistics.target_countries || [];
                
                // If we don't have a structured country yet, use the inferred one
                if (currentCountries.length === 0 || (currentCountries.length === 1 && !currentCountries[0])) {
                    console.log(`[PlanningProcessor] applying inferred country: ${inferredCountry}`);
                    
                    // FIX: updateLogistics type is too strict ('roundtrip'|'stationary'). 
                    // We use direct state manipulation for root fields.
                    useTripStore.setState((state) => ({
                        project: {
                            ...state.project,
                            userInputs: {
                                ...state.project.userInputs,
                                logistics: {
                                    ...state.project.userInputs.logistics,
                                    target_countries: [inferredCountry]
                                }
                            }
                        }
                    }));
                }
            }
        }
    },

    // --- IDEEN SCOUT (WILDCARDS) ---
    processIdeenScout: (data: any, debug: boolean) => {
        const { updatePlace, project, setAnalysisResult } = useTripStore.getState();
        if (data) setAnalysisResult('ideenScout', data);
        
        if (data && data.results && Array.isArray(data.results)) {
             const existingPlaces = project.data?.places || {};
             let addedCount = 0;
             data.results.forEach((group: any) => {
                 const groupLocation = group.location || "Unbekannte Region";
                 const processList = (list: any[], subType: string) => {
                     if (!Array.isArray(list)) return;
                     list.forEach((item: any) => {
                         const targetId = resolvePlaceId(item, existingPlaces, debug);
                         const id = targetId || uuidv4();
                         
                         updatePlace(id, {
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
                         });
                         addedCount++;
                     });
                 };
                 processList(group.sunny_day_ideas, 'sunny');
                 processList(group.rainy_day_ideas, 'rainy');
                 processList(group.wildcard_ideas, 'wildcard');
             });
             console.log(`[IdeenScout] Added ${addedCount} special places.`);
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
// --- END OF FILE 178 Zeilen ---