// src/core/Workflow/steps.ts
// 06.02.2026 17:15 - REFACTOR: FLATTENED DEPENDENCIES & REORDERING.
// - All core tasks now depend only on 'anreicherer' (Independence).
// - Moved 'initialTagesplaner' to the end (Late Stage).
// - Preserved 'requiresUserInteraction: true' for Day Planner.

import type { WorkflowStepDef } from '../types';

export const WORKFLOW_STEPS: WorkflowStepDef[] = [
  {
    id: 'chefPlaner',
    isMandatory: true,
    requiresUserInteraction: false, 
    label: { de: '0. Fundamentalanalyse', en: '0. Fundamental Analysis' },
    description: { de: 'Analysiert Logistik, Strategie und erstellt das Briefing.', en: 'Analyzes logistics, strategy, and creates the briefing.' }
  },
  {
    id: 'routeArchitect',
    isMandatory: false,
    requires: ['chefPlaner'],
    requiresUserInteraction: true,
    label: { de: '0b. Routen-Architekt', en: '0b. Route Architect' },
    description: { de: 'Entwickelt 3 Routenvorschläge basierend auf Ihren Wünschen.', en: 'Develops 3 route proposals based on your preferences.' }
  },
  {
    id: 'basis',
    isMandatory: true,
    requires: ['chefPlaner'],
    label: { de: '1. Basis: Kandidaten (Sammler)', en: '1. Base: Candidates (Collector)' },
    description: { de: 'Sucht Orte und erstellt erste Ideen-Liste basierend auf dem Briefing.', en: 'Finds places and creates initial idea list based on the briefing.' }
  },
  {
    id: 'anreicherer',
    isMandatory: true,
    requires: ['basis'],
    label: { de: '2. Daten-Anreicherer', en: '2. Data Enricher' },
    description: { de: 'Reichert die Kandidaten mit Adressen, Koordinaten und Fakten an.', en: 'Enriches candidates with addresses, coordinates, and facts.' }
  },
  {
    id: 'tourGuide',
    isMandatory: false,
    requires: ['anreicherer'],
    label: { de: '3. Reiseführer: Strukturierung', en: '3. Guide: Structuring' },
    description: { de: 'Clusterung der Orte in logische Touren und Gebiete.', en: 'Clustering of places into logical tours and areas.' }
  },
  {
    id: 'chefredakteur',
    isMandatory: false,
    requires: ['anreicherer'], // FIX: Decoupled from TourGuide
    label: { de: '4. Detail-Texte (Content)', en: '4. Detail Content' },
    description: { de: 'Schreibt ausführliche, inspirierende Texte zu jeder Sehenswürdigkeit.', en: 'Writes detailed, inspiring texts for every sight.' }
  },
  {
    id: 'infoAutor',
    isMandatory: false,
    label: { de: '5. Reise-Infos (A-Z)', en: '5. Travel Info (A-Z)' },
    description: { de: 'Recherchiert praktische Infos basierend auf Ihren Interessen.', en: 'Researches practical info based on your interests.' }
  },
  {
    id: 'foodScout',
    isMandatory: false,
    requires: ['chefPlaner'],
    label: { de: '6. Restaurants & Genuss', en: '6. Restaurants & Food' },
    description: { de: 'Sucht kulinarische Highlights passend zur Route.', en: 'Finds culinary highlights fitting the route.' }
  },
  {
    id: 'hotelScout',
    isMandatory: false,
    requires: ['chefPlaner'],
    label: { de: '7. Unterkunft suchen', en: '7. Find Accommodation' },
    description: { de: 'Sucht Hotels oder Campingplätze (Stationär oder Rundreise).', en: 'Searches for hotels or campsites (Stationary or Roundtrip).' }
  },
  {
    id: 'ideenScout',
    isMandatory: false,
    requires: ['chefPlaner'],
    label: { de: '8. Flexibilität (Wetter)', en: '8. Flexibility (Weather)' },
    description: { de: 'Plant Optionen für Regen- oder reine Sonnentage.', en: 'Plans options for rainy or sunny days.' }
  },
  // MOVED TO END
  {
    id: 'initialTagesplaner',
    isMandatory: false,
    requires: ['anreicherer'], // FIX: Decoupled from TourGuide
    requiresUserInteraction: true, // RESTORED: User MUST interact
    label: { de: '9. Tagesplan erstellen', en: '9. Create Itinerary' },
    description: { de: 'Erstellt den zeitlichen Ablauf. Sie können vorher Tempo & Prioritäten anpassen.', en: 'Creates the daily schedule. You can adjust pace & priorities beforehand.' }
  },
  {
    id: 'transferPlanner',
    isMandatory: false,
    requires: ['initialTagesplaner'],
    label: { de: '10. Transfers optimieren', en: '10. Optimize Transfers' },
    description: { de: 'Berechnet Wegezeiten und optimiert die Logistik zwischen Terminen.', en: 'Calculates travel times and optimizes logistics between appointments.' }
  }
];
// Lines: 135