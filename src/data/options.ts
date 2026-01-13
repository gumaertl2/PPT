/**
 * src/data/options.ts
 * 07.01.2026 13:05
 * Enthält Optionen für Reisetempo, Budget, Stimmung und Logistik.
 * UPDATE: Label für Flexibel zu "Preis/Leistung" geändert.
 */

import type { SelectOption } from '../core/types';

export const PACE_OPTIONS: Record<string, SelectOption> = {
  'Ausgewogen': {
    id: 'Ausgewogen',
    label: { de: "Ausgewogen", en: "Balanced" },
    description: { de: "Start 09:30, Ende 17:00. 90 Min Pause.", en: "Start 09:30, End 17:00. 90 min break." },
    promptInstruction: {
      de: 'Die goldene Mitte. Start 09:30 ab Hotel. Ende Programm 17:00. Mittagspause fix 90 Min. REGEL: Max. 4 Hauptaktivitäten pro Tag.',
      en: 'The golden mean. Start 09:30 from hotel. End program 17:00. Lunch break fixed 90 min. RULE: Max. 4 main activities per day.'
    }
  },
  'Entspannt': {
    id: 'Entspannt',
    label: { de: "Entspannt", en: "Relaxed" },
    description: { de: "Start 10:00. Viel Freizeit & Genuss.", en: "Start 10:00. Lots of leisure & enjoyment." },
    promptInstruction: {
      de: "Fokus: Entschleunigung (Slow Travel). Start 10:00 ab Hotel. Ende Programm 16:00. Mittagspause 90 Min + Kaffeepause 45 Min. REGEL: Maximal 2 Hauptaktivität pro Tag, der Rest ist 'Schlendern' oder 'Freizeit'.\nDEFINITION SLOW TRAVEL: Wenige Programmpunkte, Längere Pausen, Start spät/Ende früh, Orte ohne Menschenmassen.",
      en: "Focus: Deceleration (Slow Travel). Start 10:00 from hotel. End program 16:00. Lunch break 90 min + coffee break 45 min. RULE: Max 2 main activities per day, rest is 'strolling' or 'leisure'.\nDEFINITION SLOW TRAVEL: Few agenda items, longer breaks, start late/end early, places without crowds."
    }
  },
  'Straff': {
    id: 'Straff',
    label: { de: "Straff", en: "Fast-Paced" },
    description: { de: "Start 08:00. Maximale Ausbeute.", en: "Start 08:00. Maximize sightseeing." },
    promptInstruction: {
      de: 'Fokus: Maximale Ausbeute (Fear of Missing Out). Start 08:00. Ende 19:00. Kurze Mittagspause (60 Min). Taktung ist hoch, Wege müssen effizient sein.',
      en: 'Focus: Maximize sightseeing (Fear of Missing Out). Start 08:00. End 19:00. Short lunch break (60 min). Pacing is high, routes must be efficient.'
    }
  }
};

