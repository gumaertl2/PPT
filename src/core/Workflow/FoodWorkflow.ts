// 13.02.2026 12:00 - FEAT: "Quality Doorman" Logic (Loop-on-Failure).
// - Logic: Scans results for missing addresses/websites.
// - Logic: Triggers specific REPAIR CALLS only for defective candidates.
// - Logic: Merges repair data back into the main list.

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
     * 3. Expand Location (if needed) -> Get List of Towns
     * 4. Scout each Town (using Flash/Speed)
     * 5. QUALITY CHECK: Repair missing addresses (Loop-on-Failure)
     * 6. Enrich & Verify Candidates (using Thinking/Quality)
     */
    async execute(
        feedback: string | undefined,
        runStep: (task: TaskKey, feedback?: string, skipSave?: boolean, inputData?: any, enableSearch?: boolean, additionalContext?: any) => Promise<any>
    ) {
        const store = useTripStore.getState();
        
        console.log(`[FoodWorkflow] Starting INVERTED SEARCH PIPELINE V40.95`);
        
        try {
            // Reset Chunking State for UI Feedback
            store.setChunkingState({ isActive: true, currentChunk: 0, totalChunks: 4, results: [] });
            
            // 1. DETERMINE COUNTRY (AdHoc Support)
            let targetCountry = "";
            if (feedback) {
                const countryMatch = feedback.match(/COUNTRY:\s*([^|]+)/i);
                if (countryMatch && countryMatch[1]) targetCountry = countryMatch[1].trim();
            }
            if (!targetCountry) targetCountry = store.project.userInputs.logistics.target_countries?.[0] || "";
            if (!targetCountry && store.project.meta.language === 'de') targetCountry = "Deutschland";
            if (!targetCountry) targetCountry = "Europe";

            // 2. GET GUIDES (OBJECT ARRAY)
            const existingGuides = getGuidesForCountry(targetCountry);
            
            // 3. DETERMINE LOCATIONS
            let townList: string[] = [];
            const locMatch = feedback?.match(/LOC:([^|]+)/);
            const manualLocation = locMatch ? locMatch[1] : undefined;
            const geoInput = manualLocation ? [manualLocation] : undefined;

            const geoResult = await runStep('geoExpander', feedback, true, geoInput);
            if (geoResult && Array.isArray(geoResult.candidates)) townList = geoResult.candidates;
            else if (Array.isArray(geoResult)) townList = geoResult;

            console.log(`[FoodWorkflow] Starting Sequential Food Scouting for ${townList.length} towns...`);
            
            // 4. SCOUTING LOOP (Flash)
            let allScoutCandidates: any[] = [];
            const totalSteps = townList.length + 1;
            
            for (let i = 0; i < townList.length; i++) {
                const rawTown = townList[i];
                const town = cleanTownName(rawTown); 
                
                store.setChunkingState({ isActive: true, currentChunk: i + 1, totalChunks: totalSteps });
                console.log(`[FoodWorkflow] Scanning Town ${i+1}/${townList.length}: ${town}`);
                
                try {
                    const stepResult = await runStep(
                        'foodScout', 
                        feedback, 
                        true, // skipSave
                        [town], 
                        true, // enableSearch
                        { guides: existingGuides } 
                    );
                    
                    if (stepResult && Array.isArray(stepResult.candidates)) {
                        const tagged = stepResult.candidates.map((c: any) => ({
                            ...c,
                            city: town,
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
                // Check for missing critical data
                const isAddressMissing = !candidate.address || candidate.address.length < 5 || candidate.address.toLowerCase().includes("unknown");
                const isWebsiteMissing = !candidate.website;
                
                if (isAddressMissing) {
                    console.log(`[FoodWorkflow] REPAIRING: ${candidate.name} in ${candidate.city} (Missing Address)`);
                    
                    try {
                        // Trigger a specific, lightweight repair call using 'foodEnricher' schema or similar
                        // We construct a specific prompt just for this repair via feedback injection
                        const repairFeedback = `REPAIR_MODE|NAME:${candidate.name}|CITY:${candidate.city}|MISSING:Address`;
                        
                        // We re-use 'foodScout' but with a very specific input to force a lookup
                        // Or we use 'foodEnricher' which is designed for details. Let's use Enricher as it's 'Thinking' capable if needed, or Flash.
                        // Ideally, we use the simple Scout mechanism again but focused.
                        
                        // Let's invoke a targeted "Search" for this single item.
                        const repairResult = await runStep(
                            'foodScout', // Use Scout again as it has the Search Tool
                            repairFeedback, 
                            true, 
                            [`${candidate.name} ${candidate.city} address`], // Very specific search query as input
                            true,
                            { guides: [] } 
                        );

                        if (repairResult && repairResult.candidates && repairResult.candidates.length > 0) {
                            const repaired = repairResult.candidates[0];
                            if (repaired.address && repaired.address.length > 5) {
                                console.log(`[FoodWorkflow] REPAIR SUCCESS: ${repaired.address}`);
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
// --- END OF FILE 160 Lines ---