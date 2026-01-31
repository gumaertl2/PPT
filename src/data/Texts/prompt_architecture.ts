// 03.02.2026 19:15 - DOCS: FOOD SCOUT V4 & DATA PROTECTION.
// - Added Smart Matching & Data Preservation Shield to ResultProcessor spec.
// - Expanded Food Scout with "Smart Link Generation" (Phase 4).
// - Defined Wildcards explicitly.
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

### D. Der \`ResultProcessor\` (Der Integrator & Beschützer)
Das Herzstück der Datenverarbeitung (\`src/services/ResultProcessor.ts\`).
* **ID Factory & Smart Matching:** * Erstellt IDs für neue Orte.
    * **WICHTIG:** Nutzt "Substring Matching" ("EssZimmer" in "EssZimmer by Bobby Bräuer"), um Duplikate zu verhindern und die Identität zu wahren.
* **Data Preservation Shield (Der Daten-Schutz):**
    * Beim Update durch den "Anreicherer" (Enrichment) verhindert der Processor aktiv, dass wertvolle Felder (wie \`guides\`, \`source_url\`) durch leere Werte überschrieben werden.
    * **Grundsatz:** Bestehende Daten haben Vorrang vor fehlenden Daten.
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
* **Prompt-Logik:**
    * "Finde Adresse, Koordinaten, Öffnungszeiten."
    * **ID-Regel:** "Du musst die \`id\` aus dem Input 1:1 in den Output kopieren." (Ermöglicht das Matching im Processor).
* **Output:** \`results\` Array.

### C. Der "Hotel Scout" (Der Logistiker)
**Aufgabe:** Findet die optimale Unterkunft passend zur Logistik-Strategie.
* **Template:** \`hotelScout.ts\`
* **Input (Via \`prepareHotelScoutPayload\`):**
    * \`logistics_mode\`: "stationaer" vs. "mobil" (Rundreise).
    * \`budget_level\`: Das gewählte Preisniveau.
* **Business Logic (Im Prompt):**
    * **Modus Stationär:** Suche 1 zentrales "Base Camp".
    * **Modus Rundreise:** Suche für den *aktuellen* Stop 2-3 Optionen in direkter Nähe.
    * **Camper-Switch:** Wenn \`logistics_type == camper\`, suche **ausschließlich** Campingplätze/Stellplätze.
    * **Preis-Treue:** Striktes Einhalten des \`budget_level\`.

### D. Der "Food Scout" & "Food Enricher" (Die Kulinarik-Experten)
**WICHTIG:** Dieser Workflow besteht aus zwei strikt getrennten Phasen, um die Qualität zu sichern.

#### Phase 1: Der Food Scout (Der Quellen-Finder)
* **Template:** \`foodScout.ts\`
* **Aufgabe:** Erstellt einen "Kandidaten-Pool" basierend auf renommierten Guides (Michelin, Gault&Millau, etc.).
* **Regeln (The Law):**
    * **Strict Source Enforcement:** Restaurants OHNE validen Guide werden verworfen.
    * **Smart Link Generation (Phase 4):** Der Scout MUSS aktiv eine \`source_url\` generieren (z.B. direkter Link zur Michelin-Suche), damit der User die Quelle prüfen kann.
* **Output:** Kandidaten mit \`name\`, \`guides\` (Liste) und \`source_url\`.

#### Phase 2: Der Food Enricher (Der Fakten-Checker)
* **Template:** \`foodEnricher.ts\`
* **Aufgabe:** Veredelt den Kandidaten-Pool mit Details (Google Maps Daten).
* **Daten-Schutz:**
    * Der Enricher liefert KEINE Guides.
    * Der **ResultProcessor** muss sicherstellen, dass die Guides und URLs aus Phase 1 beim Speichern der Phase-2-Daten **nicht gelöscht** werden.

### E. Der "ChefPlaner" (Der Stratege)
**Aufgabe:** Fundamentalanalyse vor der eigentlichen Planung.
* **Template:** \`chefPlaner.ts\`
* **Input (Via \`prepareChefPlanerPayload\`):**
    * Komplettes Profil: \`travelers\`, \`dates\`, \`logistics\`, \`interests\`.
* **Output:** \`strategic_briefing\`, \`smart_limit_recommendation\`.

### F. Der "Route Architect" (Der Logistik-Meister)
**Aufgabe:** Berechnet die optimale Route für Rundreisen oder die Verteilung von Stationen.
* **Template:** \`routeArchitect.ts\`
* **Logik:**
    * Optimiert die Reihenfolge der Stops.
    * Prüft, ob die Fahrzeiten realistisch sind.
* **Output:** Optimierte Liste von \`stops\` mit \`drive_time\`.

### G. Der "Tour Guide" (Der Clusterer)
**Aufgabe:** Ordnet die gefundenen POIs (\`places\`) logischen "Touren" oder "Tagen" zu.
* **Template:** \`tourGuide.ts\`
* **Logik:** Bildet geografische Cluster ("Tag 1: Altstadt", "Tag 2: Umland").
* **Output:** \`tour_suggestions\`.

### H. Der "Transfer Planner" & "Duration Estimator" (Die Realisten)
**Aufgabe:** Berechnet Wegezeiten zwischen Orten.

---

## 3. Die Agenten-Matrix: Redakteure (Phase 3)

### I. Der "Ideen Scout" (Der Joker)
**Aufgabe:** Liefert Alternativen, wenn der Plan zu leer ist oder das Wetter schlecht wird.
* **Template:** \`ideenScout.ts\`
* **Szenarien:**
    * **Sunny:** Outdoor.
    * **Rainy:** Indoor.
    * **Wildcard:** Überraschungen ("Hidden Gems"), die bewusst vom Profil abweichen dürfen.
* **Visualisierung:** Wildcards werden im Frontend explizit als solche markiert.

### J. Der "Info Autor" (Der Reiseführer)
**Aufgabe:** Schreibt die redaktionellen Kapitel für den "Info"-Bereich.
* **Template:** \`infoAutor.ts\`
* **Output:** \`ContentChapter\`.

### K. Der "Chefredakteur" (Der Detail-Liebhaber)
**Aufgabe:** Schreibt ausführliche, inspirierende Beschreibungen für ausgewählte Top-Highlights.
* **Template:** \`chefredakteur.ts\`
* **Output:** \`detailContent\` (Langer Text mit Zwischenüberschriften).

---

## 4. Daten-Integrität & Fehler-Korrektur (Global)

1.  **Strict Typing:** Alle Outputs müssen den TypeScript-Interfaces in \`types.ts\` entsprechen.
2.  **SSOT:** Alle Agenten schreiben ihre Ergebnisse via \`ResultProcessor\` in den zentralen \`TripStore\`.
3.  **Data Persistence:** Bestehende Felder dürfen bei Updates niemals ungewollt gelöscht werden. Der \`ResultProcessor\` fungiert als Schutzschild für Daten, die nur in Phase 1 (Scout) verfügbar sind.
4.  **Validation:** Zod-Firewall schützt vor Struktur-Brüchen.
`
  }
};
// --- END OF FILE 310 Zeilen ---