export const BUDGET_OPTIONS: Record<string, SelectOption> = {
  'Flexibel': {
    id: 'Flexibel',
    label: { de: "Preis/Leistung", en: "Value for Money" }, // UPDATE: Label geändert
    description: { de: "Gutes Preis-Leistungs-Verhältnis.", en: "Good value for money." },
    promptInstruction: {
      de: 'Dies ist die ausgewogenste Option. Die KI versucht nicht, die billigste oder die teuerste Option zu finden, sondern die mit dem besten Wert für Ihr Geld.\n- Hotels: Solide und gut bewertete 3- bis 4-Sterne-Hotels oder hochwertige, charmante B&Bs.\n- Restaurants: Eine Mischung aus authentischen, landestypischen Restaurants und gelegentlich einem etwas gehobeneren Restaurant.\n- Transport: Effizienteste Methode, oft eine Mischung aus ÖPNV und Taxis.\n- Mietwagen: Kompaktklasse (z.B. VW Golf).',
      en: 'Most balanced option. AI seeks best value for money, not cheapest or most expensive.\n- Hotels: Solid 3-4 star hotels or charming B&Bs.\n- Restaurants: Mix of authentic local spots and occasional upscale dining.\n- Transport: Most efficient method, mix of public transport and taxis.\n- Rental: Compact class (e.g. VW Golf).'
    }
  },
  'Sparsam': {
    id: 'Sparsam',
    label: { de: "Sparsam (€)", en: "Budget (€)" },
    description: { de: "Hostels, Street Food, ÖPNV.", en: "Hostels, Street Food, Public Transport." },
    promptInstruction: {
      de: 'Hier liegt der Fokus klar auf der Minimierung der Kosten.\n- Hotels: Saubere Hostels, einfache Pensionen oder Budget-Hotelketten.\n- Restaurants: Street Food, lokale Märkte, Imbisse.\n- Aktivitäten: Priorisierung von kostenlosen Aktivitäten.\n- Transport: Fast ausschließliche Nutzung des ÖPNV.\n- Mietwagen: Kleinstwagen (z.B. Fiat 500).',
      en: 'Focus clearly on minimizing costs.\n- Hotels: Clean hostels, simple guesthouses, budget chains.\n- Restaurants: Street food, markets, snacks.\n- Activities: Prioritize free activities.\n- Transport: Almost exclusively public transport.\n- Rental: Mini car (e.g. Fiat 500).'
    }
  },
  'Mittelklasse': {
    id: 'Mittelklasse',
    label: { de: "Mittelklasse (€€)", en: "Mid-Range (€€)" },
    description: { de: "Komfort, 4-Sterne, Service.", en: "Comfort, 4-stars, Service." },
    promptInstruction: {
      de: 'Dies entspricht einem komfortablen Reisestil ohne extravaganten Luxus.\n- Hotels: Etablierte 4-Sterne-Hotels oder sehr gut bewertete Boutique-Hotels.\n- Restaurants: Gute, etablierte Restaurants mit Tischservice.\n- Transport: Komfortable Nutzung von ÖPNV und regelmäßige Empfehlungen für Taxis.\n- Mietwagen: Mittelklasse-Limousine oder -Kombi (z.B. VW Passat).',
      en: 'Comfortable travel style without extravagant luxury.\n- Hotels: Established 4-star hotels or highly rated boutique hotels.\n- Restaurants: Good established restaurants with table service.\n- Transport: Comfortable public transport and regular taxi use.\n- Rental: Mid-range sedan/wagon (e.g. VW Passat).'
    }
  },
  'Gehoben': {
    id: 'Gehoben',
    label: { de: "Gehoben (€€€)", en: "Upscale (€€€)" },
    description: { de: "Exklusiv, Fine Dining, Taxis.", en: "Exclusive, Fine Dining, Taxis." },
    promptInstruction: {
      de: 'Für Reisende, die besonderen Wert auf hohe Qualität, Service und Exklusivität legen.\n- Hotels: 5-Sterne-Hotels oder exklusive Boutique-Hotels.\n- Restaurants: Restaurants, die in renommierten Führern erwähnt werden oder Fine-Dining-Lokale.\n- Aktivitäten: Private Führungen, "Skip-the-Line"-Tickets.\n- Transport: Bevorzugte Nutzung von Taxis oder privaten Fahrern.\n- Mietwagen: Premium-Mittelklasse (z. B. Audi A4, BMW 3er).',
      en: 'For travelers valuing high quality, service, and exclusivity.\n- Hotels: 5-star hotels or exclusive boutique hotels.\n- Restaurants: Guide-listed restaurants or fine dining.\n- Activities: Private tours, skip-the-line tickets.\n- Transport: Taxis or private drivers preferred.\n- Rental: Premium mid-range (e.g. Audi A4, BMW 3 Series).'
    }
  },
  'Luxus': {
    id: 'Luxus',
    label: { de: "Luxus (€€€€)", en: "Luxury (€€€€)" },
    description: { de: "5-Sterne, Michelin, Chauffeur.", en: "5-Star, Michelin, Chauffeur." },
    promptInstruction: {
      de: 'Die höchste Stufe für ein kompromissloses Luxuserlebnis.\n- Hotels: Ausschließlich die besten Luxushotels (z.B. Ritz-Carlton, Four Seasons) oder Luxus-Villen.\n- Restaurants: Fokus auf Michelin-Sterne-Restaurants.\n- Aktivitäten: Vollständig personalisierte und private Erlebnisse (z.B. Helikopterrundflüge, Personal Shopper).\n- Transport: Ein privater Chauffeur wird als Standardoption betrachtet.\n- Mietwagen: Oberklasse oder SUV (z.B. Mercedes E-Klasse, BMW X5).',
      en: 'Highest level for uncompromising luxury.\n- Hotels: Only best luxury hotels (Ritz, Four Seasons) or villas.\n- Restaurants: Focus on Michelin-star restaurants.\n- Activities: Fully personalized private experiences (helicopter, personal shopper).\n- Transport: Private chauffeur standard.\n- Rental: Luxury class or SUV (e.g. Mercedes E-Class, BMW X5).'
    }
  }
};

