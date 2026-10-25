// 25.10.2026 13:13 - DOCS: Synced Agent Manifest with current codebase (Triple Dragnet FoodScout, 4-Eyes FoodEnricher, Active Tagesplaner Engine).
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
        description: "Der Prompt muss erzwingen: NO PREAMBLE. START DIRECTLY WITH '{' (oder '['). Kein Prosa-Text."
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
      config: ["notes", "aiOutputLanguage", "searchSettings", "customPreferences"]
    },
    components: {
      dispatcher: "PayloadBuilder (Daten-Schleuse)",
      collector: "Preparer & PersonaInjector (Extract, Filter & Targeted Context)",
      blueprint: "Template (Structure & Context)",
      standardizer: "PromptBuilder (OS, Role, Schema & Language Lockdown)",
      refiner: "ResultProcessor + Sub-Processors (ID Factory & SSOT)"
    }
  },

  agents: {
    phase_1: {
      title: "PHASE 1: Strategie & Fundament",
      agents: {
        chefPlaner: {
          file: "chefPlaner.ts",
          role: "Der Stratege.",
          tasks: ["Fundamentalanalyse", "Machbarkeits-Check", "Tippfehler- & Länderkorrektur"],
          input: ["Komplettes Profil (Travelers, Dates, Logistics, Interests)"],
          output: ["strategic_briefing", "smart_limit_recommendation", "plausibility_check", "corrections", "validated_hotels"]
        },
        routeArchitect: {
          file: "routeArchitect.ts",
          role: "Der Logistik-Meister (Rundreise & Basecamp-Scouting).",
          tasks: ["Entwickelt 3 Routenvorschläge", "Optimiert Etappen & Fahrzeiten"],
          input: ["stops (User-Wahl)", "start/end", "constraints (Max. Fahrzeit/Wechsel)", "feedback (Keep-Logik)"],
          output: ["routes (stages mit drive_time und distance)"]
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
          tasks: ["Findet POIs passend zu Interessen", "Erzwingt [USER OVERRIDE] & konkrete Sport-/Wander-Ziele"],
          input: ["destination", "interests (OHNE Services!)", "persona_directive (basis)"],
          output: ["candidates (String List)"]
        },
        hotelScout: {
          file: "hotelScout.ts",
          role: "Der Logistiker (Unterkunft).",
          tasks: ["Findet strategische Unterkunft (Stationär oder Rundreise)"],
          input: ["logistics_mode", "vehicle_type (Camper!)", "budget", "current_stop", "persona_directive (scout)"],
          output: ["candidates / places (Category: hotel, location_match)"]
        },
        foodScout: {
          file: "foodScout.ts",
          role: "Der Kulinarik-Detektiv (Triple Dragnet).",
          tasks: ["Sequenzielle Multi-City-Suche in Guides & Nachbarorten", "Graceful Exit auf 'Local Top Pick'", "Quality Doorman Adress-Reparatur"],
          input: ["target_town + country (Einzelstadt-Schleife)", "guides (countries.ts)"],
          output: ["candidates (Name, Address, Phone, Website, Awards, LiveStatus)"]
        },
        ideenScout: {
          file: "ideenScout.ts",
          role: "Der Joker.",
          tasks: ["Alternativen für Sonnen-/Regentage und Wildcards"],
          input: ["locations", "interests", "current_plan"],
          output: ["results (sunny_day_ideas, rainy_day_ideas, wildcard_ideas)"]
        }
      }
    },
    phase_3: {
      title: "PHASE 3: Anreicherung (Die Veredler)",
      agents: {
        anreicherer: {
          file: "anreicherer.ts",
          role: "Der Fakten-Checker.",
          tasks: ["Sucht harte Fakten, OSM-Adressen & Wander-Trailheads zu Namen", "Universal Acceptance (Serendipity)"],
          input: ["candidates (Batch)", "ID Pass-through"],
          output: ["results (Array mit id, valid, category, official_name, location, address, website...)"]
        },
        foodEnricher: {
          file: "foodEnricher.ts",
          role: "Der 4-Augen-Auditor & Gastro-Chefredakteur.",
          tasks: ["Prüft Existenz & Qualität (Door Guard)", "Data Recovery für Ratings", "Schreibt Kurz-Teaser & Markdown-Story"],
          input: ["allScoutCandidates (aus FoodWorkflow)"],
          output: ["enriched_candidates (description, detailContent, signature_dish, awards, verification_status)"]
        },
        transferPlanner: {
          file: "transferPlanner.ts",
          role: "Der Realist.",
          tasks: ["Berechnet und optimiert Wegezeiten zwischen Terminen"],
          input: ["itinerary", "Geo-Koordinaten"],
          output: ["transfer_times / optimierte Transfers"]
        }
      }
    },
    phase_4: {
      title: "PHASE 4: Struktur & Planung",
      agents: {
        tourGuide: {
          file: "tourGuide.ts",
          role: "Der Clusterer.",
          tasks: ["Ordnet Orte logischen Touren/Gebieten zu"],
          input: ["places", "duration", "hub"],
          output: ["tour_suggestions (Cluster)"]
        },
        initialTagesplaner: {
          file: "initialTagesplaner.ts",
          role: "Der Zeit- & Logistik-Architekt (Skeleton Engine).",
          tasks: ["Erstellt nahtlosen Zeitstrahl (Hotel-Loop, 4h-Immersive-Block, Golden Hour 17:00+)", "Meldet Konflikte für Prio 1/2 & Fix"],
          input: ["available_sights", "travel_dates", "hotel_base", "persona_directive (planner)"],
          output: ["itinerary (Timeline)", "unassigned (für PlannerConflictModal)"]
        }
      }
    },
    phase_5: {
      title: "PHASE 5: Content & Redaktion",
      agents: {
        infoAutor: {
          file: "infoAutor.ts",
          role: "Der Reiseführer (Wissen).",
          tasks: ["Schreibt A-Z Stadtführer (mit Geo-Context Guard) & Regional-Artikel"],
          input: ["tasks (Themen & besuchte Städte)", "context (Ziel, Gruppe)"],
          output: ["ContentChapter (Markdown)"]
        },
        chefredakteur: {
          file: "chefredakteur.ts",
          role: "Der Detail-Liebhaber.",
          tasks: ["Schreibt inspirierende Deep-Dives & Rundgang-Waypoints"],
          input: ["editorial_tasks (Places)", "persona_directive (writer)"],
          output: ["detailContent, reasoning, waypoints"]
        }
      }
    }
  }
};
// --- END OF FILE 194 Zeilen ---