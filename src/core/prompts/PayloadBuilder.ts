// 17.02.2026 18:55 - WIRING: Connected V40 Tagesplaner Pipeline (Preparer -> Template).
// 10.02.2026 21:00 - FIX: Removed Syntax Error ("\n") in buildChefPlanerPayload.
// 05.02.2026 22:30 - FIX: Implemented Selective Run & Updated Call Signature for Chefredakteur.
// 05.02.2026 17:30 - FIX: REMOVE LEGACY KEYS & SPELLING.
// src/core/prompts/PayloadBuilder.ts

import { useTripStore } from '../../store/useTripStore';
import { INTEREST_DATA } from '../../data/interests';
import { CONFIG } from '../../data/config';

// --- TEMPLATES ---
import { buildChefPlanerPrompt } from './templates/chefPlaner';
import { buildBasisPrompt } from './templates/basis';
import { buildAnreichererPrompt } from './templates/anreicherer';
import { buildRouteArchitectPrompt } from './templates/routeArchitect';
import { buildInitialTagesplanerPrompt } from './templates/initialTagesplaner';
import { buildTransferPlannerPrompt } from './templates/transferPlanner';
import { buildGeoAnalystPrompt } from './templates/geoAnalyst';
import { buildHotelScoutPrompt } from './templates/hotelScout';
import { buildFoodScoutPrompt } from './templates/foodScout';
import { buildFoodEnricherPrompt } from './templates/foodEnricher';
import { buildTourGuidePrompt } from './templates/tourGuide';
import { buildChefredakteurPrompt } from './templates/chefredakteur';
import { buildInfoAutorPrompt } from './templates/infoAutor';
import { buildIdeenScoutPrompt } from './templates/ideenScout';
import { buildGeoExpanderPrompt } from './templates/geoExpander';

// --- PREPARERS ---
import { prepareBasisPayload } from './preparers/prepareBasisPayload';
import { prepareAnreichererPayload } from './preparers/prepareAnreichererPayload';
import { prepareChefredakteurPayload } from './preparers/prepareChefredakteurPayload';
import { prepareChefPlanerPayload } from './preparers/prepareChefPlanerPayload';
import { prepareInfoAutorPayload } from './preparers/prepareInfoAutorPayload';
import { prepareTourGuidePayload } from './preparers/prepareTourGuidePayload';
import { prepareIdeenScoutPayload } from './preparers/prepareIdeenScoutPayload';
import { prepareFoodScoutPayload } from './preparers/prepareFoodScoutPayload';
import { prepareFoodEnricherPayload } from './preparers/prepareFoodEnricherPayload';
import { prepareHotelScoutPayload } from './preparers/prepareHotelScoutPayload';
import { prepareGeoExpanderPayload } from './preparers/prepareGeoExpanderPayload';
import { prepareTagesplanerPayload } from './preparers/prepareTagesplanerPayload'; // NEW

import type { LocalizedContent, TaskKey, ChunkingState, TripProject, FoodSearchMode } from '../types';
import { filterByRadius } from '../utils/geo';
import type { GeoPoint } from '../utils/geo';

