// 01.02.2026 16:45 - DOCS: SSOT SYNC. Aligned Specs with actual Code (Templates & Types).
// ChefPlaner: strategy_analysis -> strategic_briefing.
// Basis: candidates (String List).
// src/data/Texts/prompt_architecture.ts

export const promptArchitecture = {
  de: {
    title: "Prompt Architektur & Agenten V40",
    content: `# Papatours V40: Die Prompt-Architektur & Agenten-Spezifikation (Real-World Edition)

Dieses Dokument ist die technische "Single Source of Truth" für die Interaktion mit der Google Gemini API. Es beschreibt die Pipeline, die Datenquellen und die exakte Arbeitsweise jedes Agenten, synchronisiert mit der Code-Basis.

---

## 1. Die Infrastruktur: Factory & Processor

In V40 werden Prompts niemals "einfach so" als Strings geschrieben. Sie durchlaufen eine strikte Pipeline, die Typ-Sicherheit und JSON-Validität garantiert.

### A. Der \`PromptBuilder\` (Die Konstruktions-Maschine)
Er ist die einzige erlaubte Methode, um Prompts zu erstellen. Er erzwingt das "Silence Protocol".
* **Funktion:** Fluent API (\`new PromptBuilder().withRole()...\`).
* **Aufgaben:**
    1.  **Role Injection:** Setzt die Persona (z.B. "Du bist der Hotel-Scout").
    2.  **Context Injection:** Formatiert Datenobjekte als strukturierte Listen, nie als Prosa.
    3.  **JSON Enforcing:** Fügt automatisch die Instruktion \`START DIRECTLY WITH '{'\` hinzu.
    4.  **Schema Binding:** Hängt am Ende das erwartete JSON-Schema an.

### B. Der \`PayloadBuilder\` & die \`Preparer\` (Die Daten-Schleuse)
Bevor ein Prompt gebaut wird, müssen die Daten gesammelt werden. Dies geschieht in den \`src/core/prompts/preparers/\`.
* **Prinzip:** Trennung von Datenbeschaffung (Code) und Textgenerierung (Template).
* **Aufgabe:** Extrahiert aus dem riesigen \`TripProject\` State **nur** die für den spezifischen Agenten relevanten Daten.
* **Beispiel:** Der \`HotelScout\` bekommt nicht "alles", sondern ein präzises Objekt mit \`logistics_mode\`, \`budget\` und dem *aktuellen* Stop der Rundreise.

### C. Die \`Validation\` (Die Firewall)
Keine KI-Antwort darf ungeprüft in das System.
* **Technik:** Zod-Schemas (\`src/services/validation.ts\`).
* **Prozess:** Jedes JSON von Gemini wird *vor* der Weiterverarbeitung gegen das Schema geparst.
* **Konsequenz:** Fehlerhafte Strukturen führen zu einem kontrollierten Fehler, statt die UI crashen zu lassen.

### D. Der \`ResultProcessor\` (Der Integrator)
Das Herzstück der Datenverarbeitung (\`src/services/ResultProcessor.ts\`).
* **ID Factory:** Wandelt Strings ("Hotel Ritter") in Datenbank-Objekte um (\`{ id: uuid(), name: "Hotel Ritter"... }\`).
* **ID Pass-through:** Beim "Anreicherer" sorgt er dafür, dass die eingehende ID (\`candidates[0].id\`) exakt auf das Ergebnis gemappt wird.
* **Content Router:** Entscheidet:
    * Ist es ein Ort? -> Ab in \`project.data.places\`.
    * Ist es Text-Wissen? -> Ab in \`project.data.content.infos\`.
* **State Mutation:** Führt das Update im \`useTripStore\` durch (SSOT).

---

## 2. Die Agenten: Spezifikation & Datenfluss

### A. Der "Basis" Agent (Der Sammler)
**Aufgabe:** Identifiziert POIs (Points of Interest), die zu den Interessen passen.
* **Template:** \`basis.ts\`
* **Input (Via \`prepareBasisPayload\`):**
    * \`destination\`: Zielregion oder Stadt.
    * \`interests\`: Liste der aktiven Interessen-IDs (z.B. \`history\`, \`nature\`).
    * **CRITICAL FILTER:** Der Preparer filtert hier aktiv alle Service-Interessen (Restaurants, Hotels) *heraus*. Grund: Der Prompt enthält die strikte Regel "NO HOTELS/RESTAURANTS", um Halluzinationen zu vermeiden.
* **Output (Code-Sync):**
    * \`candidates\`: Liste von Strings (Namen).
    * \`_thought_process\`: String (Analyse).

### B. Der "Anreicherer" (Der Veredler)
**Aufgabe:** Sucht zu einer Liste von Namen die harten Fakten.
* **Template:** \`anreicherer.ts\`
* **Input (Via \`prepareAnreichererPayload\`):**
    * \`candidates\`: Liste von Objekten \`{ id, name, search_context }\`.
    * \`batch_size\`: Limitiert auf 5-10 Items pro Call (für Stabilität).
* **Prompt-Logik:**
    * "Finde Adresse, Koordinaten, Öffnungszeiten."
    * **ID-Regel:** "Du musst die \`id\` aus dem Input 1:1 in den Output kopieren." (Ermöglicht das Matching im Processor).
* **Output (Code-Sync):**
    * \`results\`: Array von Objekten (\`id\`, \`valid\`, \`category\`, \`official_name\`, \`location\`, \`address\`, \`description\`, \`openingHours\`, \`rating\`, \`user_ratings_total\`, \`duration\`).

### C. Der "Hotel Scout" (Der Logistiker)
**Aufgabe:** Findet die optimale Unterkunft passend zur Logistik-Strategie.
* **Template:** \`hotelScout.ts\`
* **Input (Via \`prepareHotelScoutPayload\`):**
    * \`logistics_mode\`: "stationaer" vs. "mobil" (Rundreise).
    * \`vehicle_type\`: "car", "camper" (Trigger für Campingplätze), "train".
    * \`budget_level\`: Das gewählte Preisniveau.
    * \`current_stop\`:
        * *Stationär:* Der Zielort (\`stationary.destination\`).
        * *Rundreise:* Der spezifische Stop (z.B. Stop 2: "Region Freiburg").
* **Business Logic (Im Prompt):**
    * **Modus Stationär:** Suche 1 zentrales "Base Camp". Fokus auf strategische Lage für Tagesausflüge (Hub-and-Spoke).
    * **Modus Rundreise:** Suche für den *aktuellen* Stop 2-3 Optionen in direkter Nähe.
    * **Camper-Switch:** Wenn \`logistics_type == camper\`, suche **ausschließlich** Campingplätze/Stellplätze.
    * **Preis-Treue:** Striktes Einhalten des \`budget_level\` (z.B. keine Luxushotels bei "Budget").
* **Output (ResultProcessor):**
    * Speichert Kandidaten in \`data.places\`.
    * Setzt Feld \`category: 'accommodation'\`.
    * Feld \`location_match\`: Begründung der strategischen Eignung.

### D. Der "Food Scout" & "Food Enricher" (Die Kulinarik)
**WICHTIG:** Dieser Agent arbeitet streng nach einer Quellen-Matrix und ignoriert allgemeine Kulinarik-Interessen aus \`interests.ts\`.

#### 1. Food Scout (Der Quellen-basierte Sammler)
* **Template:** \`foodScout.ts\`
**Aufgabe:** Erstellt einen "Kandidaten-Pool" basierend auf renommierten Restaurantführern.

* **Input (Via \`prepareFoodScoutPayload\`):**
    * **Suchgebiet & Radius (Geografische Intelligenz):**
        * Er erhält die \`hotel_data\` (vom gewählten Hotel) und ggf. \`city_districts\`.
        * **Logik:** Er definiert ein Suchgebiet um diese Orte herum.
            * *Beispiel:* Ist der Ort "München", sucht er in "Oberbayern" (ca. 50km Radius).
            * *Beispiel:* Ist der Ort "Rosenheim", sucht er in "Oberbayern" UND "Österreich" (ca. 50km Radius).
            * *Beispiel:* Bei spezifischen Stadtbezirken sucht er nur in der Stadt.
    * **Strategie-Modus:**
        * **Modus A (Guide Suche):** Suche NUR Restaurants in den Führern, die **keine Sterne** haben (z.B. Bib Gourmand, Empfehlungen).
        * **Modus B (Ad-hoc Suche):** Der User gibt explizit vor, ob er Sterne will oder nicht.
    * **Quellen-Matrix (Binding):**
        * Der Scout nutzt die länderspezifische Datenbank (\`countries.ts\`), um gezielt in renommierten Guides zu suchen (z. B. Michelin, Gault&Millau, Slow Food, Falstaff).

* **Prompt-Regeln:**
    * **Ignore Interests:** Der Food-Scout bekommt NICHT die allgemeinen Informationen aus der \`interests.ts\`. Er wendet immer genau die hier definierte Suchstrategie an.
    * **Ziel:** Es wird ein grober „Kandidaten-Pool“ erstellt, der nur Restaurants enthält, die in mindestens einem validen Guide gelistet sind und die Suchstrategie erfüllen.

* **Output:**
    * Kandidaten-Pool mit Namen.
    * Quelle des Funds (inkl. Link, falls möglich).

#### 2. Food Enricher (Der Detail-Prüfer)
* **Template:** \`foodEnricher.ts\`
**Aufgabe:** Veredelt den Kandidaten-Pool mit Details.

* **Input:** Die Liste vom Scout.
* **Logik:** Recherchiert "Hard Facts" und "Soft Facts".
* **Output Felder:**
    * \`signature_dish\`: Was muss man dort essen?
    * \`priceLevel\`: €, €€, €€€.
    * \`user_ratings_total\`: Anzahl der Bewertungen als Qualitäts-Indikator.
    * \`openingHoursHint\`: Kurzform (z.B. "Mo Ruhetag").

### E. Der "ChefPlaner" (Der Stratege)
**Aufgabe:** Fundamentalanalyse vor der eigentlichen Planung.
* **Template:** \`chefPlaner.ts\`
* **Input (Via \`prepareChefPlanerPayload\`):**
    * Komplettes Profil: \`travelers\` (Alter, Gruppe), \`dates\` (Saison, Dauer), \`logistics\` (Modus), \`interests\`.
* **Output (Code-Sync):**
    * \`strategic_briefing\`: Objekt mit \`search_radius_instruction\`, \`sammler_briefing\`, \`itinerary_rules\`.
    * \`smart_limit_recommendation\`: Objekt mit \`value\` (Anzahl) und \`reasoning\`.
    * \`plausibility_check\`: Text.
    * \`corrections\`: Objekt (Typos, Validierung).

### F. Der "Route Architect" (Der Logistik-Meister)
**Aufgabe:** Berechnet die optimale Route für Rundreisen oder die Verteilung von Stationen.
* **Template:** \`routeArchitect.ts\`
* **Input (Via \`prepareRouteArchitectPayload\`):**
    * \`stops\`: Die vom User gewählten Stationen (aus Step 1).
    * \`start/end\`: Start- und Endpunkt der Reise.
    * \`constraints\`: Max. Fahrzeit pro Etappe, Max. Hotelwechsel.
* **Logik:**
    * Optimiert die Reihenfolge der Stops ("Travelling Salesman" light).
    * Prüft, ob die Fahrzeiten realistisch sind.
* **Output:** Optimierte Liste von \`stops\` mit \`drive_time\` und \`distance\`.

### G. Der "Tour Guide" (Der Clusterer)
**Aufgabe:** Ordnet die gefundenen POIs (\`places\`) logischen "Touren" oder "Tagen" zu.
* **Template:** \`tourGuide.ts\`
* **Input (Via \`prepareTourGuidePayload\`):**
    * \`places\`: Alle gefundenen und angereicherten Orte.
    * \`duration\`: Anzahl der verfügbaren Tage.
    * \`hub\`: Der Standort des Hotels (für Radial-Planung).
* **Logik:** Bildet geografische Cluster ("Tag 1: Altstadt", "Tag 2: Umland").
* **Output:** \`tour_suggestions\` (Cluster-Definitionen, die im View-Switcher genutzt werden).

### H. Der "Transfer Planner" & "Duration Estimator" (Die Realisten)
**Aufgabe:** Berechnet Wegezeiten zwischen Orten, wenn keine API verfügbar ist.
* **Templates:** \`transferPlanner.ts\`, \`durationEstimator.ts\`
* **Input:** Liste von Geo-Koordinaten.
* **Output:** Matrix von \`transfer_times\`.

---

## 3. Die Agenten-Matrix: Redakteure (Phase 3)

### I. Der "Info Autor" (Der Reiseführer)
**Aufgabe:** Schreibt die redaktionellen Kapitel für den "Info"-Bereich (nicht Orte, sondern Wissen).
* **Template:** \`infoAutor.ts\`
* **Input (Via \`prepareInfoAutorPayload\`):**
    * \`topics\`: Liste der geforderten Kapitel (z.B. "Anreise", "Budget & Geld", "Kultur-Knigge").
    * \`context\`: Reiseziel, Reisezeit, Reisegruppe.
* **Logik:** Erstellt Markdown-formatierten Content.
* **Output:** Array von \`ContentChapter\` (\`{ id, title, content_markdown }\`), die im \`InfoView\` angezeigt werden.

### J. Der "Chefredakteur" (Der Detail-Liebhaber)
**Aufgabe:** Schreibt ausführliche, inspirierende Beschreibungen für ausgewählte Top-Highlights (Progressive Disclosure: Level 3).
* **Template:** \`chefredakteur.ts\`
* **Input (Via \`prepareChefredakteurPayload\`):**
    * \`place\`: Das spezifische Objekt.
    * \`tone\`: Tonalität ("Begeisternd", "Faktisch").
* **Output:** \`detailContent\` (Langer Text mit Zwischenüberschriften).

### K. Der "Ideen Scout" (Der Joker)
**Aufgabe:** Liefert Alternativen, wenn der Plan zu leer ist oder das Wetter schlecht wird.
* **Template:** \`ideenScout.ts\`
* **Input:** \`weather_forecast\` (simuliert/eingegeben), \`current_plan\`.
* **Output:** \`alternatives\` (Indoor-Optionen, "Hidden Gems").

---

## 4. Legacy & Future

### L. Der "Initial Tagesplaner" (Legacy)
*(Status: Wird refactored. Erstellt aktuell den finalen \`itinerary\`. Soll künftig stärker auf den Ergebnissen des \`TourGuide\` aufbauen.)*

---

## 5. Daten-Integrität & Fehler-Korrektur (Global)

1.  **Strict Typing:** Alle Outputs müssen den TypeScript-Interfaces in \`types.ts\` entsprechen.
2.  **SSOT:** Alle Agenten schreiben ihre Ergebnisse via \`ResultProcessor\` in den zentralen \`TripStore\`. Keine UI-Komponente speichert Daten lokal.
3.  **Validation:** Zod-Firewall schützt vor Struktur-Brüchen.
`
  }
};
// --- END OF FILE 270 Zeilen ---