export const VIBE_OPTIONS: Record<string, SelectOption> = {
  'Entdeckerisch': {
    id: 'Entdeckerisch',
    label: { de: "Entdeckerisch", en: "Explorer" },
    description: { de: "Hidden Gems, Details, Authentisch.", en: "Hidden Gems, details, authentic." },
    promptInstruction: {
      de: "FOKUS: Der Blick hinter die Kulissen. ANWEISUNG: Bleibe auch bei bekannten Highlights nicht an der Oberfläche. Suche nach spannenden Details, Legenden oder dem 'zweiten Blick'. Bei der Wahl zwischen Alternativen: Wähle stets das Authentische und weniger Überlaufene.\n\nDEFINITION HIDDEN GEM (Kriterien): 1. Besucherfrequenz < 30 % der Hauptsehenswürdigkeiten. 2. Qualität: historische, kulturelle, landschaftliche Relevanz. 3. Lage: Nebenstraßen/kleinere Viertel.",
      en: "FOCUS: Behind the scenes. INSTRUCTION: Do not stay on surface even at highlights. Look for exciting details, legends, or the 'second glance'. Choose authentic and less crowded alternatives.\n\nDEFINITION HIDDEN GEM (Criteria): 1. Visitor frequency < 30% of main sights. 2. Quality: historical, cultural, scenic relevance. 3. Location: Side streets/smaller districts."
    }
  },
  'Abenteuerlich': {
    id: 'Abenteuerlich',
    label: { de: "Abenteuerlich", en: "Adventurous" },
    description: { de: "Adrenalin, Herausforderung, Mut.", en: "Adrenaline, challenge, courage." },
    promptInstruction: {
      de: "FOKUS: Adrenalin & Grenzerfahrung. REGEL: Kein 'Spaziergang', sondern 'Herausforderung'. Suche nach Aktivitäten, die physische Anstrengung oder Mut erfordern (Klettern, Rafting, Offroad). Wenn eine Wanderung 'leicht' ist, priorisiere eine 'schwere' Alternative.",
      en: "FOCUS: Adrenaline & boundaries. RULE: No 'walk', but 'challenge'. Search for activities requiring physical effort or courage (climbing, rafting, off-road). If a hike is 'easy', prioritize a 'hard' alternative."
    }
  },
  'Entspannt': {
    id: 'Entspannt',
    label: { de: "Entspannt", en: "Relaxed" },
    description: { de: "Stille, Genuss, keine Hektik.", en: "Silence, enjoyment, no rush." },
    promptInstruction: {
      de: "FOKUS: Seelenfrieden & Genuss. VERBOT: Hektik, Lärm, Menschenmassen. Suche nach Orten der Stille: Bibliotheken, leere Parks, Cafés am Wasser, Wellness. Jeder Vorschlag muss die Frage bestehen: 'Kann ich hier 2 Stunden sitzen und nichts tun, ohne mich zu langweilen?'.\n\nDEFINITION SLOW TRAVEL (Kriterien): 1. Wenige Programmpunkte. 2. Längere Pausen (≥ 90 Min Mittag). 3. Start spät, Ende früh. 4. Orte ohne Menschenmassen.",
      en: "FOCUS: Peace of mind & enjoyment. FORBIDDEN: Rush, noise, crowds. Search for quiet places: Libraries, empty parks, waterfront cafes, wellness. Every suggestion must pass: 'Can I sit here for 2 hours doing nothing without getting bored?'.\n\nDEFINITION SLOW TRAVEL (Criteria): 1. Few agenda items. 2. Longer breaks. 3. Start late/end early. 4. Places without crowds."
    }
  },
  'Gesellig': {
    id: 'Gesellig',
    label: { de: "Gesellig", en: "Social" },
    description: { de: "Begegnung, Märkte, Plätze.", en: "Encounters, markets, squares." },
    promptInstruction: {
      de: "FOKUS: Begegnung & Leben. ANWEISUNG: Meide leere Museen oder einsame Pfade. Suche Marktplätze, belebte Plätze, Pubs mit Live-Musik und Events. Priorisiere Orte, an denen 'Socializing' einfach ist.\n\nDEFINITION GESELLIG (Kriterien): 1. Plätze, Food Markets, Feste. 2. Pubs/Bars mit gemeinschaftlichen Tischen. 3. Märkte oder Viertel mit hoher sozialer Aktivität.",
      en: "FOCUS: Encounters & Life. INSTRUCTION: Avoid empty museums or lonely paths. Search marketplaces, lively squares, pubs with live music/events. Prioritize places where 'socializing' is easy.\n\nDEFINITION SOCIAL (Criteria): 1. Squares, food markets, festivals. 2. Pubs/bars with communal tables. 3. Markets or districts with high social activity."
    }
  },
  'Inspirierend': {
    id: 'Inspirierend',
    label: { de: "Inspirierend", en: "Inspiring" },
    description: { de: "Kreativ, Modern, Street Art.", en: "Creative, modern, street art." },
    promptInstruction: {
      de: "FOKUS: Kreativität & Vision. FILTER: 'Mainstream'. Suche nach Orten, die Konventionen brechen: moderne Architektur, Street Art, Design-Studios, innovative Start-ups.\n\nDEFINITION INSPIRIEREND (Kriterien): 1. Moderne/avantgardistische Architektur. 2. Street Art, Design, kreative Szene. 3. Ungewöhnliche Themen, Experimente.",
      en: "FOCUS: Creativity & Vision. FILTER: 'Mainstream'. Search for places breaking conventions: modern architecture, street art, design studios, innovative startups.\n\nDEFINITION INSPIRING (Criteria): 1. Modern/avant-garde architecture. 2. Street art, design, creative scene. 3. Unusual topics, experiments."
    }
  },
  'Kulturell neugierig': {
    id: 'Kulturell neugierig',
    label: { de: "Kulturell neugierig", en: "Culturally Curious" },
    description: { de: "Tiefe, Kontext, Geschichten.", en: "Depth, context, stories." },
    promptInstruction: {
      de: "FOKUS: Tiefe & Kontext. VERBOT: Oberflächliches 'Abhaken'. Suche nach Orten, die komplexe Geschichten erzählen. Priorisiere Museen mit Spezialführungen, historische Stätten mit gutem didaktischem Konzept und Orte des intellektuellen Austauschs.",
      en: "FOCUS: Depth & Context. FORBIDDEN: Superficial 'checking off'. Search for places telling complex stories. Prioritize museums with special tours, historical sites with good didactic concepts, and places of intellectual exchange."
    }
  },
  'Luxuriös': {
    id: 'Luxuriös',
    label: { de: "Luxuriös", en: "Luxurious" },
    description: { de: "Exzellenz, VIP, Ästhetik.", en: "Excellence, VIP, aesthetics." },
    promptInstruction: {
      de: "FOKUS: Exzellenz & Privatsphäre. FILTER: 'Massenabfertigung'. Jeder Vorschlag muss 'High-End' sein. Suche nach Private Dining, VIP-Zugängen, 5-Sterne-Service und ästhetischer Perfektion. Geld spielt keine Rolle, Qualität ist alles.",
      en: "FOCUS: Excellence & Privacy. FILTER: 'Mass processing'. Every suggestion must be 'High-End'. Search for private dining, VIP access, 5-star service, aesthetic perfection. Money is no object, quality is everything."
    }
  },
  'Nostalgisch': {
    id: 'Nostalgisch',
    label: { de: "Nostalgisch", en: "Nostalgic" },
    description: { de: "Historisch, Handwerk, Zeitreise.", en: "Historical, craft, time travel." },
    promptInstruction: {
      de: "FOKUS: Die gute alte Zeit. STIMMUNG: Melancholisch-schön. Suche nach Orten, die die Zeit konserviert haben: Historische Cafés, Antiquariate, Dampfzüge, Handwerksbetriebe. Meide moderne Glasbauten und digitale Hektik.",
      en: "FOCUS: The good old days. MOOD: Melancholic-beautiful. Search for places preserving time: Historic cafes, antique shops, steam trains, craft workshops. Avoid modern glass buildings and digital rush."
    }
  },
  'Romantisch': {
    id: 'Romantisch',
    label: { de: "Romantisch", en: "Romantic" },
    description: { de: "Intim, Aussicht, Ruhe.", en: "Intimate, view, quiet." },
    promptInstruction: {
      de: "FOKUS: Intimität & Atmosphäre. FILTER: 'Vibe-Check'. Schließe Orte aus, die laut, hektisch oder grell beleuchtet sind. Suche nach Orten mit Aussicht (Sonnenuntergang), privater Atmosphäre und ästhetischer Schönheit.\n\nDEFINITION ROMANTISCH (Kriterien): 1. Gedämpftes Licht/Ambiente. 2. Aussicht (Sonnenuntergang, Wasser). 3. Ruhige Ecken, Privatsphäre. 4. Restaurants mit Kerzenlicht.",
      en: "FOCUS: Intimacy & Atmosphere. FILTER: 'Vibe-Check'. Exclude loud, hectic, brightly lit places. Search for places with views (sunset), private atmosphere, aesthetic beauty.\n\nDEFINITION ROMANTIC (Criteria): 1. Dimmed light/ambiance. 2. View (sunset, water). 3. Quiet corners, privacy. 4. Candlelight restaurants."
    }
  },
  'Transformativ': {
    id: 'Transformativ',
    label: { de: "Transformativ", en: "Transformative" },
    description: { de: "Sinn, Stille, Reflexion.", en: "Meaning, silence, reflection." },
    promptInstruction: {
      de: "FOKUS: Persönliches Wachstum & Sinn. SUCHE: 'Soul-Spots'. Finde Orte der Stille (Klöster, Retreats), der Naturverbundenheit oder des sozialen Engagements. Jeder Ort muss eine Einladung zur Selbstreflexion bieten.",
      en: "FOCUS: Personal growth & meaning. SEARCH: 'Soul-Spots'. Find places of silence (monasteries, retreats), nature connection, or social engagement. Every place must offer an invitation for self-reflection."
    }
  }
};

export const LOGISTIC_OPTIONS: Record<string, SelectOption> = {
  'stationaer': {
    id: 'stationaer',
    label: { de: "Stationär (Ein fester Standort)", en: "Stationary (One fixed base)" },
    description: { de: "Sternfahrten von einem Hotel aus.", en: "Day trips from one hotel." }
  },
  'mobil': {
    id: 'mobil',
    label: { de: "Mobil (Rundreise)", en: "Mobile (Road Trip)" },
    description: { de: "Mehrere Standorte / Route.", en: "Multiple locations / Route." }
  }
};