export const PayloadBuilder = {
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
      // --- 1. CORE WORKFLOW ---

      case 'basis': {
        const payload = prepareBasisPayload(
            project,
            options?.chunkIndex || chunkingState?.currentChunk || 1,
            options?.totalChunks || chunkingState?.totalChunks || 1
        );
        generatedPrompt = buildBasisPrompt(payload);
        break;
      }
      
      case 'anreicherer': {
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

      case 'details':
      case 'chefredakteur': {
          let candidatesToProcess: any[] = [];

          if (options?.candidates && options.candidates.length > 0) {
              candidatesToProcess = options.candidates;
          } else {
              const allPlacesForEditor = Object.values(project.data.places || {}).flat();
              candidatesToProcess = sliceData(allPlacesForEditor, 'chefredakteur');
          }

          const payload = prepareChefredakteurPayload(
              { project }, 
              { 
                  candidates: candidatesToProcess, 
                  chunkIndex: options?.chunkIndex || chunkingState?.currentChunk || 1, 
                  totalChunks: options?.totalChunks || chunkingState?.totalChunks || 1,
                  limit: options?.limit
              }
          );

          generatedPrompt = buildChefredakteurPrompt(
              project, 
              payload.context.editorial_tasks, 
              options?.chunkIndex || chunkingState?.currentChunk || 1, 
              options?.totalChunks || chunkingState?.totalChunks || 1
          ) || "";
          break;
      }

      case 'infos':
      case 'infoAutor': {
          const allInfoTasks = prepareInfoAutorPayload(project);
          const slicedTasks = sliceData(allInfoTasks, 'infoAutor');
          generatedPrompt = buildInfoAutorPrompt(
              {
                 context: {
                     destination: project.userInputs.logistics.stationary.destination || "Reiseziel",
                     dates: project.userInputs.dates.start ? `${project.userInputs.dates.start} - ${project.userInputs.dates.end}` : "Flexibel",
                     travelers: `${project.userInputs.travelers.adults} Erwachsene, ${project.userInputs.travelers.children} Kinder`,
                     tasks: slicedTasks
                 }
              }
          ) || "";
          break;
      }

      case 'sondertage':
      case 'ideenScout': {
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

      case 'guide':
      case 'tourGuide': {
           const payload = prepareTourGuidePayload(project);
           generatedPrompt = buildTourGuidePrompt(payload);
           break;
      }

      case 'chefPlaner': {
        const payload = prepareChefPlanerPayload(project, feedback);
        generatedPrompt = buildChefPlanerPrompt(payload);
        break;
      }

      // --- FOOD SECTION ---

      case 'food':
      case 'foodScout': {
          let mode: FoodSearchMode = 'standard';
          if ((feedback && feedback.toLowerCase().includes('sterne')) || 
              project.userInputs.customPreferences?.foodMode === 'stars') {
              mode = 'stars';
          }
          
          if (options?.candidates && options.candidates.length > 0) {
             console.log(`[PayloadBuilder] FoodScout processing specific candidates:`, options.candidates);
          }

          const payload = prepareFoodScoutPayload(project, mode, feedback || "", options);
          generatedPrompt = buildFoodScoutPrompt(project, payload.context);
          break;
      }
      
      case 'geoExpander': {
          const payload = prepareGeoExpanderPayload(project, feedback);
          generatedPrompt = buildGeoExpanderPrompt(project, payload.context);
          break;
      }
        
      case 'foodEnricher': {
          let candidates = options?.candidates || [];

          if (!candidates || candidates.length === 0) {
             candidates = (project.analysis as any).foodScout?.candidates || [];
          }

          if (!candidates || candidates.length === 0) {
             candidates = getFilteredFoodCandidates(project);
          }

          let slicedCandidates: any[] = [];
          
          const isRamDirectCall = !!(options?.candidates && options.candidates.length > 0);
          const isExplicitBatch = options?.chunkIndex !== undefined;

          if (isRamDirectCall && !isExplicitBatch) {
              const limit = options?.limit || getTaskChunkLimit('foodEnricher');
              slicedCandidates = candidates.slice(0, limit);
          } else {
              slicedCandidates = sliceData(candidates, 'foodEnricher');
          }
          
          const chunkIndex = options?.chunkIndex || chunkingState?.currentChunk || 1;
          const totalChunks = options?.totalChunks || chunkingState?.totalChunks || 1;
          const opts = { chunkIndex, totalChunks };

          if (slicedCandidates.length === 0 && candidates.length === 0) {
              const payload = prepareFoodEnricherPayload(
                  project, 
                  feedback || "", 
                  opts,
                  [] 
              );
              generatedPrompt = buildFoodEnricherPrompt(payload); 
          } else {
              const payload = prepareFoodEnricherPayload(
                  project, 
                  feedback || "", 
                  opts,
                  slicedCandidates 
              );
              generatedPrompt = buildFoodEnricherPrompt(payload);
          }
          break;
      }

      // --- ACCOMMODATION ---
      case 'accommodation':
      case 'hotelScout': {
          const currentChunk = options?.chunkIndex || chunkingState?.currentChunk || 1;
          const payload = prepareHotelScoutPayload(project, currentChunk);
          generatedPrompt = buildHotelScoutPrompt(payload);
          break;
      }

      // --- OTHER ---
      
      case 'routeArchitect':
      case 'routenArchitekt': {
        generatedPrompt = buildRouteArchitectPrompt(project);
        break;
      }

      case 'dayplan':
      case 'initialTagesplaner': {
        // V40 UPGRADE: Use Preparer -> Template Pipeline for strict logistics
        // Chunking is now handled logically by the Preparer if needed, but for the skeleton prompt we pass the full view.
        const payload = prepareTagesplanerPayload(project);
        generatedPrompt = buildInitialTagesplanerPrompt(payload);
        break;
      }

      case 'transfers':
      case 'transferPlanner': {
        const lastLoc = getLastChunkEndLocation() || '';
        generatedPrompt = buildTransferPlannerPrompt(project, lastLoc);
        break;
      }

      case 'geoAnalyst': {
        generatedPrompt = buildGeoAnalystPrompt(project);
        break;
      }
      
      case 'countryScout': {
          generatedPrompt = "COUNTRY_SCOUT_PROMPT"; 
          break;
      }

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
// --- END OF FILE 355 Zeilen ---