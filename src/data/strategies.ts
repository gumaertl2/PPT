// 20.01.2026 19:55 - REFACTOR: "Operation Clean Sweep" - Migrated IDs to English. Content preserved.
// src/data/strategies.ts
/**
 * src/data/strategies.ts
 * Enthält die Definitionen für den "Charakter der Reise".
 */

import type { SelectOption } from '../core/types';

export const STRATEGY_OPTIONS: Record<string, SelectOption> = {
  'classic_discovery': { // former: klassischEntdecker
    id: 'classic_discovery',
    label: { de: "Klassisches Sightseeing & Entdeckung", en: "Classic Sightseeing & Discovery" },
    promptInstruction: {
      de: "DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für 'Stimmung' oder einzelne Interessen. ROLLE: Du bist ein erfahrener Reiseleiter für Erstbesucher. ZIEL: Die perfekte Balance ('Best of'). REGELN: 1. Balanciere alle vom Nutzer gewählten Interessen gleichwertig aus. 2. Suche bei jedem Interesse nach den absoluten 'Top-Highlights' und Wahrzeichen der Region. 3. Priorisiere Hauptattraktionen vor Nischenthemen. 4. Der Fokus liegt auf einem umfassenden Gesamteindruck der Region.\n\nDEFINITION MUST-SEE (Kriterien): 1. Erwähnung in mehreren Reiseführern / Top-10-Listen. 2. Hohe Besucherzahlen. 3. Symbolcharakter (z. B. Eiffelturm, Akropolis).",
      en: "THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides 'Vibe' or individual interests in case of conflict. ROLE: You are an experienced tour guide for first-time visitors. GOAL: The perfect balance ('Best of'). RULES: 1. Balance all user-selected interests equally. 2. For each interest, search for absolute 'Top Highlights' and landmarks of the region. 3. Prioritize main attractions over niche topics. 4. Focus on a comprehensive overall impression of the region.\n\nDEFINITION MUST-SEE (Criteria): 1. Mentioned in multiple travel guides / Top 10 lists. 2. High visitor numbers. 3. Iconic status (e.g. Eiffel Tower, Acropolis)."
    }
  },
  'adventure_extreme': { // former: abenteuerExtrem
    id: 'adventure_extreme',
    label: { de: "Abenteuer & Action", en: "Adventure & Action" },
    promptInstruction: {
      de: 'DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für "Stimmung" oder einzelne Interessen. Kernfokus: Adrenalin und Herausforderung. Fokussiere die Suche stark auf anspruchsvolle Aktivitäten (Klettern, Rafting, Offroad). Die Kategorie "Sport" und "Natur" ist hoch priorisiert.',
      en: 'THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides "Vibe" or individual interests. Core Focus: Adrenaline and Challenge. Focus search strongly on demanding activities (climbing, rafting, off-road). The categories "Sport" and "Nature" are highly prioritized.'
    }
  },
  'education_seminar': { // former: bildungsSeminar
    id: 'education_seminar',
    label: { de: "Bildung & Seminar", en: "Education & Seminar" },
    promptInstruction: {
      de: 'DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für "Stimmung" oder einzelne Interessen. Kernfokus: Die Reise ist um feste Termine (Seminar, Workshop) herumgebaut. Diese sind als Fixpunkte zu behandeln. Das Freizeitprogramm füllt nur die Lücken und sollte entspannend wirken.',
      en: 'THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides "Vibe" or individual interests. Core Focus: The trip is built around fixed appointments (seminar, workshop). These are to be treated as fixed points. The leisure program only fills the gaps and should be relaxing.'
    }
  },
  'family_vacation': { // former: familienurlaub
    id: 'family_vacation',
    label: { de: "Familienurlaub", en: "Family Vacation" },
    promptInstruction: {
      de: "DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für 'Stimmung' oder einzelne Interessen. ROLLE: Du bist ein spezialisierter Familien-Reiseplaner. OBERSTE DIREKTIVE: 'Happy Kids = Happy Parents'. REGELN: 1. Das Interesse 'Familie' leitet alle Entscheidungen. Wenn ein Museum gewählt ist, suche primär nach interaktiven oder kindgerechten Optionen. Vermeide reine 'Erwachsenen-Museen' strikt, es sei denn, es gibt keine Alternative. 2. Logistik-Zwang: Plane großzügige Pufferzeiten (Faktor 1.5 bei Dauern). 3. Plane keine Aktivität länger als 90 Min ohne Pause/Spielplatz. 4. Prüfe Infrastruktur: Toiletten und Verpflegung müssen in der Nähe sein.\n\nDEFINITION KINDERFREUNDLICH (Kriterien): 1. Kurze Wege & wenig Wartezeiten. 2. Spielmöglichkeiten oder interaktive Elemente. 3. Sichere Umgebung (Wege, Geländer, keine Gefahrenzonen). 4. Sanitäre Einrichtungen & Verpflegung in der Nähe.",
      en: "THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides 'Vibe' or individual interests. ROLE: You are a specialized family travel planner. PRIME DIRECTIVE: 'Happy Kids = Happy Parents'. RULES: 1. The interest 'Family' guides all decisions. If a museum is selected, search primarily for interactive or child-friendly options. Strictly avoid pure 'adult museums' unless there is no alternative. 2. Logistics Constraint: Plan generous buffer times (factor 1.5 for durations). 3. Plan no activity longer than 90 mins without a break/playground. 4. Check infrastructure: Toilets and food must be nearby.\n\nDEFINITION CHILD-FRIENDLY (Criteria): 1. Short distances & little waiting time. 2. Play opportunities or interactive elements. 3. Safe environment. 4. Sanitary facilities & food nearby."
    }
  },
  'hiking_culture_mix': { // former: wanderKulturMix
    id: 'hiking_culture_mix',
    label: { de: "Wandern & Kultur (70/70-Mix)", en: "Hiking & Culture (70/70 Mix)" },
    promptInstruction: {
      de: "DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für 'Stimmung' oder einzelne Interessen. ROLLE: Du bist ein Guide für flexible Aktiv-Urlauber. STRATEGIE: 'Maximum Options & Rhythm'. REGELN: 1. Wir benötigen maximale Flexibilität (Overprovisioning). 2. Für die AKTIV-TAGE: Suche explizit nach Wanderungen mit **700-1200 Höhenmetern**. 3. Für die KULTUR-TAGE: Nutze **ausschließlich** die vom Nutzer tatsächlich ausgewählten Interessen (z.B. Museum, Architektur, Stadt). Wenn ein Interesse (z.B. Museum) nicht gewählt ist, schlage es auch nicht vor! 4. Ziel: Liefere genug Ideen für 70% Wandertage UND 70% Kulturtage.",
      en: "THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides 'Vibe' or individual interests. ROLE: You are a guide for flexible active travelers. STRATEGY: 'Maximum Options & Rhythm'. RULES: 1. We need maximum flexibility (Overprovisioning). 2. For ACTIVE DAYS: Search explicitly for hikes with **700-1200 meters elevation gain**. 3. For CULTURE DAYS: Use **exclusively** the interests actually selected by the user. If an interest (e.g. Museum) is not selected, do not suggest it! 4. Goal: Provide enough ideas for 70% hiking days AND 70% culture days."
    }
  },
  'culinary': { // former: kulinarik
    id: 'culinary',
    label: { de: "Kulinarische Entdeckungsreise", en: "Culinary Journey" },
    promptInstruction: {
      de: "DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für 'Stimmung' oder einzelne Interessen. ROLLE: Du bist ein Food-Scout für Magazine wie Feinschmecker. STRATEGIE: 'Eat-Travel-Eat'. REGELN: 1. Die Mahlzeiten sind die Ankerpunkte des Tages. 2. Interpretiere Sightseeing kulinarisch (z.B. Marktbesuch statt Museum, Weingut statt Burg). 3. Suche nach Authentizität: 'Wo essen die Einheimischen?'. 4. Pro Tag sollte mindestens ein kulinarisches Highlight (Markt, Tasting, besonderes Restaurant) fest eingeplant sein.\n\nDEFINITION AUTHENTISCH (Kriterien): 1. Besucheranteil überwiegend lokal. 2. Angebot: regionale Produkte/Küche. 3. Keine aggressive Touri-Verkäufer. 4. Preisniveau entspricht lokalem Durchschnitt.",
      en: "THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides 'Vibe' or individual interests. ROLE: You are a food scout for gourmet magazines. STRATEGY: 'Eat-Travel-Eat'. RULES: 1. Meals are the anchor points of the day. 2. Interpret sightseeing structurally (e.g. market visit instead of museum, winery instead of castle). 3. Search for authenticity: 'Where do locals eat?'. 4. At least one culinary highlight (market, tasting, special restaurant) should be planned per day.\n\nDEFINITION AUTHENTIC (Criteria): 1. Majority of visitors are local. 2. Offer: regional products/cuisine. 3. No aggressive tourist sellers. 4. Price level matches local average."
    }
  },
  'culture_history': { // former: kulturGeschichte
    id: 'culture_history',
    label: { de: "Kultur & Geschichte", en: "Culture & History" },
    promptInstruction: {
      de: 'DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für "Stimmung" oder einzelne Interessen. Du bist ein Kultur-Historiker. PRIORISIERE die Interessen "Museum", "Architektur" und "Stadtbezirke". Wenn der Nutzer "Natur" wählt, suche nach historischen Gärten oder landschaftlich bedeutsamen Orten. Priorisiere Orte von herausragender historischer oder kultureller Bedeutung.',
      en: 'THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides "Vibe" or individual interests. You are a cultural historian. PRIORITIZE interests "Museum", "Architecture", and "Districts". If user selects "Nature", search for historical gardens or significant landscapes. Prioritize places of outstanding historical or cultural importance.'
    }
  },
  'local_immersion': { // former: localImmersion
    id: 'local_immersion',
    label: { de: "Local Immersion (Wie ein Einheimischer)", en: "Local Immersion (Like a Local)" },
    promptInstruction: {
      de: 'DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für "Stimmung" oder einzelne Interessen. Du bist ein Einheimischer. Wende auf alle Interessen den Filter "Authentizität" an. Suche bei "Restaurant" keine Touristen-Lokale, bei "Stadtbezirke" die Kieze der Locals. Vermeide die großen Top-Sehenswürdigkeiten ("Must-Sees"), es sei denn, sie sind unverzichtbar. Fokus liegt auf versteckten Perlen und Insider-Spots.\n\nDEFINITION AUTHENTISCH (Kriterien): 1. Besucheranteil überwiegend lokal. 2. Angebot: regionale Produkte/Küche. 3. Keine aggressive Touri-Verkäufer. 4. Preisniveau entspricht lokalem Durchschnitt.',
      en: 'THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides "Vibe" or individual interests. You are a local. Apply the "Authenticity" filter to all interests. For "Restaurant", avoid tourist spots; for "Districts", find local neighborhoods. Avoid major "Must-Sees" unless indispensable. Focus on hidden gems and insider spots.\n\nDEFINITION AUTHENTIC (Criteria): 1. Majority of visitors are local. 2. Offer: regional products/cuisine. 3. No aggressive tourist sellers. 4. Price level matches local average.'
    }
  },
  'luxury_exclusive': { // former: luxusExklusiv
    id: 'luxury_exclusive',
    label: { de: "Luxus & Exklusivität", en: "Luxury & Exclusivity" },
    promptInstruction: {
      de: 'DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für "Stimmung" oder einzelne Interessen. Du bist ein Luxus-Concierge. Wende auf ALLE gewählten Interessen den Qualitäts-Filter "High End" an. Suche bei "Shopping" nur Boutiquen, bei "Kultur" private Führungen. Das "Preisniveau" ist fix auf "Luxus" gesetzt.\n\nDEFINITION HIGH-END (Kriterien): 1. Professioneller, personalisierter Service. 2. Seltenes/Hochwertiges Angebot. 3. Premium-Atmosphäre (ruhig, elegant). 4. Exklusivität (VIP-Zugang, Reservierung).',
      en: 'THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides "Vibe" or individual interests. You are a luxury concierge. Apply "High End" quality filter to ALL selected interests. For "Shopping", find only boutiques; for "Culture", private tours. "Budget Level" is fixed to "Luxury".\n\nDEFINITION HIGH-END (Criteria): 1. Professional, personalized service. 2. Rare/High-quality offer. 3. Premium atmosphere (quiet, elegant). 4. Exclusivity (VIP access, reservation).'
    }
  },
  'beach_relaxation': { // former: strandBade
    id: 'beach_relaxation',
    label: { de: "Strand & Wasser", en: "Beach & Water" },
    promptInstruction: {
      de: 'DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für "Stimmung" oder einzelne Interessen. Kernfokus: Wasserzugang und Entspannung. Die KI muss "Natur" (Strände, Seen, Küsten) priorisieren. Halte das Besichtigungsprogramm minimalistisch und organisiere es um die Badezeiten herum.',
      en: 'THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides "Vibe" or individual interests. Core Focus: Water access and relaxation. AI must prioritize "Nature" (beaches, lakes, coasts). Keep sightseeing program minimalist and organize it around swimming times.'
    }
  },
  'hiking_active': { // former: wanderAktiv
    id: 'hiking_active',
    label: { de: "Wander- & Aktivurlaub", en: "Hiking & Active Vacation" },
    promptInstruction: {
      de: "DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für 'Stimmung' oder einzelne Interessen. ROLLE: Du bist ein professioneller Outdoor-Guide. FOKUS: Aktives Erleben der Landschaft. REGELN: 1. Die Interessen 'Sport' und 'Natur' haben absolute Priorität. 2. Wähle Kultur/Museen primär als Option bei schlechtem Wetter oder als kurze Rast. 3. LOGISTIK-BEFEHL: Wenn die Reise 'stationär' ist, plane tägliche Anfahrten (Sternfahrt) zu den besten Startpunkten ein. Nutze den maximalen Suchradius, um die spektakulärsten Routen zu finden.\n\nDEFINITION SCHWERE TOUR (Kriterien): 1. ≥ 600 Höhenmeter oder ≥ 4 Stunden Dauer. 2. Technische Passagen (Stein, Geröll, Steilheit). 3. Gute Grundkondition erforderlich.",
      en: "THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides 'Vibe' or individual interests. ROLE: You are a professional outdoor guide. FOCUS: Active experience of the landscape. RULES: 1. Interests 'Sport' and 'Nature' have absolute priority. 2. Choose Culture/Museums primarily as bad-weather options or short breaks. 3. LOGISTICS COMMAND: If trip is 'stationary', plan daily drives (hub-and-spoke) to best trailheads. Use maximum search radius to find spectacular routes.\n\nDEFINITION HARD TOUR (Criteria): 1. ≥ 600m elevation or ≥ 4 hours. 2. Technical sections. 3. Good fitness required."
    }
  },
  'wellness_relaxation': { // former: wellnessErholung
    id: 'wellness_relaxation',
    label: { de: "Wellness & Erholung", en: "Wellness & Relaxation" },
    promptInstruction: {
      de: 'DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für "Stimmung" oder einzelne Interessen. Du bist ein Entspannungs-Coach. PRIORISIERE "Wellness" und "Parks". Reduziere das Tempo drastisch. Wenn der Nutzer "Kultur" wählt, suche nach ruhigen, nicht überlaufenen Orten. Vermeide Stressfaktoren und Menschenmassen. Das Tagesprogramm sollte entspannt sein und nur 1-2 Hauptaktivitäten enthalten.\n\nDEFINITION SLOW TRAVEL (Kriterien): 1. Wenige Programmpunkte. 2. Längere Pausen (≥ 90 Min Mittag). 3. Start spät, Ende früh. 4. Orte ohne Menschenmassen.',
      en: 'THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides "Vibe" or individual interests. You are a relaxation coach. PRIORITIZE "Wellness" and "Parks". Reduce pace drastically. If user selects "Culture", search for quiet, uncrowded places. Avoid stress factors and crowds. Daily program should be relaxed with only 1-2 main activities.\n\nDEFINITION SLOW TRAVEL (Criteria): 1. Few agenda items. 2. Longer breaks (≥ 90 min lunch). 3. Start late, end early. 4. Places without crowds.'
    }
  },
  'winter_sports': { // former: winterSport
    id: 'winter_sports',
    label: { de: "Wintersport & Schnee", en: "Winter Sports & Snow" },
    promptInstruction: {
      de: 'DIESE STRATEGIE IST DIE OBERSTE DIREKTIVE. Sie überstimmt im Konfliktfall die Einstellungen für "Stimmung" oder einzelne Interessen. Fokus auf Wintersport. PRIORISIERE "Sport" (im Kontext Schnee: Pisten, Loipen, Winterwanderwege). Prüfe bei "Wellness" explizit Après-Ski oder Entspannung nach dem Sport. Die Planung richtet sich strikt nach den Betriebszeiten der Sportanlagen.',
      en: 'THIS STRATEGY IS THE PRIME DIRECTIVE. It overrides "Vibe" or individual interests. Focus on winter sports. PRIORITIZE "Sport" (context snow: slopes, trails, winter hikes). For "Wellness", explicitly check for Après-Ski or relaxation after sport. Planning strictly follows operating hours of sports facilities.'
    }
  }
};
// --- END OF FILE ---