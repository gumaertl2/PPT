// [2026-11-02] [22:57] - FIX: Cleared unprioritized/unvisited stale Restaurant entries before saving fresh full-trip FoodWorkflow results.
// [2026-11-02] [22:51] - FIX: Normalized district names in cleanTownName to prevent duplicate city scouting and deduplicated allScoutCandidates across towns.
// [2026-11-02] [19:48] - FIX: Chunked foodEnricher step across allScoutCandidates via LimitManager and preserved candidate city metadata across enrichment.
// [2026-10-26] [18:22] - FIX: Guarded roundtrip.stops check against unconfirmed duration=0 placeholders when routeArchitect routes exist.
// [2026-10-25] [15:04] - FIX: Prioritized confirmed roundtrip.stops over routeArchitect.routes[0] while preserving stationary mode.
// 23.02.2026 13:10 - MERGE: Full Multi-City Logic & Repair Loop combined with Workflow Kill-Switch.
// 23.02.2026 11:35 - UX/FEAT: Added Dynamic Storytelling (Live UI-Updates for City Chunking & Repair Loop).
// 20.02.2026 16:30 - FEAT: Implemented true Multi-City Chunking. Scans all hubs/districts and runs sequential foodScout loop.
// 13.02.2026 12:00 - FEAT: "Quality Doorman" Logic (Loop-on-Failure).
// src/core/Workflow/FoodWorkflow.ts

import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../../store/useTripStore';
import { getGuidesForCountry } from '../../data/countries';
import { LimitManager } from '../utils/LimitManager';
import { FoodProcessor } from '../../services/processors/FoodProcessor';
import type { TaskKey } from '../types';

