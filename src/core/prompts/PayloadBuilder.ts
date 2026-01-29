// 31.01.2026 19:45 - FIX: Corrected Task Names, Removed DurationEstimator. Logic Preserved.
// 31.01.2026 17:35 - FIX: Added HotelScout Preparer & Roundtrip Logic (Crucial for Camping/Roundtrips).
// 31.01.2026 13:00 - FIX: Removed "Deadly Fallback" in Food Candidate Selection.
// src/core/prompts/PayloadBuilder.ts

import { useTripStore } from '../../store/useTripStore';
import { INTEREST_DATA } from '../../data/interests';
import { CONFIG } from '../../data/config';

// --- TEMPLATES ---
import { buildChefPlanerPrompt } from './templates/chefPlaner';
import { buildBasisPrompt } from './templates/basis';
import { buildAnreichererPrompt } from './templates/anreicherer';
import { buildRouteArchitectPrompt } from './templates/routeArchitect';
// REMOVED: import { buildDurationEstimatorPrompt } from './templates/durationEstimator';
import { buildInitialTagesplanerPrompt } from './templates/initialTagesplaner';
import { buildTransferPlannerPrompt } from './templates/transferPlanner';
import { buildGeoAnalystPrompt } from './templates/geoAnalyst';
// NEW: Hotel Scout V40
import { buildHotelScoutPrompt } from './templates/hotelScout';
import { buildFoodScoutPrompt } from './templates/foodScout';
import { buildFoodEnricherPrompt } from './templates/foodEnricher';
import { buildTourGuidePrompt } from './templates/tourGuide';
import { buildChefredakteurPrompt } from './templates/chefredakteur';
import { buildInfoAutorPrompt } from './templates/infoAutor';
import { buildIdeenScoutPrompt } from './templates/ideenScout';

// --- PREPARERS (V40 Strategy Pattern) ---
import { prepareBasisPayload } from './preparers/prepareBasisPayload';
import { prepareAnreichererPayload } from './preparers/prepareAnreichererPayload';
import { prepareChefredakteurPayload } from './preparers/prepareChefredakteurPayload';
import { prepareChefPlanerPayload } from './preparers/prepareChefPlanerPayload';
import { prepareInfoAutorPayload } from './preparers/prepareInfoAutorPayload';
import { prepareTourGuidePayload } from './preparers/prepareTourGuidePayload';
import { prepareIdeenScoutPayload } from './preparers/prepareIdeenScoutPayload';
// NEW: Food & Hotel Preparers
import { prepareFoodScoutPayload } from './preparers/prepareFoodScoutPayload';
import { prepareFoodEnricherPayload } from './preparers/prepareFoodEnricherPayload';
import { prepareHotelScoutPayload } from './preparers/prepareHotelScoutPayload';

import type { LocalizedContent, TaskKey, ChunkingState, TripProject, FoodSearchMode } from '../types';
import { filterByRadius } from '../utils/geo';
import type { GeoPoint } from '../utils/geo';

