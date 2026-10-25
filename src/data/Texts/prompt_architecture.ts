// 25.10.2026 13:13 - DOCS: Synced Prompt Architecture with current codebase (Triple Dragnet Food Pipeline, Quality Doorman, [USER OVERRIDE], Serendipity Rule, Tagesplaner & Conflict Intercept).
// 19.03.2026 18:30 - DOCS: Added Targeted Context Matrix documentation.
// 20.02.2026 21:15 - DOCS: Updated Agent behaviors (Multi-City Chunking for Food, Geo-Context Guard for InfoAutor).
// 05.02.2026 19:30 - DOCS: SYNC WITH CODE (Inverted Search Pipeline).
// - Updated Food Workflow to reflect "Collector -> Auditor" Strategy.
// - Removed obsolete "Source-First" logic.

export const promptArchitecture = {
  de: {
    title: "Prompt Architektur & Agenten V40",
    content: `# Papatours V40: Die Prompt-Architektur & Agenten-Spezifikation (Real-World Edition)

Dieses Dokument ist die technische "Single Source of Truth" für die Interaktion mit der Google Gemini API. Es beschreibt die Pipeline, die Datenquellen und die exakte Arbeitsweise jedes Agenten, synchronisiert mit der Code-Basis.

---

## 1. Die Infrastruktur: Factory & Processor

In V40 werden Prompts niemals "einfach so" als Strings geschrieben. Sie durchlaufen eine strikte Pipeline, die Typ-Sicherheit und JSON-Validität garantiert.

### A. Der \`PromptBuilder\` (Die Konstruktions-Maschine)
Er ist die einzige erlaubte Methode, um Prompts zu erstellen. Er erzwingt das "Silence Protocol" und den "Dynamic Language Lockdown" (20 Sprachen).
* **Funktion:** Fluent API (\`new PromptBuilder().withOS().withRole().withContext()...\`).
* **Aufgaben:**
    1.  **System OS & Priority Pyramid (\`withOS\`):** Injiziert die Grundgesetze (CoT in \`_thought_process\`, Batch Integrity) und die Prioritäten-Pyramide.
    2.  **Role Injection (\`withRole\`):** Setzt die Persona (z.B. "Du bist der Hotel-Scout").
    3.  **Context Injection (\`withContext\`):** Formatiert Datenobjekte als strukturierte JSON-Blöcke, nie als Prosa.
    4.  **Schema Binding (\`withOutputSchema\`):** Hängt am Ende das erwartete JSON-Schema an.
    5.  **Dynamic Language Lockdown & JSON Enforcing (\`build\`):** Liest live \`project.userInputs.aiOutputLanguage\` aus dem Store, zwingt alle Textwerte in die Zielsprache (während Keys englisch bleiben) und setzt \`Start your response directly with '{' (bzw. '[')\`.

### B. Der \`PayloadBuilder\` & die \`Preparer\` (Die Daten-Schleuse)
Bevor ein Prompt gebaut wird, müssen die Daten gesammelt werden. Dies geschieht in den \`src/core/prompts/preparers/\`.
* **Prinzip:** Trennung von Datenbeschaffung (Code) und Textgenerierung (Template).
* **Aufgabe:** Extrahiert aus dem riesigen \`TripProject\` State **nur** die für den spezifischen Agenten relevanten Daten.
* **Beispiel:** Der \`HotelScout\` bekommt nicht "alles", sondern ein präzises Objekt mit \`logistics_mode\`, \`budget\` und dem *aktuellen* Stop der Rundreise.

### C. Die \`Validation\` (Die Firewall)
Keine KI-Antwort darf ungeprüft in das System.
* **Technik:** Zod-Schemas (\`src/services/validation.ts\`).
* **Prozess:** Jedes JSON von Gemini wird *vor* der Weiterverarbeitung gegen das Schema geparst (inkl. Exponential Backoff Auto-Retry im \`TripOrchestrator\` bei Server- oder Schema-Fehlern).
* **Konsequenz:** Fehlerhafte Strukturen führen zu einem kontrollierten Retry/Fehler, statt die UI crashen zu lassen.

### D. Der \`ResultProcessor\` & die Sub-Prozessoren (Der Integrator & Beschützer)
Das Herzstück der Datenverarbeitung (\`src/services/ResultProcessor.ts\` + \`src/services/processors/\`).
* **Facade/Router:** \`ResultProcessor\` delegiert an \`PlaceProcessor\`, \`FoodProcessor\` und \`PlanningProcessor\`.
* **ID Factory & Smart Matching:** Erstellt UUIDs für neue Orte, nutzt striktes ID-Matching (insb. beim \`Chefredakteur\` und \`Anreicherer\`) sowie Fuzzy/Substring-Matching bei neuen Kandidaten, um Duplikate zu verhindern.
* **Data Preservation Shield (Der Daten-Schutz):**
    * **Core Hotel-Shield:** Wenn ein Ort bereits als \`hotel\` gespeichert ist, friert der \`PlaceProcessor\` die Kategorie ein, damit der \`Anreicherer\` sie nicht überschreibt.
    * **Content Guard:** Verhindert beim \`Chefredakteur\`, dass leere oder zu kurze Texte (< 15 Zeichen) bestehende Daten überschreiben.
    * **SSOT Protection (Food):** Bereits angereicherte Restaurants werden nicht durch rohe Scout-Daten überschrieben; abgelehnte Kandidaten (\`verification_status: 'rejected'\`) werden hart herausgefiltert.
* **Content Router:** Entscheidet:
    * Ist es ein physischer Ort? -> Ab in \`project.data.places\`.
    * Ist es Text-Wissen? -> Ab in \`project.data.content.infos\`.
* **State Mutation:** Führt das Update im \`useTripStore\` durch (SSOT).

### E. Der \`PersonaInjector\` (Targeted Context Matrix)
Das V40.6 Architektur-Update (\`src/core/prompts/PersonaInjector.ts\`). Verhindert das "Lost in the Middle"-Syndrom und Halluzinationen. 
Anstatt allen Agenten blind alle Nutzerdaten einzuimpfen, verteilt der Injector Daten rollen-spezifisch:
* **Rolle 'basis' (\`prepareBasisPayload\`):** Erhält Vibe, Nutzer-Notizen und No-Gos.
* **Rolle 'scout' (\`prepareHotelScoutPayload\`):** Erhält zwingend das Budget, Vibe, Notizen und No-Gos.
* **Rolle 'planner' (\`prepareTagesplanerPayload\`):** Erhält zwingend das Reisetempo (Pace), Notizen und No-Gos.
* **Rolle 'writer' (\`prepareChefredakteurPayload\` & \`chefredakteur.ts\`):** Erhält Nationalität, Vibe und Leidenschaften (aber **kein Budget**).
* **Logistics & Fact Engines (\`TourGuide\`, \`TransferPlanner\`, \`Anreicherer\`, \`FoodWorkflow\`):** Erhalten absichtlich *keine* Persona-Injektion, sondern arbeiten fakten- und quellenbasiert.

---

## 2. Die Agenten: Spezifikation & Datenfluss

### A. Der "Basis" Agent (Der Sammler)
**Aufgabe:** Identifiziert POIs (Points of Interest), die zu den Interessen passen.
* **Template:** \`basis.ts\`
* **Input (Via \`prepareBasisPayload\`):**
    * \`destination\`: Zielregion oder Stadt.
    * \`interests\`: Liste der aktiven Interessen-IDs (z.B. \`history\`, \`nature\`).
    * **CRITICAL FILTER:** Der Preparer filtert hier aktiv alle Service-Interessen (Restaurants, Hotels) und Anhang-Themen *heraus*. Grund: Der Prompt enthält die strikte Regel "NO HOTELS/RESTAURANTS" ("Double Bind" Firewall), um Halluzinationen zu vermeiden.
    * **🚨 [USER OVERRIDE] & Anti-Laziness:** Manuelle Vorgaben des Users (z.B. genaue Höhenmeter, Kilometer, spezifische Sportarten) überstimmen als hartes Gesetz jedes allgemeine Briefing. Die KI muss echte, konkrete Startpunkte/Routen nennen (oder im \`_thought_process\` ehrlich erklären, falls die Metrik geografisch unmöglich ist).
    * **Persona-Injection:** Bekommt den Vibe, Wünsche und No-Gos, um die Atmosphäre der POIs zu steuern.
* **Output (Code-Sync):**
    * \`candidates\`: Liste von Strings (Namen).
    * \`_thought_process\`: String (Analyse).

### B. Der "Anreicherer" (Der Veredler)
**Aufgabe:** Sucht zu einer Liste von Namen die harten Fakten.
* **Template:** \`anreicherer.ts\`
* **Input (Via \`prepareAnreichererPayload\`):**
    * \`candidates\`: Liste von Objekten \`{ id, name, ... }\`.
* **Prompt-Logik:**
    * **ID Pass-Through:** "Du musst die \`id\` aus dem Input 1:1 in den Output kopieren."
    * **Critical Geocoding Rule:** Adressen müssen maschinenlesbar für OpenStreetMap sein (keine Prosa oder Klammerzusätze).
    * **Universal Acceptance (Serendipity-Effekt):** Alle real existierenden Orte des Sammlers erhalten \`"valid": true\`, auch wenn sie außerhalb der engeren Suchregion liegen. Nur 100%ige Halluzinationen werden aussortiert.
    * **Hiking/Trails Anti-Hallucination:** Bei Wanderungen muss \`website\` auf Komoot/AllTrails/Outdooractive verweisen und \`logistics\` den exakten Wanderparkplatz/Trailhead nennen.
* **Output:** \`results\` Array.

### C. Der "Hotel Scout" (Der Logistiker)
**Aufgabe:** Findet die optimale Unterkunft passend zur Logistik-Strategie.
* **Template:** \`hotelScout.ts\`
* **Input (Via \`prepareHotelScoutPayload\`):**
    * \`logistics_mode\`: "stationaer" vs. "mobil" (Rundreise).
    * \`budget_level\`: Das gewählte Preisniveau.
    * **Persona-Injection:** Bekommt das harte \`budget_level\`, Vibe und No-Gos injiziert.
* **Business Logic (Im Prompt & Processor):**
    * **Modus Stationär:** Suche zentrale Base-Camp-Optionen.
    * **Modus Rundreise:** Suche für den *aktuellen* Stop passende Optionen.
    * **Camper-Switch:** Wenn \`logistics_type == camper\`, suche **ausschließlich** Campingplätze/Stellplätze.
    * **Map-Sync:** Gefundene Hotels werden automatisch mit \`category: 'hotel'\` in \`project.data.places\` synchronisiert.

### D. Der "Food Scout" & "Food Enricher" (Die Kulinarik-Experten)
**WICHTIG:** Gesteuert durch \`FoodWorkflow.ts\` (Multi-City Inverted Search Pipeline mit Quality Doorman).

#### Phase 1: Der Food Scout (International Triple Dragnet)
* **Template:** \`foodScout.ts\` (läuft auf \`Gemini Pro\` mit aktivierter Suche).
* **Input (Multi-City Chunking):** \`FoodWorkflow\` sammelt dynamisch alle auf der Route besuchten Orte (Stationäres Ziel, Rundreise-Stopps sowie alle Orte der Kategorien \`districts\` und \`city_info\`) und ruft den \`foodScout\` *sequenziell in einer Schleife* für jeweils **eine** Stadt + Land auf.
* **Strategie ("The Triple Dragnet"):**
    1.  **Net A (Regional List Scan):** Durchsucht regionale Bestenlisten der übergeordneten Region.
    2.  **Net B (Neighbor Cluster):** Sucht mit OR-Logik in 3–8 Nachbarorten (< 10–25 km).
    3.  **Net C (Micro-District Zoom):** Sucht gezielt in Ortsteilen nach prämierten Gasthöfen.
* **Graceful Exit & Anti-Hallucination:** Findet sich im unmittelbaren Radius kein Eintrag in offiziellen Guides (Michelin, Gault&Millau, Falstaff, Slow Food etc.), erfindet der Scout niemals Auszeichnungen, sondern wählt die besten lokalen Qualitäts-Gasthöfe mit \`awards: ["Local Top Pick"]\`.
* **Quality Doorman (Step 5 in \`FoodWorkflow.ts\`):** Fehlt bei einem Kandidaten die Adresse, startet automatisch ein gezielter \`REPAIR_MODE\`-Call zur Adress-Nachrecherche, bevor Phase 2 beginnt.

#### Phase 2: Der Food Enricher (4-Eyes Auditor & Chief Editor)
* **Template:** \`foodEnricher.ts\` (läuft auf \`Gemini Flash-Thinking\`).
* **Strategie:** "4-Eyes Audit & Data Recovery" + Dual-Text Generation.
* **Aufgabe:**
    * **Step 0 (Door Guard & Data Recovery):** Prüft Existenz & Öffnungsstatus (geschlossene Orte oder Fast-Food/Imbisse -> \`verification_status: "rejected"\`; Qualitäts-Gasthöfe, Landhotels, Fine Dining oder Guide-Orte -> \`"enriched"\`). Fehlende Google-Ratings werden gezielt nachrecherchiert.
    * **Step 1 (Dual-Text):** Schreibt sowohl den Kurz-Teaser (\`description\`, max. 150 Zeichen) als auch den Markdown-Artikel (\`detailContent\`: Kulinarisches Erlebnis, Atmosphäre, Insider-Tipp).
    * **Step 2 & 3 (Soft Skills & Guide Link):** Ergänzt \`vibe\`, \`signature_dish\` (Anti-Halluzinations-Regel: Spezialitäten-Kategorie statt geratener Einzelgerichte), \`logistics\`, \`priceLevel\`, \`openingHours\` und generiert den \`guide_link\`.
* **Output:** \`enriched_candidates\` (abgelehnte Einträge werden im \`FoodProcessor\` automatisch blockiert).

### E. Der "ChefPlaner" (Der Stratege)
**Aufgabe:** Fundamentalanalyse vor der eigentlichen Planung.
* **Template:** \`chefPlaner.ts\`
* **Input (Via \`prepareChefPlanerPayload\`):**
    * Komplettes Profil: \`travelers\`, \`dates\`, \`logistics\`, \`interests\` inklusive \`vibe\`, \`budget\` und \`pace\`.
* **Output & Store-Effekt:** \`strategic_briefing\`, \`smart_limit_recommendation\` (aktualisiert automatisch \`sightsCount\`), \`corrections\` (automatische Tippfehler- und Länderkorrektur im Store) sowie \`validated_hotels\`.

### F. Der "Route Architect" (Der Logistik-Meister)
**Aufgabe:** Berechnet 3 optimale Routen-Optionen für Rundreisen oder das Basecamp-Scouting.
* **Template:** \`routeArchitect.ts\`
* **Logik:** Optimiert Etappen und Fahrzeiten und unterstützt das "Keep"-Feedback für bereits vom User fixierte Teilrouten.
* **Output:** \`routes\` mit \`stages\`, \`drive_time\` und \`distance\`.

### G. Der "Tour Guide" (Der Clusterer)
**Aufgabe:** Ordnet die gefundenen POIs (\`places\`) logischen, geografisch zusammenhängenden Tagestouren zu.
* **Template:** \`tourGuide.ts\`
* **Output:** \`tour_suggestions\`.

### H. Der "Initial Tagesplaner" & "Transfer Planner" (Die Logistik-Engines)
* **Initial Tagesplaner (\`initialTagesplaner.ts\`):**
    * Läuft über den \`PromptBuilder\` (inkl. \`.withOS()\` und Dynamic Language Lockdown) und erhält die \`planner\`-Persona (Reisetempo, Wünsche, No-Gos).
    * **Harte Logistik-Gesetze:** Exakte Tagesanzahl, 60 Min. Ankunfts-/120 Min. Abflugpuffer, zwingender Hotel-Loop (Start & Ende am Tageshotel), Transfer-Mandat mit expliziten Abfahrtszeiten, Dynamic Lunch Break, **Immersive Block Rule (4+ Std.)**, **Golden Hour Rule (ab 17:00 Uhr nur noch Outdoor/Relax)** und 30-Minuten-Lückenfüller.
    * **Intelligent Conflict Intercept (\`PlanningProcessor.ts\`):** Können Orte mit \`Prio 1\`, \`Prio 2\` oder \`Fix\` zeitlich nicht eingeplant werden (\`unassigned\`), stoppt der Processor das Speichern und öffnet das \`PlannerConflictModal\`, damit der User entscheiden kann.
* **Transfer Planner (\`transferPlanner.ts\`):** Berechnet und optimiert detaillierte Wegezeiten und Distanzen zwischen den geplanten Stationen.

---

## 3. Die Agenten-Matrix: Redakteure (Phase 5)

### I. Der "Ideen Scout" (Der Joker)
**Aufgabe:** Liefert Alternativen für Sondertage oder Wetterumschwünge.
* **Template:** \`ideenScout.ts\`
* **Szenarien:** \`sunny_day_ideas\` (Outdoor), \`rainy_day_ideas\` (Indoor) und \`wildcard_ideas\` (Hidden Gems).
* **Output:** Werden im \`PlanningProcessor\` als Orte der Kategorie \`special\` (mit \`specialType: 'sunny' | 'rainy' | 'wildcard'\`) gespeichert.

### J. Der "Info Autor" (Der Reiseführer)
**Aufgabe:** Schreibt die redaktionellen Kapitel (A-Z) für den "Info"-Bereich.
* **Template:** \`infoAutor.ts\`
* **Input (Dynamic Multi-City):** \`prepareInfoAutorPayload\` scannt automatisch alle \`places\` nach \`districts\`/\`city_info\` sowie die Route und generiert für jede besuchte Stadt und jedes gewählte Info-Thema eigene Kapitel.
* **Geo-Context Guard:** Erweitert Städtenamen zwingend um das Land/die Region (z.B. "Wolkenstein (Italien)"), um geografische Halluzinationen zu blockieren.
* **Output:** \`ContentChapter\` Array in \`project.data.content.infos\`.

### K. Der "Chefredakteur" (Der Detail-Liebhaber)
**Aufgabe:** Schreibt ausführliche, inspirierende Beschreibungen inkl. Spaziergang-Waypoints für ausgewählte Highlights.
* **Template:** \`chefredakteur.ts\`
* **Persona-Injection:** Bekommt Nationalität, Hobbys und Vibe (\`writer\`-Rolle), um relevante Details und Fotospots einzubauen.
* **Smart Mode:** Überspringt im Smart-Modus automatisch Orte, die bereits einen gültigen \`detailContent\` (\`>= 50\` Zeichen) besitzen.
* **Output:** \`detailContent\`, \`reasoning\`, \`waypoints\`.

---

## 4. Daten-Integrität & Fehler-Korrektur (Global)

1.  **Strict Typing:** Alle Outputs entsprechen den TypeScript-Interfaces in \`src/core/types/\`.
2.  **SSOT:** Alle Agenten schreiben ihre Ergebnisse via \`ResultProcessor\` in den zentralen \`useTripStore\`.
3.  **Data Persistence:** Bestehende Felder (wie Hotel-Kategorie, bestehende Guide-Awards oder Detailtexte) werden durch Schutzschilde in den Prozessoren niemals ungewollt überschrieben.
4.  **Validation & Resilience:** Zod-Firewall + Exponential-Backoff Retry-Loop im \`TripOrchestrator\` schützen vor Struktur-Brüchen und Rate-Limits (429).
`
  }
};
// --- END OF FILE 189 Zeilen ---