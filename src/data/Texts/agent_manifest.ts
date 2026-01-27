// 27.01.2026 14:50 - FIX: Sync Manifest with Template Logic.
// Added '_thought_process' to initialTagesplaner output to match strict schema.
// Retained 'Encyclopedic Tone' for Chefredakteur.
// src/data/Texts/agent_manifest.ts

export const AGENT_MANIFEST = {
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
        description: "Jeder Prompt darf nur eine einzige, klar definierte Kernaufgabe enthalten. Zerlege komplexe Ziele in mehrere aufeinanderfolgende Prompts (z.B. erst sammeln, dann anreichern)."
      },
      {
        id: "role_injection",
        title: "Klare Persona Zuweisung (Role Injection)",
        description: "Beginne jeden Prompt mit der Definition einer spezifischen Rolle (z. B. 'Du bist ein Experte für nachhaltiges Reisen in Südostasien'). Dies lenkt den Stil, den Ton und das Fachwissen der KI."
      },
      {
        id: "structure",
        title: "Logische Strukturierung",
        description: "Gliedere den Prompt visuell und inhaltlich. Nutze Markdown-Überschriften (###), Listen und abgegrenzte Blöcke, um Kontext, Anweisungen, Beispiele und Formatvorgaben klar voneinander zu trennen."
      },
      {
        id: "noise_reduction",
        title: "Präziser und relevanter Kontext (Noise Reduction)",
        description: "Gib nur die Informationen, die zur Lösung der Aufgabe zwingend notwendig sind. Sei spezifisch und vermeide mehrdeutige oder überflüssige Details."
      },
      {
        id: "instruction_hardening",
        title: "Unmissverständliche Anweisungen (Instruction Hardening)",
        description: "Sei direkt: Nutze klare Verben im Imperativ. Setze Leitplanken: Formuliere explizite Verbote ('Was du vermeiden sollst') und positive Gebote ('Was du tun sollst'). Erkläre das 'Warum', damit die KI die Absicht versteht."
      },
      {
        id: "few_shot",
        title: "Gib Beispiele (Few-Shot Prompting)",
        description: "Zeige mit 1-2 guten Beispielen, wie die gewünschte Ausgabe aussehen soll (Input -> Output Pattern)."
      },
      {
        id: "chain_of_thought",
        title: "Geforderte Selbstreflexion (Chain-of-Thought)",
        description: "Beende den Prompt mit einer klaren Anweisung an die KI, ihre eigene Antwort anhand der wichtigsten Regeln des Prompts zu überprüfen. Nutze Felder wie '_thought_process' im JSON-Output."
      }
    ]
  },

  pipeline: {
    title: "2. Die technische Produktionsstraße (The Pipeline)",
    inputs: {
      hard_facts: ["travelers (Wer)", "dates (Wann)", "logistics (Wohin & Wie)"],
      soft_factors: ["Reise-Charakter", "vibe (Stimmung)", "pace (Reisetempo)", "budget (Preisniveau)", "selectedInterests (Interessen)"],
      config: ["Feste Termine", "notes (Sonderwünsche)", "aiOutputLanguage (Sprache)", "searchSettings"]
    },
    components: {
      dispatcher: "PayloadBuilder (Schaltzentrale)",
      collector: "Preparer (Datensammler - Mise en place)",
      blueprint: "Template (Text-Generierung mit Persona)",
      standardizer: "PromptBuilder (System-Instruktionen & JSON-Zwang)",
      refiner: "ResultProcessor (Validierung & Speicherung)"
    }
  },

  agents: {
    phase_1: {
      title: "PHASE 1: Strategie & Fundament",
      agents: {
        chefPlaner: {
          file: "chefPlaner.ts",
          role: "Der strategische Reise-Architekt. Prüft Eingaben auf Fehler (Rechtschreibung, Existenz) und Machbarkeit.",
          tasks: ["Reisebriefing erstellen", "Korrekturvorschläge für Falscheingaben"],
          input: ["Reisende", "Vibe", "Budget", "Charakter der Reise", "Interessen"],
          output: [
            "strategic_briefing (Anweisung an Scouts)",
            "itinerary_rules (Logik-Regeln)",
            "smart_limit (Stopps pro Tag)"
          ]
        },
        routeArchitect: {
          file: "routeArchitect.ts",
          role: "Der Logistiker und Routen-Planer für mobile Reisen.",
          tasks: ["Prüfung sinnvoller Orte basierend auf Rahmenbedingungen"],
          input: ["itinerary_rules", "Logistik (Start/Ziel/Modus)", "Dauer", "Regeln für mobile Reisen (Fahrtzeit, Hotelwechsel)"],
          output: [
            "routes (Etappen-Ziele, Dauer, km, Zeit, Beschreibung)",
            "Definiert search_area für nachfolgende Scouts"
          ]
        },
        geoAnalyst: {
          file: "geoAnalyst.ts",
          role: "Der Standort-Optimierer (Immobilien-Makler).",
          tasks: ["Hilfe für Hotelscout wenn noch kein Tagesplan existiert"],
          input: ["Region", "Mobilität", "Constraints (max. Fahrzeit)"],
          output: ["recommended_hubs (Strategisch beste Standorte)"]
        }
      }
    },
    phase_2: {
      title: "PHASE 2: Sourcing (Die Sammler)",
      agents: {
        basis: {
          file: "basis.ts",
          role: "Der Aktivitäten-Scout.",
          tasks: ["Findet POIs passend zum Reisecharakter und Interessen"],
          input: ["Such-Radius", "Interessen", "Briefing (Filtervorgaben)", "Charakter der Reise", "Reisestimmung"],
          output: ["candidates (Liste potenzieller Ziele, noch ohne Details)"]
        },
        foodScout: {
          file: "foodScout.ts",
          role: "Der spezialisierte Kulinarik-Scout.",
          tasks: ["Sucht Restaurantempfehlungen in speziellen Führern (nicht nur Google Maps)"],
          input: ["Ort (Stopp oder Ad-Hoc)", "Modus (Authentisch vs. Sterne)", "Guides (Whitelist aus countries.ts)"],
          output: ["rawFoodCandidates (Validierte Liste inkl. Guide-Referenz)"]
        },
        ideenScout: {
          file: "ideenScout.ts",
          role: "Der Kreativ-Scout für Sonderfälle.",
          tasks: ["Sucht Aktivitäten für Sonnen- und Regentage außerhalb des Standard-Programms"],
          input: ["Wer (Gruppe)", "Orte (Übernachtungsorte, exkl. Heimatort)"],
          output: ["sunny_day_ideas (Outdoor)", "rainy_day_ideas (Indoor)"]
        },
        hotelScout: {
          file: "hotelScout.ts",
          role: "Der Unterkunfts-Finder.",
          tasks: ["Routen- und zeitoptimierte Vorschläge für Hotels/Camping"],
          input: ["Hub (vom GeoAnalyst oder Tagesplan)", "Budget & Komfort"],
          output: ["candidates (Konkrete Vorschläge mit Empfehlung)"]
        }
      }
    },
    phase_3: {
      title: "PHASE 3: Anreicherung (Die Researcher)",
      agents: {
        anreicherer: {
          file: "anreicherer.ts",
          role: "Der Fakten-Checker für Sights.",
          tasks: ["Reichert Kandidaten mit Details an"],
          input: ["Kandidaten (Namensliste)", "Sprache"],
          output: ["Place-Objekte (Adresse, Geo, Öffnungszeiten, Rating, Logistik)"]
        },
        foodEnricher: {
          file: "foodEnricher.ts",
          role: "Der Premium-Researcher für Restaurants.",
          tasks: ["Detail-Recherche für Food-Kandidaten"],
          input: ["Kandidaten (rawFoodCandidates)", "Redaktionsanweisung (aus INTEREST_DATA)", "Referenz-Standort"],
          output: ["enriched_candidates (Telefon, Awards, Cuisine, Vibe, Text)"]
        }
      }
    },
    phase_4: {
      title: "PHASE 4: Feinplanung",
      agents: {
        initialTagesplaner: {
          file: "initialTagesplaner.ts",
          role: "Der Zeit-Manager für einen konkreten Tag.",
          tasks: ["Erstellt detaillierten Zeitstrahl"],
          input: ["Orte", "Öffnungszeiten", "Präferenzen (Essen/Pause)", "Pace"],
          output: [
            "_thought_process (Strategic planning step)",
            "timeline (09:00 A, 11:00 B...)", 
            "Transfers (A nach B)", 
            "Puffer-Regel (>30 min müssen gefüllt werden)"
          ]
        }
      }
    },
    phase_5: {
      title: "PHASE 5: Content & Finish (Die Redaktion)",
      agents: {
        chefredakteur: {
          file: "chefredakteur.ts",
          role: "Der Texter für die Detail-Ansicht.",
          tasks: ["Schreibt strikt sachliche, enzyklopädische Texte basierend auf Fakten"],
          input: ["Fakten", "Stil: Strikt sachlich/Enzyklopädisch (Ignoriere Vibe)", "Redaktionsanweisung (aus interests.ts - ZWINGEND)"],
          output: ["detailContent (Intro, Highlights, Fakten)", "reasoning"]
        },
        infoAutor: {
          file: "infoAutor.ts",
          role: "Das Reise-Lexikon (Anhang).",
          tasks: ["Schreibt informative Artikel"],
          input: ["Reiseland", "Besuchte Städte", "Themen (Maut, Trinkgeld...)", "Aktivierte Interessen (Anhang)"],
          output: ["chapters (Artikel gemäß Redaktionsanweisung)"]
        },
        tourGuide: {
          file: "tourGuide.ts",
          role: "Der Storyteller.",
          tasks: ["Analysiert Sights und erstellt logische Einheiten (Touren)"],
          input: ["Alle Sehenswürdigkeiten (Kategorie, Ort, Name)"],
          output: ["kapitel (Touren mit geografischer/logistischer Ordnung)"]
        }
      }
    }
  }
};
// --- END OF FILE 166 Zeilen ---