// 01.02.2026 16:50 - FIX: SSOT Sync with Code. Output Keys aligned with templates/types.ts.
// src/data/Texts/agent_manifest.ts

export const agentManifest = {
  meta: {
    title: "Papatours V40: Die vollständige Prompt-Architektur & Agenten-Steuerung",
    description: "Dieses Dokument ist die 'Single Source of Truth'. Es beschreibt das Protokoll, die Pipeline und die exakte Arbeitsweise jedes Agenten ohne Vereinfachungen."
  },

  protocol: {
    title: "1. Das Goldene Prompt-Protokoll",
    rules: [
      {
        id: "task_decomposition",
        title: "Eine Aufgabe pro Prompt (Task Decomposition)",
        description: "Jeder Prompt darf nur eine einzige, klar definierte Kernaufgabe enthalten. Zerlege komplexe Ziele in mehrere aufeinanderfolgende Prompts."
      },
      {
        id: "role_injection",
        title: "Klare Persona Zuweisung (Role Injection)",
        description: "Beginne jeden Prompt mit der Definition einer spezifischen Rolle. Dies lenkt den Stil, den Ton und das Fachwissen der KI."
      },
      {
        id: "structure",
        title: "Logische Strukturierung",
        description: "Gliedere den Prompt visuell. Nutze Markdown-Überschriften (###) und Listen, um Kontext und Anweisungen zu trennen."
      },
      {
        id: "noise_reduction",
        title: "Präziser Kontext (Noise Reduction)",
        description: "Gib nur die Informationen, die zur Lösung der Aufgabe zwingend notwendig sind. Vermeide Noise."
      },
      {
        id: "instruction_hardening",
        title: "Unmissverständliche Anweisungen (Instruction Hardening)",
        description: "Nutze klare Verben im Imperativ. Setze explizite Verbote ('Was du vermeiden sollst')."
      },
      {
        id: "json_only",
        title: "Das 'JSON-Only' Gesetz",
        description: "Der Prompt muss erzwingen: NO PREAMBLE. START DIRECTLY WITH '{'. Kein Prosa-Text."
      },
      {
        id: "chain_of_thought",
        title: "Gedanken-Container (_thought_process)",
        description: "Das Reasoning muss zwingend innerhalb des JSON-Objekts im Feld '_thought_process' stattfinden."
      }
    ]
  },

  pipeline: {
    title: "2. Die technische Pipeline (The Factory)",
    inputs: {
      hard_facts: ["travelers", "dates", "logistics"],
      soft_factors: ["vibe", "pace", "budget", "selectedInterests"],
      config: ["notes", "aiOutputLanguage", "searchSettings"]
    },
    components: {
      dispatcher: "PayloadBuilder (Daten-Schleuse)",
      collector: "Preparer (Extract & Filter)",
      blueprint: "Template (Structure & Context)",
      standardizer: "PromptBuilder (Role & Schema)",
      refiner: "ResultProcessor (ID Factory & SSOT)"
    }
  },

  agents: {
    phase_1: {
      title: "PHASE 1: Strategie & Fundament",
      agents: {
        chefPlaner: {
          file: "chefPlaner.ts",
          role: "Der Stratege.",
          tasks: ["Fundamentalanalyse", "Machbarkeits-Check"],
          input: ["Komplettes Profil (Travelers, Dates, Logistics, Interests)"],
          output: ["strategic_briefing", "smart_limit_recommendation", "plausibility_check", "corrections"] // CODE SYNC
        },
        routeArchitect: {
          file: "routeArchitect.ts",
          role: "Der Logistik-Meister (Rundreise).",
          tasks: ["Optimiert Routen-Reihenfolge", "Berechnet Fahrzeiten"],
          input: ["stops (User-Wahl)", "start/end", "constraints (Max. Fahrzeit/Wechsel)"],
          output: ["Optimierte stops mit drive_time und distance"]
        },
        geoAnalyst: {
          file: "geoAnalyst.ts",
          role: "Der Kartograph.",
          tasks: ["Findet geometrischen Mittelpunkt für Hotelsuche"],
          input: ["Gefundene Places"],
          output: ["recommended_hubs"]
        }
      }
    },
    phase_2: {
      title: "PHASE 2: Sourcing (Die Sammler)",
      agents: {
        basis: {
          file: "basis.ts",
          role: "Der Aktivitäten-Scout.",
          tasks: ["Findet POIs passend zu Interessen"],
          input: ["destination", "interests (OHNE Services!)"],
          output: ["candidates (String List)"] // CODE SYNC
        },
        hotelScout: {
          file: "hotelScout.ts",
          role: "Der Logistiker (Unterkunft).",
          tasks: ["Findet strategische Unterkunft (Stationär oder Rundreise)"],
          input: ["logistics_mode", "vehicle_type (Camper!)", "budget", "current_stop"],
          output: ["places (Category: accommodation, location_match)"]
        },
        foodScout: {
          file: "foodScout.ts",
          role: "Der Kulinarik-Experte (Quellen-basiert).",
          tasks: ["Erstellt Kandidaten-Pool aus Restaurantführern"],
          input: ["Suchgebiet (Radius Logik)", "Strategie (Guide vs. Ad-Hoc)", "Quellen-Matrix (countries.ts)"],
          output: ["rawFoodCandidates (Name, Source Link)"]
        },
        ideenScout: {
          file: "ideenScout.ts",
          role: "Der Joker.",
          tasks: ["Alternativen für schlechtes Wetter oder leeren Plan"],
          input: ["weather_forecast", "current_plan"],
          output: ["alternatives (Indoor, Hidden Gems)"]
        }
      }
    },
    phase_3: {
      title: "PHASE 3: Anreicherung (Die Veredler)",
      agents: {
        anreicherer: {
          file: "anreicherer.ts",
          role: "Der Fakten-Checker.",
          tasks: ["Sucht harte Fakten zu Namen"],
          input: ["candidates (Batch 5-10)", "ID Pass-through"],
          output: ["results (Array with id, official_name, location...)"] // CODE SYNC
        },
        foodEnricher: {
          file: "foodEnricher.ts",
          role: "Der Detail-Prüfer (Food).",
          tasks: ["Reichert Restaurant-Kandidaten an"],
          input: ["rawFoodCandidates"],
          output: ["enriched_candidates (Signature Dish, PriceLevel, Ratings)"]
        },
        transferPlanner: {
          file: "transferPlanner.ts",
          role: "Der Realist.",
          tasks: ["Berechnet Wegezeiten (Fallback)"],
          input: ["Geo-Koordinaten"],
          output: ["transfer_times"]
        }
      }
    },
    phase_4: {
      title: "PHASE 4: Struktur & Planung",
      agents: {
        tourGuide: {
          file: "tourGuide.ts",
          role: "Der Clusterer.",
          tasks: ["Ordnet Orte logischen Touren/Tagen zu"],
          input: ["places", "duration", "hub"],
          output: ["tour_suggestions (Cluster)"]
        },
        initialTagesplaner: {
          file: "initialTagesplaner.ts",
          role: "Der Zeit-Manager (Legacy).",
          tasks: ["Erstellt detaillierten Zeitstrahl"],
          input: ["Orte", "Öffnungszeiten", "Pace"],
          output: ["itinerary (Timeline)"]
        }
      }
    },
    phase_5: {
      title: "PHASE 5: Content & Redaktion",
      agents: {
        infoAutor: {
          file: "infoAutor.ts",
          role: "Der Reiseführer (Wissen).",
          tasks: ["Schreibt informative Artikel"],
          input: ["topics", "context (Ziel, Gruppe)"],
          output: ["ContentChapter (Markdown)"]
        },
        chefredakteur: {
          file: "chefredakteur.ts",
          role: "Der Detail-Liebhaber.",
          tasks: ["Schreibt inspirierende Deep-Dives"],
          input: ["place", "tone (Faktisch/Begeisternd)"],
          output: ["detailContent (Intro, Highlights)"]
        }
      }
    }
  }
};
// --- END OF FILE 190 Zeilen ---