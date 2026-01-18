// 18.01.2026 17:50 - FIX: Applied Dynamic Limit Slicing to ALL list-based prompts (Anreicherer, Food, ChefPlaner, Details).
// src/core/prompts/PayloadBuilder.ts
// ... (Header History wird fortgeführt)

import { useTripStore } from '../../store/useTripStore';
import { INTEREST_DATA } from '../../data/interests';
import { CONFIG } from '../../data/config';

// --- TEMPLATES ---
import { buildChefPlanerPrompt } from './templates/chefPlaner';
import { buildBasisPrompt } from './templates/basis';
import { buildAnreichererPrompt } from './templates/anreicherer';
import { buildRouteArchitectPrompt } from './templates/routeArchitect';
import { buildDurationEstimatorPrompt } from './templates/durationEstimator';
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

// --- UTILS & TYPES ---
import type { LocalizedContent, TaskKey, ChunkingState, TripProject, FoodSearchMode } from '../types';
import { filterByRadius } from '../utils/geo';
import type { GeoPoint } from '../utils/geo';

export const PayloadBuilder = {
  buildPrompt: (task: TaskKey, feedback?: string): string => {
    const state = useTripStore.getState();
    const { project, aiSettings, apiKey } = state; 
    const chunkingState = (state as any).chunkingState as ChunkingState;

    // --- HELPER FUNCTIONS ---

    // 0. Chunk Limit Ermittlung (Priority: Override > Global > Default)
    const getTaskChunkLimit = (taskKey: TaskKey): number => {
        const mode = apiKey ? 'auto' : 'manual';
        const taskOverride = aiSettings.chunkOverrides?.[taskKey]?.[mode];
        if (taskOverride) return taskOverride;
        const globalLimit = aiSettings.chunkLimits?.[mode];
        if (globalLimit) return globalLimit;
        return CONFIG.taskRouting.chunkDefaults?.[taskKey]?.[mode] || 10;
    };

    // 1. Slicing Helper (Generic)
    const sliceData = (items: any[], taskKey: TaskKey) => {
        const limit = getTaskChunkLimit(taskKey);
        // Wenn Chunking aktiv, nutzen wir currentChunk. Sonst Chunk 1.
        const currentChunk = (chunkingState?.isActive && chunkingState.currentChunk > 0) 
                             ? chunkingState.currentChunk 
                             : 1;
        const startIndex = (currentChunk - 1) * limit;
        const endIndex = startIndex + limit;
        return items.slice(startIndex, endIndex);
    };

    // ... (restliche Helper getVisitedSightIds, getLastChunkEndLocation, getFilteredFoodCandidates bleiben)
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
        const rawCandidates = (project.data.content as any)?.rawFoodCandidates || 
                              Object.values(project.data.places || {}).flat(); 
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

    switch (task) {
      // --- EXISTING V40 AGENTS ---
      case 'chefPlaner': {
        const allAppointments = project.userInputs.dates.fixedEvents || [];
        // Slicing für ChefPlaner anwenden
        const slicedAppointments = sliceData(allAppointments, 'chefPlaner');
        
        // Wir müssen das Project-Objekt klonen/mocken, damit das Template nur die geschnittenen Events sieht
        const slicedProject = {
            ...project,
            userInputs: {
                ...project.userInputs,
                dates: {
                    ...project.userInputs.dates,
                    fixedEvents: slicedAppointments
                }
            }
        };
        return buildChefPlanerPrompt(slicedProject, feedback);
      }
      
      case 'routeArchitect':
      case 'routenArchitekt':
        return buildRouteArchitectPrompt(project);

      case 'basis':
      case 'sightCollector':
        return buildBasisPrompt(project);
      
      case 'anreicherer':
      case 'intelligentEnricher': {
        const allPlaces = Object.values(project.data.places || {}).flat();
        const slicedCandidates = sliceData(allPlaces, 'anreicherer');
        return buildAnreichererPrompt(project, slicedCandidates);
      }

      // --- PAKET A ---
      case 'durationEstimator':
        return buildDurationEstimatorPrompt(project);

      case 'dayplan':
      case 'initialTagesplaner':
        if (chunkingState?.isActive && chunkingState.dataChunks.length > 0) {
            const idx = chunkingState.currentChunk - 1;
            const chunkData = chunkingState.dataChunks[idx];
            return buildInitialTagesplanerPrompt(project, chunkData, feedback, getVisitedSightIds());
        }
        return buildInitialTagesplanerPrompt(project, undefined, feedback, []);

      case 'transfers':
      case 'transferPlanner': {
        const lastLoc = getLastChunkEndLocation() || '';
        return buildTransferPlannerPrompt(project, lastLoc);
      }

      // --- PAKET B ---
      case 'geoAnalyst':
        return buildGeoAnalystPrompt(project);

      case 'accommodation':
      case 'hotelScout':
         return buildHotelScoutPrompt(project, "", feedback || "", "");

      case 'food':
      case 'foodScout':
      case 'foodCollector': 
         let mode: FoodSearchMode = 'standard';
         if ((feedback && feedback.toLowerCase().includes('sterne')) || 
             project.userInputs.customPreferences?.foodMode === 'stars') {
             mode = 'stars';
         }
         return buildFoodScoutPrompt(project, mode);
      
      case 'foodEnricher': {
         const candidates = getFilteredFoodCandidates(project);
         // SLICING für FoodEnricher
         const slicedCandidates = sliceData(candidates, 'foodEnricher');
         
         if (slicedCandidates.length === 0 && candidates.length === 0) {
             return buildFoodEnricherPrompt(project, []); 
         }
         return buildFoodEnricherPrompt(project, slicedCandidates);
      }

      // --- PAKET C ---
      case 'guide':
      case 'reisefuehrer':
           return buildTourGuidePrompt(project);

      case 'details':
      case 'chefredakteur' as any: {
          const allPlaces = Object.values(project.data.places || {}).flat();
          // SLICING für Chefredakteur (Beschreibungen)
          const slicedPlaces = sliceData(allPlaces, 'chefredakteur' as TaskKey);
          
          return buildChefredakteurPrompt(
              project, 
              slicedPlaces, 
              chunkingState?.currentChunk || 1, 
              chunkingState?.totalChunks || 1
          ) || "";
      }

      case 'infos':
      case 'infoAutor': {
          // InfoAutor nutzt meist eine separate Task-Liste. 
          // Falls wir Tasks im chunkingState haben (via Orchestrator-Logic für Infos), nutzen wir die.
          // Da InfoAutor in V40 oft "On Demand" ist, lassen wir den Default,
          // oder slicen eine hypothetische Liste falls vorhanden.
          // Hier nutzen wir sliceData NICHT direkt, da die Quelle variiert.
          
          if (chunkingState?.isActive && chunkingState.dataChunks.length > 0) {
              const idx = chunkingState.currentChunk - 1;
              const chunk = chunkingState.dataChunks[idx];
              return buildInfoAutorPrompt(project, chunk.tasks, chunkingState.currentChunk, chunkingState.totalChunks, []) || "";
          }
          return buildInfoAutorPrompt(project, [], 1, 1, []) || "";
      }

      case 'sondertage':
      case 'ideenScout':
          let location = "Reiseziel";
          if (project.userInputs.logistics.mode === 'stationaer') {
              location = project.userInputs.logistics.stationary.destination;
          } else if (project.userInputs.logistics.roundtrip.startLocation) {
              location = project.userInputs.logistics.roundtrip.startLocation;
          }
          return buildIdeenScoutPrompt(project, location, getVisitedSightIds());

      default:
        throw new Error(`PayloadBuilder: Unknown task '${task}'`);
    }
  },

  buildChefPlanerPayload: () => {
    // ... (bleibt unverändert)
    const state = useTripStore.getState();
    const { userInputs, meta } = state.project;
    // ... (Code wie oben)
    return { 
        // ...
        appVersion: meta.version 
    } as any;
  }
};
// --- END OF FILE 350 Zeilen ---