/**
 * src/data/interests.ts
 * Enthält die Definitionen aller Interessen und System-Kategorien.
 * UPDATE: aiInstruction ist nun zweisprachig (DE/EN) für den Expertenmodus.
 */

import type { InterestCategory } from '../core/types';

export const INTEREST_DATA: Record<string, InterestCategory> = {
  'ReisetypStrategie': {
    id: 'ReisetypStrategie',
    label: { de: "Charakter der Reise", en: "Trip Character" },
    isSystem: true,
    defaultUserPreference: { de: "", en: "" },
    aiInstruction: { de: "", en: "" }
  },
  'Reisetempo': {
    id: 'Reisetempo',
    label: { de: "Reisetempo", en: "Travel Pace" },
    isSystem: true,
    defaultUserPreference: { de: "", en: "" },
    aiInstruction: { de: "", en: "" }
  },
  'Preisniveau': {
    id: 'Preisniveau',
    label: { de: "Preisniveau", en: "Budget Level" },
    isSystem: true,
    defaultUserPreference: { de: "", en: "" },
    aiInstruction: {
      de: 'Interpretiere die gewählte Preisklasse stets relativ zum lokalen Kaufkraft-Niveau des Reiselandes (z.B. 50€ sind in Zürich günstig, in Hanoi Luxus).',
      en: 'Always interpret the selected price level relative to the local purchasing power of the destination country (e.g., €50 is cheap in Zurich, luxury in Hanoi).'
    }
  },
  'Emotionale Stimmung': {
    id: 'Emotionale Stimmung',
    label: { de: "Emotionale Stimmung", en: "Emotional Vibe" },
    isSystem: true,
    defaultUserPreference: { de: "", en: "" },
    aiInstruction: { de: "", en: "" }
  },
  'Restaurant': {
    id: 'Restaurant',
    label: { de: "Restaurant", en: "Restaurant" },
    defaultUserPreference: { 
      de: "Wir nutzen einen 3-stufigen Profi-Prozess: Erst scannen wir die gesamte Region nach Einträgen in renommierten Guides (Michelin, Gault&Millau, etc.), dann filtert das System mathematisch präzise nach Entfernung, und am Ende werden die Treffer detailliert beschrieben.",
      en: "We use a 3-step pro process: First we scan the region for entries in renowned guides (Michelin, Gault&Millau, etc.), then filter by distance, and finally describe the hits in detail."
    },
    aiInstruction: {
      de: "STRATEGIE: 3-STUFEN-PROZESS. 1. SCAN: Suche breit nach Guide-Einträgen in der Region. 2. FILTER: Der Code filtert nach Distanz (Radius). 3. ENRICH: Beschreibe die verbleibenden Kandidaten detailliert.",
      en: "STRATEGY: 3-STEP PROCESS. 1. SCAN: Broad search for guide entries in the region. 2. FILTER: Code filters by distance (radius). 3. ENRICH: Describe the remaining candidates in detail."
    }
  },
  'Nachtleben': {
    id: 'Nachtleben',
    label: { de: "Events & Abendprogramm", en: "Events & Nightlife" },
    defaultUserPreference: {
      de: "Ich möchte eine Übersicht über besondere, datumsabhängige Veranstaltungen, die während meiner Reise stattfinden (z.B. Konzerte, Festivals, besondere Ausstellungen). Recherchiere online nach passenden Events und schlage mir die interessantesten vor. Dies ist unabhängig von der allgemeinen Abendgestaltung in Bars.",
      en: "I would like an overview of special, date-dependent events taking place during my trip (e.g. concerts, festivals, special exhibitions). Search online for suitable events and suggest the most interesting ones. This is independent of general evening activities in bars."
    },
    aiInstruction: {
      de: 'Recherchiere für den angegebenen Reisezeitraum nach konkreten Veranstaltungen (Konzerte, Festivals, Märkte, Ausstellungen) in der Zielregion. Nenne für jedes gefundene Event den Namen, das Datum, den Ort, eine kurze Beschreibung und idealerweise einen Link zur offiziellen Webseite oder zum Ticketkauf. Falls keine spezifischen Events gefunden werden, recherchiere nach regelmäßigen Veranstaltungen (z.B. Wochenmärkte, Live-Musik in bestimmten Bars) und beschreibe diese.',
      en: 'Research specific events (concerts, festivals, markets, exhibitions) in the target region for the specified travel period. For each found event, state the name, date, location, a short description, and ideally a link to the official website or ticket purchase. If no specific events are found, research recurring events (e.g., weekly markets, live music in certain bars) and describe them.'
    }
  },
  'StadtInfo': {
    id: 'StadtInfo',
    label: { de: "StadtInfo", en: "City Info" },
    isSystem: false,
    defaultUserPreference: {
      de: "Ich wünsche mir für jede wichtige Stadt auf meiner Reise eine gute Übersicht. Diese soll mir nicht nur historische Fakten vermitteln, sondern auch das besondere Flair der Stadt näherbringen, indem sie auf interessante Plätze, Straßen und das urbane Leben eingeht.",
      en: "I would like a good overview for every major city on my trip. This should not only convey historical facts but also bring the city's special flair closer by highlighting interesting squares, streets, and urban life."
    },
    aiInstruction: {
      de: "**Umfang: Der gesamte Text soll ca. eine DIN A4 Seite umfassen.**\n\nErstelle für jede Stadt eine detaillierte, mehrteilige Zusammenfassung im Anhang.\n\n**Teil 1: Charakter & Flair der Stadt**\nSchreibe eine lebendige, erzählerische Einleitung, die den einzigartigen Charakter der Stadt einfängt. Beschreibe die Atmosphäre, das urbane Leben und die Top 5 Sehenswürdigkeiten, um einen ersten Eindruck zu vermitteln.\n\n**Teil 2: Historische Zeitachse & Persönlichkeiten**\nErstelle eine übersichtliche Tabelle oder eine chronologische Liste mit den wichtigsten Meilensteinen der Stadtgeschichte, von der Gründung bis zur Gegenwart. Nenne zu jeder Epoche die entscheidenden Ereignisse und ein bis zwei prägende Persönlichkeiten.\n\n**Teil 3: Praktische Informationen zum Nahverkehr (ÖPNV)**\nGib eine kurze Übersicht über das öffentliche Nahverkehrssystem (z.B. Metro, Bus, Tram). Erkläre, welche Ticketoption für Touristen am sinnvollsten sind (z.B. Tageskarte, Wochenpass) und wo man diese erwerben kann.",
      en: "**Scope: The entire text should cover approx. one A4 page.**\n\nCreate a detailed, multi-part summary in the appendix for each city.\n\n**Part 1: Character & Flair**\nWrite a vivid, narrative introduction capturing the unique character of the city. Describe the atmosphere, urban life, and top 5 sights to provide a first impression.\n\n**Part 2: Historical Timeline & Personalities**\nCreate a clear table or chronological list of the most important milestones in the city's history, from founding to present. Name the decisive events and one or two defining personalities for each era.\n\n**Part 3: Practical Info on Public Transport**\nProvide a brief overview of the public transport system (e.g., metro, bus, tram). Explain which ticket options make the most sense for tourists (e.g., day pass, weekly pass) and where to buy them."
    }
  },
  'Museum': {
    id: 'Museum',
    label: { de: "Museum", en: "Museum" },
    defaultUserPreference: {
      de: "Wir besuchen gerne Museen unterschiedlichster Art. Unser besonderes Interesse gilt Kunstmuseen (Schwerpunkt Impressionismus, Kubismus, Picasso, Monet). Sollte dies vor Ort nicht verfügbar sein, ist das Spektrum breit: Von Antike/Ägyptischer Kunst über Geschichtsmuseen bis hin zu regionalen Freilicht- oder Bauernhofmuseen. Schlage uns einfach die interessantesten Museen vor, die die Region zu bieten hat – ob Weltkunst oder lokales Highlight.",
      en: "We enjoy visiting museums of all kinds. Our special interest lies in art museums (focus on Impressionism, Cubism, Picasso, Monet). If not available locally, the spectrum is broad: From Antiquity/Egyptian Art to History Museums to regional open-air or farm museums. Simply suggest the most interesting museums the region has to offer – whether world-class art or local highlights."
    },
    aiInstruction: {
      de: "SUCH-STRATEGIE: Suche nach einer vielfältigen Mischung. 1. PRIORITÄT: Suche nach 'Hoher Kunst' (Picasso, Monet, etc.) und bedeutenden Sammlungen. 2. FALLBACK & ERGÄNZUNG: Wenn keine Weltkunst verfügbar ist oder zur Abwechslung, weiche sofort auf hochwertige Regionalmuseen (Freilicht, Geschichte, Archäologie) aus. Das Ziel ist der beste verfügbare kulturelle Querschnitt.\n\nREDAKTIONS-ANWEISUNG: Erstelle für jedes im Reiseplan erwähnte Museum einen detaillierten Eintrag im Anhang.\n\n**Teil 1: Museumsbeschreibung (ca. eine halbe DIN A4 Seite):** Schreibe eine lebendige Beschreibung, die erklärt, warum dieses Museum für den Reisenden besonders interessant ist (Bezug zu seinen Interessen herstellen!). Gehe auf die Sammlungs-Schwerpunkte und die Architektur des Gebäudes ein.\n\n**Teil 2: Top-Exponate:** Liste die Top 10 wichtigsten oder für den Reisenden relevantesten Exponate auf. Gib zu jedem Exponat den Künstler, den Titel und eine kurze, interessante Erklärung (1-2 Sätze), warum es so bedeutend ist.\n\n**Teil 3: Praktische Informationen:** Gib eine Übersicht zu Öffnungszeiten, Ticketpreisen und dem besten Weg, Tickets zu kaufen (online im Voraus vs. vor Ort).",
      en: "SEARCH STRATEGY: Search for a diverse mix. 1. PRIORITY: Look for 'High Art' (Picasso, Monet, etc.) and significant collections. 2. FALLBACK & ADDITION: If no world-class art is available or for variety, switch immediately to high-quality regional museums (open-air, history, archaeology). The goal is the best available cultural cross-section.\n\nEDITORIAL INSTRUCTION: Create a detailed entry in the appendix for each museum mentioned in the itinerary.\n\n**Part 1: Museum Description (approx. half an A4 page):** Write a vivid description explaining why this museum is particularly interesting for the traveler (relate to their interests!). Discuss the collection highlights and the building's architecture.\n\n**Part 2: Top Exhibits:** List the top 10 most important or relevant exhibits. For each exhibit, provide the artist, title, and a short, interesting explanation (1-2 sentences) why it is significant.\n\n**Part 3: Practical Information:** Provide an overview of opening hours, ticket prices, and the best way to buy tickets (online in advance vs. on-site)."
    }
  },
  'Architektur': {
    id: 'Architektur',
    label: { de: "Architektur", en: "Architecture" },
    defaultUserPreference: {
      de: "Starkes Interesse an der Geschichte von Orten, an historischen Bauwerken, Schlössern, Burgen, Kathedralen und deren Hintergründen. Auch moderne Architektur ist von Interesse, wenn sie prägend für das Stadtbild ist.",
      en: "Strong interest in the history of places, historical buildings, castles, fortresses, cathedrals and their backgrounds. Modern architecture is also of interest if it shapes the cityscape."
    },
    aiInstruction: {
      de: "SUCH-STRATEGIE: Suche nach einer Mischung aus historischen Wahrzeichen (Burgen, Kathedralen) und moderner Architektur, die das Stadtbild prägt.\n\nREDAKTIONS-ANWEISUNG: Erstelle für jede im Plan enthaltene historische oder architektonisch bedeutsame Sehenswürdigkeit einen detaillierten Eintrag im Anhang. Gliedere deine Antwort zwingend in die folgenden zwei Teile:\n\n**Teil 1: Architektur, Erbauer und historische Bedeutung**\nSchreibe eine lebendige Beschreibung des Bauwerks. Beginne mit dem **Architekturstil**, dem **Architekten (falls bekannt)** und dem **Bauzeitraum**. Erkläre den ursprünglichen Zweck des Gebäudes und welche Bedeutung es im Laufe der Geschichte für die Stadt oder das Land hatte. Gehe darauf ein, was das Bauwerk heute so besonders und sehenswert macht.\n\n**Teil 2: Top 5 – Die wichtigsten Fakten und Merkmale**\nListe die fünf interessantesten oder wichtigsten Fakten auf, die ein Besucher über dieses Bauwerk wissen sollte. Das können besondere architektonische Details, versteckte Symbole, berühmte historische Ereignisse, die hier stattfanden, oder überraschende Anekdoten sein. Formuliere jeden Punkt als kurzen, informativen Absatz.",
      en: "SEARCH STRATEGY: Search for a mix of historical landmarks (castles, cathedrals) and modern architecture that shapes the cityscape.\n\nEDITORIAL INSTRUCTION: Create a detailed entry in the appendix for each historical or architecturally significant sight in the plan. Structure your answer strictly into the following two parts:\n\n**Part 1: Architecture, Builder, and Historical Significance**\nWrite a vivid description of the structure. Start with the **architectural style**, the **architect (if known)**, and the **construction period**. Explain the original purpose of the building and its historical significance for the city or country. Discuss what makes the structure so special and worth seeing today.\n\n**Part 2: Top 5 – Key Facts and Features**\nList the five most interesting or important facts a visitor should know about this structure. These can be special architectural details, hidden symbols, famous historical events that took place here, or surprising anecdotes. Formulate each point as a short, informative paragraph."
    }
  },
  'Stadtbezirke': {
    id: 'Stadtbezirke',
    label: { de: "Stadtbezirke", en: "Districts & Neighborhoods" },
    defaultUserPreference: {
      de: "Plane einen Spaziergang / eine Besichtigung durch besondere Stadtbezirke und sage uns was an dem Stadtbezirk so besonders ist. Der Fokus liegt auf Atmosphäre, Charme und dem Gefühl für das lokale Leben, weniger auf dem Abarbeiten von Einzel-Sehenswürdigkeiten.",
      en: "Plan a walk / tour through special city districts and tell us what makes the district so special. Focus on atmosphere, charm, and the feel for local life, rather than checking off individual sights."
    },
    aiInstruction: {
      de: "SUCH-STRATEGIE: Suche nach einer **Mischung** aus den **Must-See-Vierteln (z.B. Altstadt)** und den **authentischen, weniger touristischen Bezirken (Hidden Gems)**. Wenn die Stadt **mehrere** Viertel von Interesse hat (z.B. Altstadt und Szeneviertel), schlage **mehrere** vor.\n\nREDAKTIONS-ANWEISUNG: Erstelle im Anhang einen detaillierten Spaziergang für den im Tagesplan genannten Stadtbezirk. Beginne mit einer Einleitung, die die einzigartige Atmosphäre des Bezirks beschreibt. Schlage dann eine logische Route mit 5-7 Stationen **(Plätze, besondere Straßen, interessante Gebäude, versteckte Höfe)** vor. Beschreibe jede Station kurz und erkläre, was es dort zu sehen oder zu erleben gibt. Gib auch Empfehlungen für **ein oder zwei authentische Cafés oder Bistros entlang der Route**.",
      en: "SEARCH STRATEGY: Search for a **mix** of **must-see districts (e.g., Old Town)** and **authentic, less touristy neighborhoods (Hidden Gems)**. If the city has **multiple** districts of interest (e.g., Old Town and trendy district), suggest **several**.\n\nEDITORIAL INSTRUCTION: Create a detailed walk in the appendix for the district mentioned in the day plan. Start with an introduction describing the unique atmosphere of the district. Then suggest a logical route with 5-7 stops **(squares, special streets, interesting buildings, hidden courtyards)**. Briefly describe each stop and explain what there is to see or experience. Also provide recommendations for **one or two authentic cafes or bistros along the route**."
    }
  },
  'Natur': {
    id: 'Natur',
    label: { de: "Natur", en: "Nature" },
    defaultUserPreference: {
      de: "Plane passende Natur-Aktivitäten ein, die meinen Vorlieben entsprechen: Bei Städtereisen einfache bis mittelschwere Wanderungen (2-4 Stunden), die gut erreichbar sind. Bei Rundreisen gerne auch anspruchsvollere Touren oder die Erkundung von Nationalparks. Wichtig ist das Naturerlebnis, **ob berühmtes Highlight oder versteckte Perle**.",
      en: "Plan suitable nature activities matching my preferences: For city trips, easy to moderate hikes (2-4 hours) that are easily accessible. For road trips, also more challenging tours or exploration of national parks. The nature experience is key, **whether famous highlight or hidden gem**."
    },
    aiInstruction: {
      de: "SUCH-STRATEGIE: Suche nach Naturschönheiten, die zum Aktivitätslevel passen. Priorisiere Orte mit 'Wow-Faktor' (Aussicht, Wasserfall), die zur Reise passen. Schließe **keine** Top-Ziele aufgrund ihrer Beliebtheit aus.\n\nREDAKTIONS-ANWEISUNG: Beschreibe jede geplante Natur-Route oder -Aktivität detailliert im Anhang. Liefere Details zu Startpunkt, Länge (in km), geschätzter Dauer, Schwierigkeitsgrad (leicht, mittel, schwer) und Höhenmetern. Beschreibe den Charakter der Landschaft und die Highlights der Tour. Gib auch praktische Tipps zur Ausrüstung und zur besten Tageszeit für die Aktivität.",
      en: "SEARCH STRATEGY: Search for natural beauties matching the activity level. Prioritize places with 'wow factor' (view, waterfall) that fit the trip. Do **not** exclude top destinations due to popularity.\n\nEDITORIAL INSTRUCTION: Describe every planned nature route or activity in detail in the appendix. Provide details on start point, length (in km), estimated duration, difficulty (easy, medium, hard), and elevation gain. Describe the character of the landscape and the tour highlights. Also give practical tips on equipment and the best time of day for the activity."
    }
  },
  'Parks': {
    id: 'Parks',
    label: { de: "Parks", en: "Parks & Gardens" },
    defaultUserPreference: {
      de: "Plane Zeit für die Erkundung von bemerkenswerten Gärten und Parks ein, um Momente der Ruhe zu finden. Das können sowohl berühmte Schlossgärten als auch weniger bekannte, charmante städtische Grünanlagen sein.",
      en: "Plan time for exploring remarkable gardens and parks to find moments of peace. These can be famous palace gardens as well as lesser-known, charming urban green spaces."
    },
    aiInstruction: {
      de: "SUCH-STRATEGIE: Suche nach Oasen der Ruhe. Das können berühmte Schlossgärten oder weniger bekannte, charmante städtische Grünanlagen sein.\n\nREDAKTIONS-ANWEISUNG: Beschreibe jeden geplanten Park oder Garten im Anhang. Erkläre die Entstehungsgeschichte, den Stil (z.B. Barockgarten, Englischer Landschaftsgarten) und die besondere Atmosphäre des Ortes. Hebe besondere Merkmale wie Skulpturen, Wasserspiele oder seltene Pflanzen hervor. Gib einen Tipp, welcher Bereich des Parks besonders sehenswert ist.",
      en: "SEARCH STRATEGY: Search for oases of peace. These can be famous palace gardens or lesser-known, charming urban green spaces.\n\nEDITORIAL INSTRUCTION: Describe every planned park or garden in the appendix. Explain the history, style (e.g., Baroque garden, English landscape garden), and the special atmosphere of the place. Highlight special features such as sculptures, water features, or rare plants. Give a tip on which area of the park is particularly worth seeing."
    }
  },
  'Shopping': {
    id: 'Shopping',
    label: { de: "Shopping", en: "Shopping" },
    defaultUserPreference: {
      de: "Plane etwas Zeit für Shopping ein. Lege den Fokus dabei bitte auf lokale Märkte (Lebensmittel, Handwerk, Flohmärkte) und kleine, besondere Boutiquen oder Manufakturen. Große, internationale Ladenketten sind weniger interessant.",
      en: "Plan some time for shopping. Please focus on local markets (food, crafts, flea markets) and small, special boutiques or manufactures. Large international chains are less interesting."
    },
    aiInstruction: {
      de: "SUCH-STRATEGIE: Lege den Fokus auf lokale Märkte (Lebensmittel, Handwerk, Flohmärkte) und kleine, besondere Boutiquen oder Manufakturen. Große, internationale Ladenketten sind weniger interessant.\n\nREDAKTIONS-ANWEISUNG: Beschreibe die im Plan erwähnten Märkte oder Einkaufsstraßen im Anhang. Gib Informationen zur Art der Geschäfte/Stände, zu den typischen Produkten und den Öffnungszeiten. Gib eine Empfehlung, welcher Produkte besonders authentisch oder von hoher Qualität sind.",
      en: "SEARCH STRATEGY: Focus on local markets (food, crafts, flea markets) and small, special boutiques or manufactories. Large international chains are less interesting.\n\nEDITORIAL INSTRUCTION: Describe the markets or shopping streets mentioned in the plan in the appendix. Provide information on the type of shops/stalls, typical products, and opening hours. Give a recommendation on which products are particularly authentic or of high quality."
    }
  },
  'Wellness': {
    id: 'Wellness',
    label: { de: "Wellness", en: "Wellness" },
    defaultUserPreference: {
      de: "Plane als entspannenden Programmpunkt die Möglichkeit für einen Spa-Besuch oder einen Nachmittag in einem Thermalbad ein, um die Reise-Anstrengungen auszugleichen. Der Fokus liegt auf hochwertigen und ruhigen Einrichtungen.",
      en: "Plan a spa visit or an afternoon in a thermal bath as a relaxing program point to balance travel exertions. Focus is on high-quality and quiet facilities."
    },
    aiInstruction: {
      de: "SUCH-STRATEGIE: Suche nach hochwertigen Spas oder Thermen mit Fokus auf Ruhe und Ambiente (keine reinen Sportbäder).\n\nREDAKTIONS-ANWEISUNG: Liste für die geplante Wellness-Aktivität zwei bis drei passende Orte (Spas, Thermen) im Anhang auf. Beschreibe das Angebot, die Atmosphäre und das Preisniveau. Gib eine Empfehlung, welcher Ort am besten zum gewünschten Entspannungs-Niveau des Reisenden passt.",
      en: "SEARCH STRATEGY: Search for high-quality spas or thermal baths focusing on tranquility and ambiance (no pure sports pools).\n\nEDITORIAL INSTRUCTION: List two to three suitable places (spas, thermal baths) in the appendix for the planned wellness activity. Describe the offer, atmosphere, and price level. Give a recommendation on which place best suits the traveler's desired relaxation level."
    }
  },
  'Budget': {
    id: 'Budget',
    label: { de: "Budget", en: "Cost Overview" },
    defaultUserPreference: {
      de: "Beachte bei der Auswahl aller kostenpflichtigen Aktivitäten, Hotels und Restaurants das von mir festgelegte Preisniveau und gib im Reiseplan eine grobe Schätzung der Gesamtkosten an. Ich möchte eine realistische Vorstellung davon bekommen, was die Reise kosten wird.",
      en: "When selecting all paid activities, hotels and restaurants, observe my specified budget level and provide a rough estimate of total costs in the itinerary. I want a realistic idea of what the trip will cost."
    },
    aiInstruction: {
      de: 'Erstelle im Anhang eine detaillierte Kostenübersicht als Tabelle. Die Tabelle soll für jeden Reisetag eine Zeile enthalten und Spalten für die Kostenarten (Unterkunft, Verpflegung, Aktivitäten, Transport) sowie eine Tagessumme. Fasse am Ende die Gesamtkosten für die Reise zusammen und gib eine Einschätzung, wie gut das Budget zum gewählten Preisniveau passt. Gib auch an, welche Kosten bereits feststehen (z.B. vorgebuchtes Hotel) und welche Schätzungen sind.',
      en: 'Create a detailed cost overview table in the appendix. The table should contain a row for each travel day and columns for cost types (accommodation, food, activities, transport) as well as a daily total. Summarize the total costs for the trip at the end and assess how well the budget fits the selected price level. Also indicate which costs are fixed (e.g., pre-booked hotel) and which are estimates.'
    }
  },
  'Reiseinformationen': {
    id: 'Reiseinformationen',
    label: { de: "Reiseinformationen", en: "Travel Info" },
    isSystem: false,
    defaultUserPreference: {
      de: "Stelle mir eine Sammlung nützlicher, allgemeiner Reise-Informationen zusammen, die mir helfen, mich vor Ort besser zurechtzufinden und typische Touristenfehler zu vermeiden.",
      en: "Compile a collection of useful, general travel information to help me navigate locally and avoid typical tourist mistakes."
    },
    aiInstruction: {
      de: "Erstelle im Anhang einen umfassenden Ratgeber 'Wissenswertes für Ihre Reise'. Das ist eine Pflichtaufgabe: Du MUSST zu JEDEM der folgenden 10 Punkte recherchieren und einen informativen Inhalt erstellen. Wenn keine spezifischen Daten verfügbar sind, gib eine allgemeine Schätzung. Gliedere den Abschnitt zwingend wie folgt:\n\n1.  **Land im Überblick:** Gib einen kurzen, fesselnden Überblick über das Reiseland (falls es nicht das Heimatland des Nutzers ist). Was macht es einzigartig? Nenne 3-4 interessante Fakten, die ein Tourist wissen sollte.\n\n2.  **Lokale Events & Feiertage:** Recherchiere, ob während des angegebenen Reisezeitraums besondere lokale Feiertage, Festivals oder wiederkehrende Events (z.B. Wochenmärkte) stattfinden, die für den Reisenden von Interesse sein könnten. Liste diese mit Datum und kurzer Beschreibung auf.\n\n3.  **Kleiner Sprachführer:** Liste die 5-7 wichtigsten Wörter und Redewendungen in der Landessprache auf, inklusive einer einfachen Lautschrift. (Hallo, Danke, Bitte, Auf Wiedersehen, Entschuldigung, Ja, Nein).\n\n4.  **Praktische Tipps für den Alltag:**\n    * **Nahverkehr:** Gib eine kurze Übersicht über das ÖPNV-System. Erkläre, welche Ticketoption für Touristen am sinnvollsten ist.\n    * **Trinkgeld & Gepflogenheiten:** Erkläre kurz die lokalen Regeln und Erwartungen zum Trinkgeld in Restaurants und für Dienstleistungen.\n    * **Öffnungszeiten:** Beschreibe die typischen Öffnungszeiten für Geschäfte und Restaurants (z.B. 'Viele Geschäfte haben eine Mittagspause von 13-16 Uhr').\n    * **Trinkwasser:** Gib an, ob das Leitungswasser trinkbar ist oder ob Flaschenwasser empfohlen wird.\n    * **WLAN & Konnektivität:** Informiere über die typische Verfügbarkeit von öffentlichem WLAN in Cafés, Hotels etc.\n\n5.  **Sicherheit & Notfälle:**\n    * **Sicherheitshinweise:** Gib aktuelle und relevante Sicherheitshinweise für das Reiseziel. Nenne typische Betrugsmaschen, falls vorhanden.\n    * **Notrufnummern:** Liste die wichtigsten lokalen Notrufnummern auf (Polizei, Krankenwagen, Feuerwehr).\n    * **Apotheken:** Erkläre kurz, wie man eine dienstbereite Apotheke findet.\n\n6.  **Kulinarik:** Liste die Top 5 regionalen Gerichte (nicht-vegetarisch) UND zusätzlich 5 regionale vegetarische Gerichte auf, die man probiert haben sollte.\n\n7.  **Museums- & Touristenpässe:** Recherchiere, ob sich ein City- oder Museumspass für die geplante Reisedauer und die Interessen lohnt. Sprich eine klare Empfehlung aus (Ja/Nein) und begründe sie.\n\n8.  **Organisatorisches:**\n    * **Währung:** Nenne die lokale Währung und gib Tipps zum Geldwechsel oder zur Kartenzahlung.\n    * **Strom & Steckdosen:** Beschreibe den Steckdosentyp und die Netzspannung. Gib an, ob ein Adapter notwendig ist.\n\n9.  **Einreise, Zoll & Gesundheit:**\n    * **Einreisebestimmungen:** Prüfe die Visumpflicht und die Anforderungen an die Passgültigkeit für Touristen (Standard: für Bürger aus dem DACH-Raum).\n    * **Zoll:** Nenne wichtige Einfuhrverbote oder Beschränkungen (z.B. für Medikamente, Lebensmittel oder Kulturgüter).\n    * **Gesundheit:** Liste empfohlene Standard-Impfungen auf und weise auf spezifische Gesundheitsrisiken hin (z.B. Dengue, Malaria, Höhenkrankheit), falls für das Zielgebiet relevant.\n\n10. **Klima & Pack-Empfehlung (DETAIL-CHECK):**\n    * **Wetter-Analyse:** Recherchiere das spezifische Klima im Reisemonat. Achte auf Besonderheiten: Ist das Wasser noch kalt (z.B. Kanaren im Frühling)? Gibt es Restschnee (Gebirge im Mai)? Ist mit starkem Wind zu rechnen?\n    * **Kleidung:** Gib basierend darauf eine konkrete Empfehlung (z.B. 'Windjacke essenziell', 'Badeschuhe empfohlen', 'Mütze für Gipfel').",
      en: "Create a comprehensive guide 'Essential Travel Info' in the appendix. This is mandatory: You MUST research and create informative content for EACH of the following 10 points. If specific data is unavailable, give a general estimate. Structure the section strictly as follows:\n\n1. **Country Overview:** Give a short, engaging overview of the destination country (if not the user's home). What makes it unique? Name 3-4 interesting facts a tourist should know.\n\n2. **Local Events & Holidays:** Research if special local holidays, festivals, or recurring events (e.g., weekly markets) take place during the specified travel period. List these with date and short description.\n\n3. **Mini Phrasebook:** List the 5-7 most important words/phrases in the local language, including simple pronunciation. (Hello, Thank you, Please, Goodbye, Excuse me, Yes, No).\n\n4. **Practical Daily Tips:**\n    * **Public Transport:** Brief overview of the system. Explain best ticket options for tourists.\n    * **Tipping & Customs:** Explain local rules/expectations for tipping in restaurants/services.\n    * **Opening Hours:** Describe typical opening hours (e.g., 'Shops close for lunch 13-16h').\n    * **Drinking Water:** Is tap water safe or is bottled recommended?\n    * **WiFi:** Typical availability of public WiFi.\n\n5. **Safety & Emergencies:**\n    * **Safety Advice:** Current safety notes. Mention typical scams if any.\n    * **Emergency Numbers:** Police, Ambulance, Fire.\n    * **Pharmacies:** How to find a duty pharmacy.\n\n6. **Cuisine:** List Top 5 regional dishes (non-veg) AND 5 regional vegetarian dishes to try.\n\n7. **Passes:** Research if a City/Museum Pass is worth it. Give a clear recommendation (Yes/No) and reason.\n\n8. **Organizational:**\n    * **Currency:** Local currency, exchange/card tips.\n    * **Power:** Socket type, voltage, adapter needed?\n\n9. **Entry, Customs, Health:**\n    * **Entry:** Visa requirements/passport validity (Standard: DACH citizens).\n    * **Customs:** Import bans (meds, food, culture).\n    * **Health:** Recommended vaccinations, specific risks (Dengue, Altitude, etc.).\n\n10. **Climate & Packing:**\n    * **Weather Analysis:** Specific climate in travel month. Cold water? Residual snow? Wind?\n    * **Clothing:** Concrete recommendation based on this (e.g., 'Windbreaker essential')."
    }
  },
  'Unberuecksichtigt': {
    id: 'Unberuecksichtigt',
    label: { de: "Nicht berücksichtigte Orte", en: "Ignored Places" },
    defaultUserPreference: {
      de: "Wenn diese Option aktiviert ist, erstellt der Tagesplaner am Ende des Berichts automatisch eine Liste aller Prio-1- und Prio-2-Sehenswürdigkeiten, die aus Zeit- oder Logistikgründen nicht in den Plan aufgenommen werden konnten. Diese werden im gleichen Detailgrad wie in der Vorauswahl angezeigt.",
      en: "If this option is enabled, the itinerary planner automatically creates a list of all Prio-1 and Prio-2 sights at the end of the report that could not be included due to time or logistics. These are displayed with the same level of detail as in the pre-selection."
    },
    aiInstruction: {
      de: '// Diese Funktion wird automatisch vom Tagesplaner (Phase 2A) ausgeführt. Keine Aktion für den Chefredakteur erforderlich.',
      en: '// This function is automatically executed by the Day Planner (Phase 2A). No action required for Editor-in-Chief.'
    }
  },
  'Puffer': {
    id: 'Puffer',
    label: { de: "Freie Zeit / Puffer", en: "Free Time / Buffer" },
    isSystem: true,
    defaultUserPreference: {
      de: "Dies ist eine vom Tagesplaner eingefügte kreative Aktivität, um den Plan zu bereichern und Lücken sinnvoll zu füllen.",
      en: "This is a creative activity inserted by the daily planner to enrich the plan and fill gaps meaningfully."
    },
    aiInstruction: {
      de: 'Dies ist eine vom Tagesplaner eingefügte kreative Aktivität, um den Plan zu bereichern. Deine Aufgabe ist es, den Titel (z.B. "Spaziergang im Viertel XY") als Inspiration zu nehmen und eine kurze, ansprechende Beschreibung zu verfassen. Erkläre, warum dieser Moment oder dieser Ort eine wertvolle Ergänzung zum Tagesplan ist und was den Reisenden dort erwartet.',
      en: 'This is a creative activity inserted by the day planner. Your task is to take the title (e.g., "Walk in District XY") as inspiration and write a short, engaging description. Explain why this moment or place is a valuable addition to the itinerary and what awaits the traveler there.'
    }
  },
  'Allgemein': {
    id: 'Allgemein',
    label: { de: "Allgemein", en: "General" },
    isSystem: true,
    defaultUserPreference: {
      de: "Dies ist ein technischer 'Sammeltyp' für alle Planpunkte, die kein spezifisches Interesse darstellen (z.B. ein Museum oder Restaurant). Er wird automatisch für logistische Einträge wie 'Fahrt zum Hotel', allgemeine Pausen oder unspezifische Spaziergänge verwendet.",
      en: "This is a technical 'catch-all' type for all plan points that do not represent a specific interest (e.g. a museum or restaurant). It is automatically used for logistical entries such as 'Drive to hotel', general breaks, or unspecific walks."
    },
    aiInstruction: { de: '', en: '' }
  },
  'Sport': {
    id: 'Sport',
    label: { de: "Sport & Aktiv", en: "Sport & Active" },
    defaultUserPreference: {
      de: "Ich möchte mich im Urlaub sportlich betätigen. Suche nach Möglichkeiten zum Wandern, Radfahren, Schnorcheln oder anderen Aktivitäten, die zur Region passen.",
      en: "I want to be active during my vacation. Search for opportunities for hiking, cycling, snorkeling or other activities that fit the region."
    },
    aiInstruction: {
      de: 'Plane aktive körperliche Betätigung ein. Suche nach konkreten Routen (Wandern zwischen 700 und 1100 Höhenmetern und bis zu 15 Kilometer, Radfahren bis zu 55 Kilometer), Verleihstationen oder Sportstätten, die zum Reiseziel passen. Gib Details zu Schwierigkeitsgrad und Dauer an.',
      en: 'Plan active physical exercise. Search for specific routes (hiking 700-1100m elevation, up to 15km; cycling up to 55km), rental stations, or sports facilities matching the destination. Provide details on difficulty and duration.'
    }
  },
  'Strand': {
    id: 'Strand',
    label: { de: "Strand & Meer", en: "Beach & Sea" },
    defaultUserPreference: {
      de: "Wir möchten Zeit am Meer verbringen. Plane Tage für Erholung am Strand, zum Sonnenbaden und Schwimmen ein. Wenn das Ziel es hergibt, sind wir auch sehr an Schnorcheln oder Tauchen interessiert (schöne Riffe, klares Wasser).",
      en: "We want to spend time by the sea. Plan days for relaxing on the beach, sunbathing, and swimming. If the destination offers it, we are also very interested in snorkeling or diving (beautiful reefs, clear water)."
    },
    aiInstruction: {
      de: 'SUCH-STRATEGIE: Suche nach spezifischen Stränden oder Buchten, die sich durch hohe Wasserqualität und landschaftliche Schönheit auszeichnen.\n* **Priorität 1:** Orte, die sich gut zum Schwimmen eignen (wenig Strömung, sauber).\n* **Priorität 2:** Wenn im Zielgebiet möglich, suche explizit nach Schnorchel- oder Tauch-Spots (Riffe, Meeresparks).\n\nREDAKTIONS-ANWEISUNG: Beschreibe jeden Strand im Anhang detailliert. Nenne die Beschaffenheit (Sand/Kies), die Wasserbedingungen (ruhig/Wellen) und die vorhandene Infrastruktur (Liegen, Schatten, Bars). Gib bei Schnorchel-Spots an, was man sehen kann (Fische, Korallen).',
      en: 'SEARCH STRATEGY: Search for specific beaches or bays characterized by high water quality and scenic beauty.\n* **Priority 1:** Places suitable for swimming (little current, clean).\n* **Priority 2:** If possible in destination, explicitly search for snorkeling or diving spots (reefs, marine parks).\n\nEDITORIAL INSTRUCTION: Describe every beach in detail in the appendix. Mention texture (sand/pebbles), water conditions (calm/waves), and infrastructure (loungers, shade, bars). For snorkel spots, state what can be seen (fish, corals).'
    }
  },
  'Familie': {
    id: 'Familie',
    label: { de: "Familie & Kinder", en: "Family & Kids" },
    defaultUserPreference: {
      de: "Wir reisen mit Kindern. Plane Ausflugsziele, die kinderfreundlich sind, Spaß machen und sicher sind. Vermeide zu lange Wege oder Orte, an denen Kinder sich langweilen.",
      en: "We are traveling with children. Plan excursions that are child-friendly, fun, and safe. Avoid long distances or places where children get bored."
    },
    aiInstruction: {
      de: "Plane Ausflugsziele, die speziell für Kinder geeignet sind (Zoos, Freizeitparks, leichte Erlebnispfade, interaktive Museen). Priorisiere Orte mit guter Infrastruktur für Familien (Toiletten, Verpflegung). Achte auf kindgerechte Distanzen.",
      en: "Plan excursions specifically suitable for children (zoos, theme parks, easy adventure trails, interactive museums). Prioritize places with good family infrastructure (toilets, food). Ensure child-friendly distances."
    }
  },
  'Anreise': {
    id: 'Anreise',
    label: { de: "Anreise", en: "Arrival" },
    defaultUserPreference: {
      de: 'Plane für mich die beste Anreisemöglichkeit von meinem Heimatort zum Reiseziel. Berücksichtige bei der Auswahl die Faktoren Zeit, Kosten und Umweltfreundlichkeit. Ich bin offen für alle Verkehrsmittel (Flugzeug, Bahn, Auto) und freue mich über einen fundierten Vergleich, der mir die Entscheidung erleichtert. Gib auch eine Schätzung für die CO2-Emissionen der jeweiligen Option an, um die Umweltverträglichkeit bewerten zu können.',
      en: 'Plan the best travel option from my home town to the destination. Consider time, cost, and eco-friendliness. I am open to all means of transport (plane, train, car) and appreciate a solid comparison to facilitate my decision. Also provide an estimate for CO2 emissions for each option to assess environmental impact.'
    },
    aiInstruction: {
      de: 'Nutze die recherchierten Fakten und erstelle im Anhang einen detaillierten Vergleich der Anreiseoptionen (Flug, Bahn, Auto) mit geschätzter Dauer, Kosten und CO2-Fußabdruck pro Person. Analysiere den Transfer vom Ankunftsort (Flughafen/Bahnhof) zum Hotel, inklusive möglicher Verkehrsmittel und Dauer. Sprich basierend auf dieser Gesamtanalyse eine klare Empfehlung aus, welche Option für den Reisenden unter Berücksichtigung von Effizienz, Kosten und Nachhaltigkeit die beste ist.',
      en: 'Use researched facts to create a detailed comparison of travel options (plane, train, car) in the appendix, including estimated duration, costs, and CO2 footprint per person. Analyze the transfer from arrival point (airport/station) to the hotel, including possible transport means and duration. Based on this analysis, make a clear recommendation on which option is best for the traveler considering efficiency, costs, and sustainability.'
    }
  },
  'Hotel': {
    id: 'Hotel',
    label: { de: "Hotel", en: "Hotel" },
    defaultUserPreference: {
      de: 'Plane für die Übernachtungen passende Hotels. Die Auswahl soll sich streng an der Definition für Hotels orientieren, die in der übergeordneten Einstellung \'Preisniveau\' getroffen wurde. Falls ein Hotelname bereits durch mich vorgegeben wurde, nutze diesen als festen Punkt im Plan und schlage keine Alternativen vor. Achte bei den Vorschlägen auf eine gute Lage, die zu den geplanten Aktivitäten passt.',
      en: 'Plan suitable hotels for overnight stays. The selection should strictly follow the hotel definition in the global \'Budget Level\' setting. If I have already specified a hotel name, use this as a fixed point in the plan and do not suggest alternatives. Ensure suggestions have a good location matching planned activities.'
    },
    aiInstruction: {
      de: 'Wenn bereits ein Hotelname vom Nutzer angegeben wurde, recherchiere Details zu diesem Hotel (Lage, Besonderheiten, Link zur Webseite) und füge sie dem Anhang hinzu. Schlage in diesem Fall keine Alternativen vor. Ansonsten, liste für jeden Übernachtungsort zwei passende Hotelvorschläge im Anhang auf, basierend auf den recherchierten Fakten. Gib eine kurze, persönliche Empfehlung, warum eines der Hotels besonders gut zur Reise und zum gewählten Preisniveau passt. Begründe deine Wahl.',
      en: 'If a hotel name was provided by the user, research details (location, features, website link) and add them to the appendix. Do not suggest alternatives in this case. Otherwise, list two suitable hotel suggestions for each overnight stay location in the appendix based on researched facts. Give a short, personal recommendation why one of the hotels fits the trip and selected budget level particularly well. Justify your choice.'
    }
  }
};