// Helper duplicate to be self-contained
const cleanTownName = (name: string): string => {
    if (!name) return "";
    const base = name.split('(')[0].trim();
    if (base.includes(',')) {
        const parts = base.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) return parts[parts.length - 1];
    }
    return base.replace(/^(Stadtbezirk|Stadtviertel|Bezirk|Viertel|Altstadt von|Altstadt|Historisches Zentrum von|Historisches Zentrum|Historic Center of|Centro Histórico de|Bairro de|Bairro|Quartier)\s+/i, '').trim();
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
            
            // 3. BUILD TOWN LIST
            let townList: string[] = [];
            const locMatch = feedback?.match(/LOC:([^|]+)/);
            const manualLocation = locMatch ? locMatch[1] : undefined;

            if (manualLocation) {
                townList.push(manualLocation);
            }

            const logistics = store.project.userInputs.logistics;
            const rawStops = logistics.roundtrip?.stops || [];
            const hasRouteArchitect = Boolean(store.project.analysis?.routeArchitect?.routes?.[0]?.stages?.length);
            const hasConfirmedStops = rawStops.length > 0 && (rawStops.some((s: any) => (s.duration || 0) > 0) || !hasRouteArchitect);
            if (logistics.mode === 'stationaer' && logistics.stationary?.destination) {
                townList.push(logistics.stationary.destination);
            } else if (hasConfirmedStops) {
                townList.push(...rawStops.map((s: any) => s.location));
            } else if (store.project.analysis?.routeArchitect?.routes?.[0]?.stages) {
                townList.push(...store.project.analysis.routeArchitect.routes[0].stages.map((s: any) => s.location_name));
            }

            const places = Object.values(store.project.data.places || {});
            places.forEach((p: any) => {
                if (p.category === 'districts' || p.category === 'city_info') {
                    const cityName = cleanTownName(p.name);
                    if (cityName) townList.push(cityName);
                }
            });

            townList = Array.from(new Set(townList.map(t => cleanTownName(t)))).filter(t => t && t.length > 2);
            if (townList.length === 0) townList = ["Region"];

            console.log(`[FoodWorkflow] Starting Sequential Food Scouting for ${townList.length} towns:`, townList);
            
            // 4. SCOUTING LOOP (Flash per City)
            let allScoutCandidates: any[] = [];
            const totalSteps = townList.length + 1; 
            
            for (let i = 0; i < townList.length; i++) {
                // --- KILL-SWITCH CHECK ---
                if (useTripStore.getState().workflow.status !== 'generating') return null;

                const town = townList[i];
                store.setChunkingState({ isActive: true, currentChunk: i + 1, totalChunks: totalSteps });
                
                const loadingNotif = store.notifications.find((n: any) => n.type === 'loading');
                if (loadingNotif) {
                    const isDe = store.project.meta?.language === 'de';
                    const msg = isDe 
                        ? `🍔 Suche Restaurants in ${town} (${i + 1} von ${totalSteps})...` 
                        : `🍔 Scouting restaurants in ${town} (${i + 1} of ${totalSteps})...`;
                    store.updateNotification(loadingNotif.id, { message: msg });
                }
                
                try {
                    const stepResult = await runStep('foodScout', feedback, true, [town], true, { guides: existingGuides });
                    
                    if (stepResult && Array.isArray(stepResult.candidates)) {
                        for (const c of stepResult.candidates) {
                            const normName = String(c?.name || '').trim().toLowerCase();
                            if (!normName) continue;
                            const alreadyExists = allScoutCandidates.some((existing: any) => String(existing?.name || '').trim().toLowerCase() === normName);
                            if (!alreadyExists) {
                                allScoutCandidates.push({
                                    ...c,
                                    city: town,
                                    id: c.id || uuidv4()
                                });
                            }
                        }
                    }
                    await safetyDelay(500); 
                } catch (e) {
                    console.warn(`[FoodWorkflow] Failed to scout food for ${town}`, e);
                }
            }

            // 5. THE QUALITY DOORMAN (Repair Loop)
            for (const candidate of allScoutCandidates) {
                // --- KILL-SWITCH CHECK ---
                if (useTripStore.getState().workflow.status !== 'generating') return null;

                const isAddressMissing = !candidate.address || candidate.address.length < 5 || candidate.address.toLowerCase().includes("unknown");
                
                if (isAddressMissing) {
                    const loadingNotif = store.notifications.find((n: any) => n.type === 'loading');
                    if (loadingNotif) {
                        const isDe = store.project.meta?.language === 'de';
                        const msg = isDe 
                            ? `🔧 Repariere Adresse: ${candidate.name}...` 
                            : `🔧 Repairing address: ${candidate.name}...`;
                        store.updateNotification(loadingNotif.id, { message: msg });
                    }
                    
                    try {
                        const repairFeedback = `REPAIR_MODE|NAME:${candidate.name}|CITY:${candidate.city}|MISSING:Address`;
                        const repairResult = await runStep('foodScout', repairFeedback, true, [`${candidate.name} ${candidate.city} address`], true, { guides: [] });

                        if (repairResult?.candidates?.[0]) {
                            const repaired = repairResult.candidates[0];
                            if (repaired.address && repaired.address.length > 5) {
                                candidate.address = repaired.address;
                                if (repaired.phone) candidate.phone = repaired.phone;
                                if (repaired.website) candidate.website = repaired.website;
                            }
                        }
                    } catch (err) {}
                    await safetyDelay(300);
                }
            }

            if (allScoutCandidates.length === 0) return;

            // 6. ENRICHMENT PHASE (Thinking/Quality)
            let enricherFeedback = feedback || "";
            if (existingGuides) {
                const guideNames = existingGuides.map(g => g.name).join(', ');
                enricherFeedback = enricherFeedback ? `${enricherFeedback}|GUIDES:${guideNames}` : `GUIDES:${guideNames}`;
            }

            const enrichLimit = LimitManager.getTaskLimit('foodEnricher', !useTripStore.getState().apiKey);
            const totalEnrichChunks = Math.max(1, Math.ceil(allScoutCandidates.length / enrichLimit));
            const finalTotalSteps = townList.length + totalEnrichChunks;
            const validCandidates: any[] = [];
            let hasClearedStaleRestaurants = false;

            for (let chunkIdx = 0; chunkIdx < totalEnrichChunks; chunkIdx++) {
                // --- KILL-SWITCH CHECK ---
                if (useTripStore.getState().workflow.status !== 'generating') return null;

                const currentStepNum = townList.length + chunkIdx + 1;
                const batchCandidates = allScoutCandidates.slice(chunkIdx * enrichLimit, (chunkIdx + 1) * enrichLimit);

                store.setChunkingState({ isActive: true, currentChunk: currentStepNum, totalChunks: finalTotalSteps });

                const finalNotif = useTripStore.getState().notifications.find((n: any) => n.type === 'loading');
                if (finalNotif) {
                    const isDe = store.project.meta?.language === 'de';
                    const batchSuffix = totalEnrichChunks > 1 ? ` [Block ${chunkIdx + 1}/${totalEnrichChunks}]` : '';
                    const msg = isDe 
                        ? `👨‍🍳 Verifiziere Restaurant-Daten${batchSuffix} (${currentStepNum} von ${finalTotalSteps})...` 
                        : `👨‍🍳 Verifying restaurant data${batchSuffix} (${currentStepNum} of ${finalTotalSteps})...`;
                    store.updateNotification(finalNotif.id, { message: msg });
                }

                try {
                    const enricherResult = await runStep('foodEnricher', enricherFeedback, true, batchCandidates);
                    if (!enricherResult) continue;

                    let chunkFinal: any[] = [];
                    if (enricherResult.enriched_candidates) chunkFinal = enricherResult.enriched_candidates;
                    else if (enricherResult.candidates) chunkFinal = enricherResult.candidates;
                    else if (enricherResult.places) chunkFinal = Object.values(enricherResult.places);
                    else if (Array.isArray(enricherResult)) chunkFinal = enricherResult;

                    const chunkValid = chunkFinal
                        .filter((c: any) => c.verification_status !== 'rejected')
                        .map((c: any) => {
                            const matchedScout = batchCandidates.find((b: any) =>
                                b.id === c.id || (b.name && c.name && String(b.name).toLowerCase() === String(c.name).toLowerCase())
                            );
                            return {
                                ...c,
                                id: c.id || matchedScout?.id || uuidv4(),
                                city: c.city || matchedScout?.city
                            };
                        });

                    if (chunkValid.length > 0) {
                        if (!manualLocation && !hasClearedStaleRestaurants) {
                            hasClearedStaleRestaurants = true;
                            useTripStore.setState((s) => {
                                const currentPlaces = { ...(s.project.data.places || {}) };
                                Object.keys(currentPlaces).forEach((pid) => {
                                    const p = currentPlaces[pid] as any;
                                    const isRestaurant = p?.category === 'Restaurant' || p?.category === 'restaurant';
                                    const isProtected = Boolean(p?.userPriority && p.userPriority !== 0) || Boolean(p?.visited) || Boolean(p?.userNote) || Boolean(p?.isFixed);
                                    if (isRestaurant && !isProtected) {
                                        delete currentPlaces[pid];
                                    }
                                });
                                return {
                                    project: {
                                        ...s.project,
                                        data: {
                                            ...s.project.data,
                                            places: currentPlaces,
                                            content: {
                                                ...s.project.data.content,
                                                rawFoodCandidates: allScoutCandidates
                                            }
                                        }
                                    }
                                };
                            });
                        }
                        FoodProcessor.processFoodOrHotel({ candidates: chunkValid }, 'foodEnricher', useTripStore.getState().aiSettings.debug);
                        validCandidates.push(...chunkValid);
                    }
                    await safetyDelay(500);
                } catch (e) {
                    console.warn(`[FoodWorkflow] Failed to enrich food batch ${chunkIdx + 1}/${totalEnrichChunks}`, e);
                }
            }
            
            return { candidates: validCandidates };

        } catch (err) {
            console.error("[FoodWorkflow] Sequence Failed", err);
            throw err;
        } finally {
            store.resetChunking();
        }
    }
};
// --- END OF FILE 281 Zeilen ---