export const PayloadBuilder = {
  // FIX: Added 'candidates' to options type definition to support RAM Pipeline
  buildPrompt: (task: TaskKey, feedback?: string, options?: { chunkIndex?: number, limit?: number, totalChunks?: number, candidates?: any[] }): string => {
    const state = useTripStore.getState();
    const { project, aiSettings, apiKey } = state; 
    const chunkingState = (state as any).chunkingState as ChunkingState;

    // --- HELPER FUNCTIONS ---

    const getTaskChunkLimit = (taskKey: TaskKey): number => {
        const mode = apiKey ? 'auto' : 'manual';
        const taskOverride = aiSettings.chunkOverrides?.[taskKey]?.[mode];
        if (taskOverride) return taskOverride;
        const globalLimit = aiSettings.chunkLimits?.[mode];
        if (globalLimit) return globalLimit;
        return CONFIG.taskRouting.chunkDefaults?.[taskKey]?.[mode] || 10;
    };

    const sliceData = (items: any[], taskKey: TaskKey) => {
        const validItems = items.filter(item => {
            if (!item) return false;
            if (typeof item === 'string') return true; 
            return item.id && item.name; 
        });

        const limit = options?.limit || getTaskChunkLimit(taskKey);
        const currentChunk = options?.chunkIndex || 
                             ((chunkingState?.isActive && chunkingState.currentChunk > 0) 
                             ? chunkingState.currentChunk 
                             : 1);
        const startIndex = (currentChunk - 1) * limit;
        const endIndex = startIndex + limit;
        return validItems.slice(startIndex, endIndex);
    };

    const getVisitedSightIds = (): string[] => {
        if (!chunkingState?.results || chunkingState.results.length === 0) return [];
        const ids = new Set<string>();
        chunkingState.results.forEach((resultBlock: any) => {
            if (resultBlock && resultBlock.tage && Array.isArray(resultBlock.tage)) {
                resultBlock.tage.forEach((tag: any) => {
                    if (tag.aktivitaeten && Array.isArray(tag.aktivitaeten)) {
                        tag.aktivitaeten.forEach((akt: any) => {
                            if (akt.original_sight_id) ids.add(akt.original_sight_id);
                        });
                    }
                });
            }
        });
        return Array.from(ids);
    };

    const getLastChunkEndLocation = (): string | undefined => {
        if (!chunkingState?.isActive || chunkingState.currentChunk <= 1 || !chunkingState.results) return undefined;
        const prevIndex = chunkingState.currentChunk - 2;
        const prevResult = chunkingState.results[prevIndex];
        if (prevResult && prevResult.tage && Array.isArray(prevResult.tage) && prevResult.tage.length > 0) {
            const lastDay = prevResult.tage[prevResult.tage.length - 1];
            return lastDay.ort;
        }
        return undefined;
    };

    const getFilteredFoodCandidates = (project: TripProject) => {
        // FIX: Removed dangerous fallback "|| Object.values(project.data.places).flat()".
        // If rawFoodCandidates is empty, we must return empty list, not all sights!
        const rawCandidates = (project.data.content as any)?.rawFoodCandidates || [];
        
        if (!rawCandidates || rawCandidates.length === 0) return [];

        const userLat = (project.userInputs as any).currentLocation?.lat;
        const userLng = (project.userInputs as any).currentLocation?.lng;

        if (userLat && userLng) {
            const center: GeoPoint = { lat: userLat, lng: userLng };
            let filtered = filterByRadius(rawCandidates, center, 0.5, (c: any) => c.geo);
            if (filtered.length === 0) filtered = filterByRadius(rawCandidates, center, 2.0, (c: any) => c.geo);
            if (filtered.length === 0) filtered = filterByRadius(rawCandidates, center, 10.0, (c: any) => c.geo);
            return filtered.length > 0 ? filtered : rawCandidates.slice(0, 5); 
        }
        return rawCandidates;
    };

    // --- PROMPT GENERATION ---
    let generatedPrompt = "";

    switch (task) {
      // --- 1. NEW ARCHITECTURE (Preparer Pattern) ---

      case 'basis':
      case 'sightCollector': {
        // V40 FIX: Pass chunking options to enable interest slicing & ratio logic
        const payload = prepareBasisPayload(
            project,
            options?.chunkIndex || chunkingState?.currentChunk || 1,
            options?.totalChunks || chunkingState?.totalChunks || 1
        );
        generatedPrompt = buildBasisPrompt(payload);
        break;
      }
      
      case 'anreicherer':
      case 'intelligentEnricher': {
        const allPlaces = Object.values(project.data.places || {}).flat();
        const slicedCandidates = sliceData(allPlaces, 'anreicherer');
        
        const payload = prepareAnreichererPayload(
            project, 
            slicedCandidates,
            options?.chunkIndex || chunkingState?.currentChunk || 1,
            options?.totalChunks || chunkingState?.totalChunks || 1
        );
        generatedPrompt = buildAnreichererPrompt(payload);
        break;
      }

      case 'chefredakteur': { // Renamed from details
          // V40: FIX - Slice FIRST, then call Preparer
          const allPlacesForEditor = Object.values(project.data.places || {}).flat();
          const slicedCandidatesForEditor = sliceData(allPlacesForEditor, 'chefredakteur' as TaskKey);

          const payload = prepareChefredakteurPayload(
              project, 
              slicedCandidatesForEditor, 
              options?.chunkIndex || chunkingState?.currentChunk || 1, 
              options?.totalChunks || chunkingState?.totalChunks || 1
          );

          // WICHTIG: Template erwartet Array, Preparer liefert Objekt (Rich Version)
          generatedPrompt = buildChefredakteurPrompt(
              project, 
              payload.context.editorial_tasks, 
              options?.chunkIndex || chunkingState?.currentChunk || 1, 
              options?.totalChunks || chunkingState?.totalChunks || 1
          ) || "";
          break;
      }

      case 'infoAutor': { // Renamed from infos
          const allInfoTasks = prepareInfoAutorPayload(project);
          const slicedTasks = sliceData(allInfoTasks, 'infoAutor');
          generatedPrompt = buildInfoAutorPrompt(
              project, 
              slicedTasks, 
              options?.chunkIndex || chunkingState?.currentChunk || 1, 
              options?.totalChunks || chunkingState?.totalChunks || 1, 
              [] 
          ) || "";
          break;
      }

      case 'ideenScout': { // Renamed from sondertage
          const allIdeenTasks = prepareIdeenScoutPayload(project);
          const slicedIdeenTasks = sliceData(allIdeenTasks, 'ideenScout');
          generatedPrompt = buildIdeenScoutPrompt(
              project, 
              slicedIdeenTasks,
              options?.chunkIndex || chunkingState?.currentChunk || 1,
              options?.totalChunks || chunkingState?.totalChunks || 1
          ) || "";
          break;
      }

      case 'tourGuide': { // Renamed from guide
           const payload = prepareTourGuidePayload(project);
           generatedPrompt = buildTourGuidePrompt(payload);
           break;
      }

      case 'chefPlaner': {
        const payload = prepareChefPlanerPayload(project, feedback);
        generatedPrompt = buildChefPlanerPrompt(payload);
        break;
      }

      // --- FOOD SECTION (V40 UPGRADE) ---

      case 'foodScout': { // Renamed from food
          let mode: FoodSearchMode = 'standard';
          if ((feedback && feedback.toLowerCase().includes('sterne')) || 
              project.userInputs.customPreferences?.foodMode === 'stars') {
              mode = 'stars';
          }
          // V40: Use specialized Preparer
          const payload = prepareFoodScoutPayload(project, mode, feedback || "");
          generatedPrompt = buildFoodScoutPrompt(payload);
          break;
      }
        
      case 'foodEnricher': {
          // 1. SOURCE: Try to get candidates from RAM Pipeline (options.candidates) FIRST.
          let candidates = options?.candidates || [];

          // If not in RAM, try Store (Analysis/Legacy)
          if (!candidates || candidates.length === 0) {
             candidates = (project.analysis as any).foodScout?.candidates || [];
          }

          // If still empty, try fallback filter (but only on rawFoodCandidates!)
          if (!candidates || candidates.length === 0) {
             candidates = getFilteredFoodCandidates(project);
          }

          // 2. SLICE: Batching logic
          const slicedCandidates = sliceData(candidates, 'foodEnricher');
          
          // 3. GENERATE: Call Preparer & Template
          if (slicedCandidates.length === 0 && candidates.length === 0) {
              const payload = prepareFoodEnricherPayload(
                  project, 
                  [],
                  options?.chunkIndex || chunkingState?.currentChunk || 1,
                  options?.totalChunks || chunkingState?.totalChunks || 1
              );
              generatedPrompt = buildFoodEnricherPrompt(payload); 
          } else {
              const payload = prepareFoodEnricherPayload(
                  project, 
                  slicedCandidates,
                  options?.chunkIndex || chunkingState?.currentChunk || 1,
                  options?.totalChunks || chunkingState?.totalChunks || 1
              );
              generatedPrompt = buildFoodEnricherPrompt(payload);
          }
          break;
      }

      // --- ACCOMMODATION / HOTEL SCOUT (V40 UPGRADE) ---
      case 'hotelScout': { // Renamed from accommodation
          // ROUNDTRIP LOGIC: Calculate Stops
          const isRoundtrip = project.userInputs.logistics.mode === 'roundtrip';
          const totalStops = isRoundtrip ? (project.userInputs.logistics.roundtrip.stops?.length || 1) : 1;
          
          // Determine Chunk (Default 1)
          const currentChunk = options?.chunkIndex || chunkingState?.currentChunk || 1;

          // 1. PREPARE (Select Stop based on Chunk)
          const payload = prepareHotelScoutPayload(project, currentChunk);
          
          // 2. BUILD PROMPT (Pass Payload)
          generatedPrompt = buildHotelScoutPrompt(payload);
          break;
      }

      // --- 2. LEGACY HANDLERS ---
      
      case 'routeArchitect':
      case 'routenArchitekt':
        generatedPrompt = buildRouteArchitectPrompt(project);
        break;

      // REMOVED: DurationEstimator

      case 'initialTagesplaner': { // Renamed from dayplan
        let contextData: any = undefined;
        const isActive = options ? true : chunkingState?.isActive;
        if (isActive) {
            const limit = options?.limit || getTaskChunkLimit('initialTagesplaner');
            const currentChunk = options?.chunkIndex || chunkingState.currentChunk;
            const dayOffset = (currentChunk - 1) * limit;
            const totalChunks = options?.totalChunks || chunkingState.totalChunks;
            const totalDuration = project.userInputs.dates.duration;
            const daysInChunk = Math.min(limit, totalDuration - dayOffset);

            contextData = {
                dayOffset: dayOffset,
                days: daysInChunk,
                isChunked: true,
                chunkIndex: currentChunk,
                totalChunks: totalChunks
            };
        }
        generatedPrompt = buildInitialTagesplanerPrompt(project, contextData, feedback, getVisitedSightIds());
        break;
      }

      case 'transferPlanner': { // Renamed from transfers
        const lastLoc = getLastChunkEndLocation() || '';
        generatedPrompt = buildTransferPlannerPrompt(project, lastLoc);
        break;
      }

      case 'geoAnalyst':
        generatedPrompt = buildGeoAnalystPrompt(project);
        break;

      default:
        throw new Error(`PayloadBuilder: Unknown task '${task}'`);
    }

    return generatedPrompt;
  },

  buildChefPlanerPayload: () => {
    const state = useTripStore.getState();
    const { userInputs, meta } = state.project;
    const langMap: Record<string, string> = { de: 'Deutsch', en: 'Englisch' };
    const outputLangCode = userInputs.aiOutputLanguage || 'de';
    const outputLangName = langMap[outputLangCode] || 'Deutsch';

    const resolvePrompt = (p: string | LocalizedContent | undefined): string => {
        if (!p) return '';
        if (typeof p === 'string') return p;
        return p.de || '';
    };

    return {
      lang: outputLangName,
      travelers: userInputs.travelers,
      dates: userInputs.dates,
      logistics: userInputs.logistics,
      interests: userInputs.selectedInterests.map(id => ({
        id,
        label: INTEREST_DATA[id]?.label.de || id,
        prompt: resolvePrompt(INTEREST_DATA[id]?.prompt),
        custom: userInputs.customPreferences[id] || null
      })),
      preferences: { pace: userInputs.pace, budget: userInputs.budget, vibe: userInputs.vibe, strategy: userInputs.strategyId },
      notes: userInputs.notes,
      appVersion: meta.version
    };
  }
};
// --- END OF FILE 565 Zeilen ---