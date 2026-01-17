// src/core/prompts/PayloadBuilder.ts
// 14.01.2026 19:20 - FIX: Added safe resolution for 'prompt' field.
// 16.01.2026 17:45 - FEAT: Implemented Chunking-Awareness.
// 16.01.2026 21:45 - FEAT: Activated Package A templates.
// 16.01.2026 22:45 - FEAT: Activated Package B1 templates.
// 17.01.2026 09:15 - FIX: Added logic to extract 'previousLocation' for TransferPlanner.
// 17.01.2026 10:30 - FEAT: Finalized Package B2 (Food) with Ad-Hoc Mode and Geo-Math-Filtering.
// 17.01.2026 11:20 - FIX: Corrected import of FoodSearchMode to use SSOT types.
// 17.01.2026 18:00 - FIX: Aligned template calls with Strict TS signatures (Zero Error Policy).

import { useTripStore } from '../../store/useTripStore';
import { INTEREST_DATA } from '../../data/interests';

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
    const { project } = state; 
    
    // Zugriff auf den Chunking State (via SystemSlice im Store)
    const chunkingState = (state as any).chunkingState as ChunkingState;

    // --- HELPER FUNCTIONS ---

    // 1. Gedächtnis: Sammle bereits besuchte IDs aus vorherigen Chunks
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

    // 2. Transfer-Logik: Ermittle den End-Ort des vorherigen Chunks
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

    // 3. Food-Logik: Geo-Filterung (V30 Parität)
    const getFilteredFoodCandidates = (project: TripProject) => {
        // Wir nehmen an, der FoodScout (Schritt 1) hat seine Ergebnisse in `data.content` abgelegt
        const rawCandidates = (project.data.content as any)?.rawFoodCandidates || 
                              Object.values(project.data.places || {}).flat(); 
        
        if (!rawCandidates || rawCandidates.length === 0) return [];

        // Geografische Filterung: Wir brauchen einen Mittelpunkt (User Location)
        // Ad-Hoc Fall: User hat GPS Koordinaten gesendet (simuliert via Inputs)
        const userLat = (project.userInputs as any).currentLocation?.lat;
        const userLng = (project.userInputs as any).currentLocation?.lng;

        if (userLat && userLng) {
            const center: GeoPoint = { lat: userLat, lng: userLng };
            
            // Eskalations-Stufen (V30 Logic)
            // 1. Versuch: 500m (Ideal)
            let filtered = filterByRadius(rawCandidates, center, 0.5, (c: any) => c.geo);
            
            // 2. Versuch: 2km (Akzeptabel)
            if (filtered.length === 0) filtered = filterByRadius(rawCandidates, center, 2.0, (c: any) => c.geo);
            
            // 3. Versuch: 10km (Notfall / Destination Dining)
            if (filtered.length === 0) filtered = filterByRadius(rawCandidates, center, 10.0, (c: any) => c.geo);
            
            return filtered.length > 0 ? filtered : rawCandidates.slice(0, 5); // Fallback
        }

        // Kein GPS? Dann geben wir die Rohdaten weiter (KI soll filtern wenn möglich)
        return rawCandidates;
    };

    switch (task) {
      // --- EXISTING V40 AGENTS ---
      case 'chefPlaner':
        return buildChefPlanerPrompt(project, feedback);
      
      case 'routeArchitect':
      case 'routenArchitekt':
        // FIX: Remove 'feedback', expects only (project)
        return buildRouteArchitectPrompt(project);

      case 'basis':
      case 'sightCollector':
        return buildBasisPrompt(project);
      
      case 'anreicherer':
      case 'intelligentEnricher':
        // Anreicherer logic handled internally or via prompt options
        return buildAnreichererPrompt(project);

      // --- PAKET A: PLANUNG & LOGISTIK ---
      
      case 'durationEstimator':
        return buildDurationEstimatorPrompt(project);

      case 'dayplan':
      case 'initialTagesplaner':
        if (chunkingState?.isActive && chunkingState.dataChunks.length > 0) {
            const currentChunkIndex = chunkingState.currentChunk - 1;
            const chunkData = chunkingState.dataChunks[currentChunkIndex];
            const visitedIds = getVisitedSightIds();
            return buildInitialTagesplanerPrompt(project, chunkData, feedback, visitedIds);
        }
        // FIX: Pass 'undefined' instead of 'null' for optional ChunkingContext
        return buildInitialTagesplanerPrompt(project, undefined, feedback, []);

      case 'transfers':
      case 'transferPlanner':
        if (chunkingState?.isActive && chunkingState.dataChunks.length > 0) {
            const currentChunkIndex = chunkingState.currentChunk - 1;
            const chunkData = chunkingState.dataChunks[currentChunkIndex];
            const previousLocation = getLastChunkEndLocation();
            // FIX: Template currently only supports (project) in V30 port
            // Future TODO: Update transferPlanner to support chunkData/prevLocation
            return buildTransferPlannerPrompt(project); 
        }
        return buildTransferPlannerPrompt(project);

      // --- PAKET B1: ACCOMMODATION ---
      
      case 'geoAnalyst':
        return buildGeoAnalystPrompt(project);

      case 'accommodation':
      case 'hotelScout':
         // FIX: Fill parameters to match signature (project, chunkData, feedback, memory)
         return buildHotelScoutPrompt(project, undefined, feedback, []);

      // --- PAKET B2: FOOD ---
      
      case 'food':
      case 'foodScout':
      case 'foodCollector': // Alias
         // AD-HOC CHECK: Hat der User "Sterne" gewünscht?
         let mode: FoodSearchMode = 'standard';
         
         // Prüfe Feedback oder Custom Prefs auf "Sterne" Wunsch (V30 Logic)
         if ((feedback && feedback.toLowerCase().includes('sterne')) || 
             project.userInputs.customPreferences?.foodMode === 'stars') {
             mode = 'stars';
         }
         
         return buildFoodScoutPrompt(project, mode);
      
      case 'foodEnricher':
         // Hier passiert die Magie: Wir holen die Daten, filtern sie (Mathe) und prompten dann
         const candidates = getFilteredFoodCandidates(project);
         
         if (candidates.length === 0) {
             // Fallback: Wenn keine Daten da sind, lassen wir den Enricher improvisieren
             return buildFoodEnricherPrompt(project, []); 
         }
         return buildFoodEnricherPrompt(project, candidates);

      // --- WORKFLOW FALLBACKS ---
      default:
        throw new Error(`PayloadBuilder: Unknown task '${task}'`);
    }
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
// --- END OF FILE 230 Zeilen ---