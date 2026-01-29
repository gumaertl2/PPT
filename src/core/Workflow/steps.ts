// src/core/Workflow/steps.ts
// 31.01.2026 19:30 - REFACTOR: Strict Template Naming (hotelScout/foodScout etc).
// 10.01.2026 17:40
// UPDATE: Added 'chefPlaner' and 'anreicherer' while preserving existing steps.
// 15.01.2026 16:15 - FIX: Added 'routeArchitect' step for Roundtrips (V30 Workflow Parity).
// CHAIN: chefPlaner -> routeArchitect (optional) -> basis -> anreicherer -> tourGuide -> ...

import type { WorkflowStepDef } from '../types';

export const WORKFLOW_STEPS: WorkflowStepDef[] = [
  {
    id: 'chefPlaner', // NEU: Der Startpunkt
    isMandatory: true,
    requiresUserInteraction: false, 
    label: {
      de: '0. Fundamentalanalyse',
      en: '0. Fundamental Analysis'
    },
    description: {
      de: 'Analysiert Logistik, Strategie und erstellt das Briefing.',
      en: 'Analyzes logistics, strategy, and creates the briefing.'
    }
  },
  // NEU: Routen-Architekt (Nur für Rundreisen relevant)
  {
    id: 'routeArchitect',
    isMandatory: false, // Wird dynamisch gesteuert (nur bei Mode='roundtrip')
    requires: ['chefPlaner'], // Baut auf der Analyse auf
    requiresUserInteraction: true, // User MUSS eine Route wählen
    label: {
      de: '0b. Routen-Architekt',
      en: '0b. Route Architect'
    },
    description: {
      de: 'Entwickelt 3 Routenvorschläge basierend auf Ihren Wünschen.',
      en: 'Develops 3 route proposals based on your preferences.'
    }
  },
  {
    id: 'basis', // Bestehend (Template Name)
    isMandatory: true,
    requires: ['chefPlaner'], // Braucht das Briefing (und ggf. die Route vom Architekten)
    label: {
      de: '1. Basis: Kandidaten (Sammler)',
      en: '1. Base: Candidates (Collector)'
    },
    description: {
      de: 'Sucht Orte und erstellt erste Ideen-Liste basierend auf dem Briefing.',
      en: 'Finds places and creates initial idea list based on the briefing.'
    }
  },
  {
    id: 'anreicherer', // NEU: Der Fakten-Check
    isMandatory: true,
    requires: ['basis'], // Braucht die Namensliste
    label: {
      de: '2. Daten-Anreicherer',
      en: '2. Data Enricher'
    },
    description: {
      de: 'Reichert die Kandidaten mit Adressen, Koordinaten und Fakten an.',
      en: 'Enriches candidates with addresses, coordinates, and facts.'
    }
  },
  {
    id: 'tourGuide', // Renamed from guide
    isMandatory: false,
    requires: ['anreicherer'], // Braucht die Fakten
    label: {
      de: '3. Reiseführer: Strukturierung',
      en: '3. Guide: Structuring'
    },
    description: {
      de: 'Clusterung der Orte in logische Touren und Gebiete.',
      en: 'Clustering of places into logical tours and areas.'
    }
  },
  {
    id: 'chefredakteur', // Renamed from details
    isMandatory: false,
    requires: ['tourGuide'], // Logische Folge
    label: {
      de: '4. Detail-Texte (Content)',
      en: '4. Detail Content'
    },
    description: {
      de: 'Schreibt ausführliche, inspirierende Texte zu jeder Sehenswürdigkeit.',
      en: 'Writes detailed, inspiring texts for every sight.'
    }
  },
  {
    id: 'initialTagesplaner', // Renamed from dayplan
    isMandatory: false,
    requires: ['tourGuide'], // Guide hilft beim Clustern für Tage
    requiresUserInteraction: true, // Human in the loop!
    label: {
      de: '5. Tagesplan erstellen',
      en: '5. Create Itinerary'
    },
    description: {
      de: 'Erstellt den zeitlichen Ablauf. Sie können vorher Tempo & Prioritäten anpassen.',
      en: 'Creates the daily schedule. You can adjust pace & priorities beforehand.'
    }
  },
  {
    id: 'infoAutor', // Renamed from infos
    isMandatory: false,
    label: {
      de: '6. Reise-Infos (A-Z)',
      en: '6. Travel Info (A-Z)'
    },
    description: {
      de: 'Recherchiert praktische Infos basierend auf Ihren Interessen.',
      en: 'Researches practical info based on your interests.'
    }
  },
  {
    id: 'foodScout', // Renamed from food
    isMandatory: false,
    requires: ['anreicherer'], // Geo-Kontext nötig (Basis oder Anreicherer)
    label: {
      de: '7. Restaurants & Genuss',
      en: '7. Restaurants & Food'
    },
    description: {
      de: 'Sucht kulinarische Highlights passend zur Route.',
      en: 'Finds culinary highlights fitting the route.'
    }
  },
  {
    id: 'hotelScout', // Renamed from accommodation
    isMandatory: false,
    requires: ['chefPlaner'], // Braucht Logistik-Infos
    label: {
      de: '8. Unterkunft suchen',
      en: '8. Find Accommodation'
    },
    description: {
      de: 'Sucht Hotels oder Campingplätze (Stationär oder Rundreise).',
      en: 'Searches for hotels or campsites (Stationary or Roundtrip).'
    }
  },
  {
    id: 'ideenScout', // Renamed from sondertage
    isMandatory: false,
    requires: ['tourGuide'],
    label: {
      de: '9. Flexibilität (Wetter)',
      en: '9. Flexibility (Weather)'
    },
    description: {
      de: 'Plant Optionen für Regen- oder reine Sonnentage.',
      en: 'Plans options for rainy or sunny days.'
    }
  },
  {
    id: 'transferPlanner', // Renamed from transfers
    isMandatory: false,
    requires: ['initialTagesplaner'], // Braucht den Plan für Wege
    label: {
      de: '10. Transfers optimieren',
      en: '10. Optimize Transfers'
    },
    description: {
      de: 'Berechnet Wegezeiten und optimiert die Logistik zwischen Terminen.',
      en: 'Calculates travel times and optimizes logistics between appointments.'
    }
  }
];
// --- END OF FILE 135 Zeilen ---