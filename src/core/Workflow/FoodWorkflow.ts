// 20.02.2026 16:30 - FEAT: Implemented true Multi-City Chunking. Scans all hubs/districts and runs sequential foodScout loop.
// 16.02.2026 21:40 - FIX: UNUSED VARIABLE (Vercel Build Error).
// 13.02.2026 12:00 - FEAT: "Quality Doorman" Logic (Loop-on-Failure).
// src/core/Workflow/FoodWorkflow.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../../store/useTripStore';
import { getGuidesForCountry } from '../../data/countries';
import type { TaskKey } from '../types';

// Helper duplicate to be self-contained
const cleanTownName = (name: string): string => {
    if (!name) return "";
    return name.split('(')[0].trim();
};

const safetyDelay = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const FoodWorkflow = {
    /**
     * Executes the Inverted Search Pipeline for Food:
     * 1. Determine Country/Region
     * 2. Load Guides (Michelin, Falstaff, etc.)
     * 3. Expand Locations (Hubs + Districts) -> Get List of Towns
     * 4. Scout each Town (using Flash/Speed in a loop!)
     * 5. QUALITY CHECK: Repair missing addresses (Loop-on-Failure)
     * 6. Enrich & Verify Candidates (using Thinking/Quality)
     */
    async execute(
        feedback: string | undefined,
        runStep: (task: TaskKey, feedback?: string, skipSave?: boolean, inputData?: any, enableSearch?: boolean, additionalContext?: any) => Promise<any>
    ) {
        const store = useTripStore.getState();
        
        console.log(`[FoodWorkflow] Starting INVERTED SEARCH PIPELINE V40.95 (Multi-City)`);
        
        try {
            store.setChunkingState({ isActive: true, currentChunk: 0, totalChunks: 4, results: [] });
            
            // 1. DETERMINE COUNTRY 
            let targetCountry = "";
            if (feedback) {
                const countryMatch = feedback.match(/COUNTRY:\s*([^|]+)/i);
                if (countryMatch && countryMatch[1]) targetCountry = countryMatch[1].trim();
            }
            if (!targetCountry) targetCountry = store.project.userInputs.logistics.target_countries?.[0] || "";
            if (!targetCountry && store.project.meta.language === 'de') targetCountry = "Deutschland";
            if (!targetCountry) targetCountry = "Europe";

            // 2. GET GUIDES 
            const existingGuides = getGuidesForCountry(targetCountry);
            
           // 3. BUILD TOWN LIST (Dynamic Chunking)
            let townList: string[] = [];
            const locMatch = feedback?.match(/LOC:([^|]+)/);
            const manualLocation = locMatch ? locMatch[1] : undefined;

            // GeoExpander API-Call entfernt. Ad-Hoc-Orte direkt übernehmen:
            if (manualLocation) {
                townList.push(manualLocation);
            }

            // SMART SCANNER: Add all actually visited hubs and cities to the list!
            const logistics = store.project.userInputs.logistics;
            if (logistics.mode === 'stationaer' && logistics.stationary?.destination) {
                townList.push(logistics.stationary.destination);
            } else if (store.project.analysis?.routeArchitect?.routes?.[0]?.stages) {
                townList.push(...store.project.analysis.routeArchitect.routes[0].stages.map((s: any) => s.location_name));
            } else if (logistics.roundtrip?.stops) {
                townList.push(...logistics.roundtrip.stops.map((s: any) => s.location));
            }

            const places = Object.values(store.project.data.places || {});
            places.forEach((p: any) => {
                if (p.category === 'districts' || p.category === 'city_info') {
                    const cityName = cleanTownName(p.name);
                    if (cityName) townList.push(cityName);
                }
            });

            // Clean up and deduplicate the townList
            townList = Array.from(new Set(townList.map(t => cleanTownName(t)))).filter(t => t && t.length > 2);
            if (townList.length === 0) townList = ["Region"];

            console.log(`[FoodWorkflow] Starting Sequential Food Scouting for ${townList.length} towns:`, townList);
            
            // 4. SCOUTING LOOP (Flash per City)
            let allScoutCandidates: any[] = [];
            const totalSteps = townList.length + 1; // +1 for Enricher Phase
            
            for (let i = 0; i < townList.length; i++) {
                const town = townList[i];
                
                store.setChunkingState({ isActive: true, currentChunk: i + 1, totalChunks: totalSteps });
                console.log(`[FoodWorkflow] Scanning Town ${i+1}/${townList.length}: ${town}`);
                
                try {
                    const stepResult = await runStep(
                        'foodScout', 
                        feedback, 
                        true, // skipSave
                        [town], // Pass single town!
                        true, // enableSearch
                        { guides: existingGuides } 
                    );
                    
                    if (stepResult && Array.isArray(stepResult.candidates)) {
                        const tagged = stepResult.candidates.map((c: any) => ({
                            ...c,
                            city: town, // Tag it with the searched city
                            id: c.id || uuidv4()
                        }));
                        allScoutCandidates.push(...tagged);
                    }
                    await safetyDelay(500); 
                } catch (e) {
                    console.warn(`[FoodWorkflow] Failed to scout food for ${town}`, e);
                }
            }

            // 5. THE QUALITY DOORMAN (Repair Loop)
            console.log(`[FoodWorkflow] Quality Check for ${allScoutCandidates.length} candidates...`);
            
            for (const candidate of allScoutCandidates) {
                const isAddressMissing = !candidate.address || candidate.address.length < 5 || candidate.address.toLowerCase().includes("unknown");
                
                if (isAddressMissing) {
                    console.log(`[FoodWorkflow] REPAIRING: ${candidate.name} in ${candidate.city}`);
                    
                    try {
                        const repairFeedback = `REPAIR_MODE|NAME:${candidate.name}|CITY:${candidate.city}|MISSING:Address`;
                        const repairResult = await runStep(
                            'foodScout', 
                            repairFeedback, 
                            true, 
                            [`${candidate.name} ${candidate.city} address`], 
                            true,
                            { guides: [] } 
                        );

                        if (repairResult && repairResult.candidates && repairResult.candidates.length > 0) {
                            const repaired = repairResult.candidates[0];
                            if (repaired.address && repaired.address.length > 5) {
                                candidate.address = repaired.address;
                                if (repaired.phone) candidate.phone = repaired.phone;
                                if (repaired.website) candidate.website = repaired.website;
                            }
                        }
                    } catch (err) {
                        console.warn(`[FoodWorkflow] Repair failed for ${candidate.name}`, err);
                    }
                    await safetyDelay(300);
                }
            }

            if (allScoutCandidates.length === 0) return;

            // 6. ENRICHMENT PHASE (Thinking/Quality)
            store.setChunkingState({ isActive: true, currentChunk: totalSteps, totalChunks: totalSteps });
            
            let enricherFeedback = feedback || "";
            if (existingGuides) {
                const guideNames = existingGuides.map(g => g.name).join(', ');
                enricherFeedback = enricherFeedback ? `${enricherFeedback}|GUIDES:${guideNames}` : `GUIDES:${guideNames}`;
            }

            const enricherResult = await runStep('foodEnricher', enricherFeedback, false, allScoutCandidates); 
            
            let finalCandidates: any[] = [];
            if (enricherResult.enriched_candidates) finalCandidates = enricherResult.enriched_candidates;
            else if (enricherResult.candidates) finalCandidates = enricherResult.candidates;
            else if (enricherResult.places) finalCandidates = Object.values(enricherResult.places);
            else if (Array.isArray(enricherResult)) finalCandidates = enricherResult;

            let validCandidates = finalCandidates.filter((c: any) => c.verification_status !== 'rejected');
            validCandidates = validCandidates.map((c: any) => ({ ...c, id: c.id || uuidv4() }));
            
            return { candidates: validCandidates };

        } catch (err) {
            console.error("[FoodWorkflow] Sequence Failed", err);
            throw err;
        } finally {
            store.resetChunking();
        }
    }
};
// --- END OF FILE 178 Zeilen ---