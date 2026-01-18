// 18.01.2026 20:00 - FIX: Restored 'buildChefPlanerPayload' to resolve unused-vars errors and preserve legacy logic. Applied Anreicherer signature fix.
// src/core/prompts/PayloadBuilder.ts
// 14.01.2026 19:20 - FIX: Added safe resolution for 'prompt' field.
// 16.01.2026 17:45 - FEAT: Implemented Chunking-Awareness.
// 16.01.2026 21:45 - FEAT: Activated Package A templates.
// 16.01.2026 22:45 - FEAT: Activated Package B1 templates.
// 17.01.2026 09:15 - FIX: Added logic to extract 'previousLocation' for TransferPlanner.
// 17.01.2026 10:30 - FEAT: Finalized Package B2 (Food) with Ad-Hoc Mode and Geo-Math-Filtering.
// 17.01.2026 11:20 - FIX: Corrected import of FoodSearchMode to use SSOT types.
// 17.01.2026 18:00 - FIX: Aligned template calls with Strict TS signatures (Zero Error Policy).
// 17.01.2026 23:45 - FIX: Resolved TS6133 (unused vars) and TS2345 (HotelScout args).
// 18.01.2026 00:30 - FEAT: Activated Package C (Content, Info, Guide, SpecialDays).
// 18.01.2026 17:50 - FIX: Applied Dynamic Limit Slicing to ALL list-based prompts.

import { useTripStore } from '../../store/useTripStore';
import { INTEREST_DATA } from '../../data/interests'; // Behalten für buildChefPlanerPayload
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
  /**
   * ZENTRALE SCHNITTSTELLE FÜR USETRIPGENERATION (V40)
   * Wählt anhand des Task-Keys das richtige Prompt-Template.
   * "The Intelligent Dispatcher": Checks for chunking state, executes math, and routes to agents.
   */
  buildPrompt: (task: TaskKey, feedback?: string): string => {
    const state = useTripStore.getState();
    const { project, aiSettings, apiKey } = state; 
    
    // Zugriff auf den Chunking State (via SystemSlice im Store)
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

    // 2. Gedächtnis: Sammle bereits besuchte IDs aus vorherigen Chunks
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

    // 3. Transfer-Logik: Ermittle den End-Ort des vorherigen Chunks
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

    // 4. Food-Logik: Geo-Filterung (V30 Parität)
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
        const slicedAppointments = sliceData(allAppointments, 'chefPlaner');
        
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

        // FIX TS2554: Slicing via Klon statt Argument
        const slicedProject = {
            ...project,
            data: {
                ...project.data,
                places: {
                    "current_batch": slicedCandidates
                }
            }
        };

        return buildAnreichererPrompt(slicedProject);
      }

      // --- PAKET A: PLANUNG & LOGISTIK ---
      
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

      // --- PAKET B1: ACCOMMODATION ---
      
      case 'geoAnalyst':
        return buildGeoAnalystPrompt(project);

      case 'accommodation':
      case 'hotelScout':
         return buildHotelScoutPrompt(project, "", feedback || "", "");

      // --- PAKET B2: FOOD ---
      
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
         const slicedCandidates = sliceData(candidates, 'foodEnricher');
         
         if (slicedCandidates.length === 0 && candidates.length === 0) {
             return buildFoodEnricherPrompt(project, []); 
         }
         return buildFoodEnricherPrompt(project, slicedCandidates);
      }

      // --- PAKET C: CONTENT & SPECIALS (NEU) ---

      case 'guide':
      case 'reisefuehrer':
           return buildTourGuidePrompt(project);

      case 'details':
      case 'chefredakteur' as any: {
          const allPlaces = Object.values(project.data.places || {}).flat();
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

  // WIEDERHERGESTELLT: Legacy-Methode für manuelle Calls & Typ-Sicherheit
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
// --- END OF FILE 360 Zeilen ---