// 01.02.2026 15:00 - DOCS: Updated Architecture (SightCard Split, SSOT Logistics, Path Fixes).
// 27.01.2026 16:00 - DOCS: FINAL SYSTEM LAW.
// 1. Added Section 10 "The Orchestrator Core".
// 2. Added Section 11 "Gemini Developer Protocols" incl. Strict Code Integrity.
// 3. Added Mandatory "Handshake" Rule (Confirmation Requirement).
// src/data/Texts/briefing.ts

export const briefing = {
  de: {
    title: "Projekt Briefing V40",
    content: `# PROJECT BRIEFING: Papatours V40 (Modern Architecture)

### 1. Projektübersicht
Der "Papa-Tours Reiseplan-Generator V40" ist eine moderne **Progressive Web Application (PWA)**, entwickelt mit **React, TypeScript und Vite**.
Wie der Vorgänger ist es eine clientseitige Anwendung, die keine eigene Server-Infrastruktur benötigt. Sie nutzt die **Google Gemini API** (Version 1.5 Pro & Flash), um hochkomplexe, logistisch validierte Reisepläne zu generieren.

**Kern-Philosophie V40:**
Das System behält die Logik der "Orchestrierte Intelligenz" (The Magic Chain) bei, setzt sie aber auf ein **typsicheres, reaktives Fundament**.
* **Stateless UI:** Die Oberfläche reagiert nur noch auf Zustandsänderungen im Store.
* **Configurable AI Matrix:** Modelle und Limits sind zur Laufzeit konfigurierbar (Settings Modal).
* **Single Source of Truth:** Es gibt keine versteckten Datenflüsse mehr.

### 1b. Tech-Stack & Libraries
Damit generierter Code sofort kompilierbar ist, nutze ausschließlich diesen Stack:
* **Core:** React 18, TypeScript 5, Vite (PWA Mode).
* **State Management:** Zustand (mit Slice-Pattern).
* **Data Processing:** ResultProcessor (Service Pattern).
* **Styling:** Tailwind CSS (Utility First).
* **Icons:** Lucide React.
* **Maps:** Leaflet & React-Leaflet (OpenStreetMap).
* **Date Handling:** Native Date API (oder date-fns wenn nötig).
* **Deployment:** Wir verwenden Vercel.com.

---

### 2. Architektur & Dateistruktur (Slices Edition)

Das Herzstück der V40 ist der **modulare Zustand Store**. Um das "God Object" Problem zu vermeiden, wurde der Store in thematische "Slices" zerlegt.
Die UI ist in **Feature-Ordnern** organisiert (\`src/features/...\`).

#### A. STATE MANAGEMENT (Zustand Slices)
Der Store (\`useTripStore\`) ist ein Assembler, der folgende Slices zusammenfügt:
1.  **ProjectSlice** (\`src/store/slices/createProjectSlice.ts\`):
    * Hält das \`project\`-Objekt (UserInputs, Daten).
    * Verwaltet Laden (Hybrid: JSON/File) und Speichern.
2.  **UISlice** (\`src/store/slices/createUISlice.ts\`):
    * Steuert Views (\`welcome\`, \`wizard\`, \`analysis\`).
    * Steuert die **Anreicherer-UI** (Filter, Listenansicht, Map-View-Mode).
    * Verwaltet \`selectedPlaceId\` für bidirektionale Navigation.
3.  **SystemSlice** (\`src/store/slices/createSystemSlice.ts\`):
    * Infrastruktur: API-Key, AI-Settings (Modell-Matrix, Chunk-Limits).
    * Logging: **Flight Recorder** (Auto-Logging aller KI-Calls).
4.  **AnalysisSlice** (\`src/store/slices/createAnalysisSlice.ts\`):
    * Speichert Ergebnisse der KI-Tasks (z.B. ChefPlaner).

#### B. DATA PROCESSING LAYER (Neu seit V40.3)
Um "God Objects" zu vermeiden, wurde die Datenverarbeitung aus der UI entfernt.
* **ResultProcessor** (\`src/services/ResultProcessor.ts\`):
    * Zentraler Service für alle KI-Antworten.
    * Beinhaltet die **"ID Factory"** (Strict Type Conversion): Wandelt Strings sofort in Objekte um.
    * Manipuliert den Store direkt via \`useTripStore.getState()\`.
    * **Content Router:** Entscheidet basierend auf der Kategorie, ob Daten in \`data.places\` (Karte/Guide) oder \`data.content.infos\` (InfoView) landen.
* **useTripGeneration** (\`src/hooks/useTripGeneration.ts\`):
    * Reiner UI-Hook (Queue, Status, Notifications).
    * Delegiert Datenlogik an \`ResultProcessor\`.

#### C. COMPONENT ARCHITECTURE (UI Refactoring)
Wir vermeiden "Blob-Komponenten" (>500 Zeilen).
* **SightsView:** Die Hauptansicht (\`SightsView.tsx\`) delegiert komplexe UI-Logik an Sub-Komponenten.
* **SightsMapView:** Kapselt die Leaflet-Karte, Custom Marker und Zoom-Logik.
* **SightFilterModal:** Die Filter-Logik ist komplett in \`SightFilterModal.tsx\` ausgelagert.
* **SightCard:** Modularisierte Architektur (Header, Meta, Body) zur Vermeidung von Monolithen.

#### D. PROMPT GENERATION (Preparer Pattern) - NEU V40.4
Die Logik zur Erstellung von Prompts wurde entkoppelt, um Templates "dumm" und wartbar zu halten:
1.  **Preparer** (\`src/core/prompts/preparers/...\`):
    * Enthält die **reine Business-Logik** (z.B. "Filtere Stadt-Infos für Heimatort heraus", "Inlandsreise-Check").
    * Bereitet das Payload-Objekt vor und wählt die passenden Texte aus \`interests.ts\`.
2.  **PayloadBuilder** (\`src/core/prompts/PayloadBuilder.ts\`):
    * Die "Weiche" (Dispatcher). Wählt den richtigen Preparer basierend auf dem TaskKey.
    * Kapselt Slicing-Logik (Chunks) für Batch-Verarbeitung.
3.  **Template** (\`src/core/prompts/templates/...\`):
    * **Rein:** Wandelt das vorbereitete Payload-Objekt in den finalen String.
    * Enthält KEINE Geschäftslogik mehr (keine hardcodierten Logistik-Fragen).
    * Nutzt den **PromptBuilder** für Struktur (Role, Context, Instructions).

---

### 3. Zentrale Datenstrukturen (Core Types)

Alles basiert auf dem Interface \`TripProject\` (in \`src/core/types.ts\`):

\`\`\`typescript
interface TripProject {
  meta: { id, version, created... };
  userInputs: { ... }; // Travelers, Dates, Logistics
  analysis: {
      chefPlaner: ChefPlanerResult;   // Fundamentalanalyse
      routeArchitect?: RouteArchitectResult; // Rundreise-Optionen
      geoAnalyst?: GeoAnalystResult; // Hotel-Strategie
      // NEU V40.2:
      tourGuide?: TourGuideResult;   // Touren-Definitionen
      ideenScout?: IdeenScoutResult; // Flex-Optionen
  };
  data: {
      // 1. GUIDE VIEW (Physische Orte & Aktivitäten)
      // Hier landen: Museen, Wandern, Sport, Natur, Restaurants, Hotels (als Marker).
      places: Record<string, Place>;  // IMMER mit ID (UUID v4).
      routes: Record<string, Route>;
      
      // 2. INFO VIEW (Reines Wissen & Texte)
      // Hier landen: Reiseinfos, Budget, Anreise, Stadtinfos, Ignored Places.
      content: {
          infos: ContentChapter[]; // Array<{id, title, content, type}>
      };
  };
  itinerary: { days: DayPlan[] };    // Der finale Plan
}
\`\`\`

---

### 4. Prompt-Engineering 2.1 (The "Silence Protocol")

In V40 nutzen wir das Builder Pattern (\`PromptBuilder\`). Aufgrund von "Chatty AI" Problemen (besonders bei Flash) gilt ein verschärftes Protokoll.

#### A. The Anti-Chatty Protocol (System Guard)
Die API-Einstellung \`response_mime_type: 'application/json'\` allein reicht für kleinere Modelle oft nicht aus.
Wir erzwingen JSON-Konformität durch **In-Prompt-Constraints**:

1.  **System OS Update:**
    \`"NO PREAMBLE. NO MARKDOWN. START DIRECTLY WITH THE REQUIRED CHAR ('{' or '[')."\`
    Die KI darf keinen Text vor dem JSON generieren ("Here is your JSON...").
    *Hinweis:* Der \`PromptBuilder\` setzt dynamisch \`{\` für Objekte und \`[\` für Listen.
2.  **Thinking Container:**
    Der "Thought Process" (CoT) ist essenziell für Qualität, darf aber das JSON nicht brechen.
    **Regel:** Denken findet **innerhalb** des JSON-Keys \`_thought_process\` statt.
    \`"Principle: Thinking MUST happen INSIDE the JSON key '_thought_process'."\`
3.  **Language & Structure Separation:**
    * **KEYS sind Code:** JSON-Keys müssen strikt **Englisch** bleiben (passend zu TypeScript).
    * **VALUES sind Content:** Der Inhalt (Values) muss in der vom User gewählten Sprache sein (meist Deutsch).
    * *System Guard:* "You must NEVER translate JSON KEYS."

#### B. Context Injection & Builder
1.  **Builder-Klasse:** Instanziierung via \`PromptBuilder\`.
2.  **Context Injection:** Daten werden strukturiert via \`builder.addContext()\` übergeben, nie als Prosatext.
3.  **Strict Schema:** Jeder Prompt endet mit einem Zod-kompatiblen JSON-Schema.

---

### 5. Sicherheits- & Qualitäts-Protokolle

1.  **Type Safety First:** \`any\` ist verboten (außer bei expliziten Casts für gemischte Datenstrukturen).
2.  **Strict Separation:** Keine Logik im UI, kein UI-String-Building im Service.
3.  **Validation:** Zod Schemas für alle KI-Antworten.
4.  **Internationalisierung (i18n):** Daten-Objekte nutzen \`LocalizedContent\`.
5.  **Zero Error Policy:** JSON-Validierung im Orchestrator verhindert UI-Abstürze.
6.  **Strict Data Integrity (ID Factory):**
    * Strings aus KI-Antworten werden im \`ResultProcessor\` sofort in Objekte \`{id: uuid(), name: ...}\` umgewandelt.
    * Es gelangen niemals "nackte" Strings in den Store.
7.  **Strict Output Filter (PayloadBuilder):**
    * Bevor Daten an den "Anreicherer" gehen, filtert \`sliceData\` alle Objekte ohne ID heraus.

---

### 6. The Life of a Prompt (The Chain explained)

Verständnis-Beispiel für den Task "Anreicherer":

1.  **Start (UI):** Der User klickt "Details suchen". Der \`useTripGeneration\` Hook feuert Task \`anreicherer\`.
2.  **Routing (PayloadBuilder):**
    * Der \`PayloadBuilder\` sieht \`task: anreicherer\`.
    * Er ruft \`prepareAnreichererPayload(project)\` auf.
3.  **Preparation (Preparer Logic):**
    * Der Preparer prüft: Welche Orte haben noch keine Details?
    * Er wendet Limits an (z.B. max 5 pro Batch).
    * Er gibt ein reines Daten-Objekt (Payload) zurück: \`{ candidates: [...], searchRadius: "5km" }\`.
4.  **Construction (Template):**
    * Der \`PayloadBuilder\` übergibt das Payload an \`templates/anreicherer.ts\`.
    * Das Template nutzt \`PromptBuilder\`, um Role, Context und JSON-Schema zu setzen.
    * Es injiziert die \`validCategories\` (SSOT aus \`interests.ts\`).
5.  **Execution (Orchestrator):**
    * Der Prompt geht an Gemini. Gemini antwortet mit JSON.
6.  **Processing (ResultProcessor):**
    * Das JSON landet im \`ResultProcessor\`.
    * Er matched die neuen Details via ID auf die existierenden Orte im Store.
    * Er speichert die Daten. UI aktualisiert sich.

---

### 7. Business Rules & UI Standards

**A. Die "Reserve"-Logik (SightsView)**
Ein Ort kommt in die Reserve, wenn: Prio -1, Dauer < min, oder Rating < min.
Orte ohne Rating bleiben in der Hauptliste.

**B. UI-Konzept: View Switcher & Map Integration**
Statt einfacher Filter nutzen wir "Sichten" (Views):
1.  **Liste (Standard):** Gruppierung nach Kategorie, Tour, Tag oder A-Z.
2.  **Karte (Leaflet):**
    * **Bidirektionale Navigation:** Klick auf Karte wählt Ort in Liste (Scroll-To). Klick auf Karten-Icon in Liste zoomt auf Ort in Karte.
    * **Strict Color Mapping:** Marker-Farben folgen EXAKT den Keys in \`interests.ts\` (keine Synonyme).
    * **Smart Zoom:**
        * *Initial:* Zeigt alle Orte (FitBounds) ODER fokussiert Auswahl (Zoom 12).
        * *Interaktion:* Klick auf Marker öffnet Popup, verändert aber den Zoom NICHT (Anti-Jumping).
    * **Highlighting:** Aktiver Marker pulsiert und ist größer.

**C. UI-Konzept: Progressive Disclosure (SightCard)**
Details werden stufenweise enthüllt, um die UI ruhig zu halten:
* **Kompakt:** Nur Titel & Icons.
* **Standard:** + Kurzbeschreibung & KPIs.
* **Details:** + Volltext & Reasoning.
* **Steuerung:** Über **+/- Buttons** kann jede Karte individuell "aufgeklappt" werden.

**D. Export & Print**
* **ExportModal:** Ermöglicht das Kopieren der JSON-Daten in die Zwischenablage für externe Tools.
* **PrintModal / PrintReport:** Generiert eine druckoptimierte HTML-Ansicht (ohne UI-Elemente) für PDF-Export.

**E. Logistics Intelligence (SSOT)**
Auswahl eines Hotels in der SightCard schreibt die ID via \`assignHotelToLogistics\` direkt in die Logistik-Daten (Step 1).

---

### 8. Workflow Inventory & Prompt Architecture

**A. Die Wiring-Matrix (Auszug)**

| V40 TaskKey (ID) | Labels | Funktion & Besonderheiten |
| :--- | :--- | :--- |
| \`chefPlaner\` | ChefPlaner | Fundamentalanalyse. |
| \`basis\` | Sammler | **WICHTIG:** Payload-Filter aktiv! Service-Interessen (Hotel/Food) werden hier ausgeblendet ("Double Bind"-Prävention), damit er nur POIs sucht. |
| \`anreicherer\` | Anreicherer | Sucht Details. Nutzt Batching (Default: 5-10 Items). |
| \`guide\` | Guide | Erstellt Cluster/Touren für den View-Switcher. |
| \`details\` | Details | Schreibt lange Texte für "Detail"-View (Liste!). |
| \`tourGuide\` | Tour Guide | (Neu) Definiert Touren-Logik. |
| \`infoAutor\` | Info Autor | Erstellt Text-Kapitel für den InfoView (Logik im Preparer). |

**B. Payload Filtering (Double Bind Fix)**
Der \`PayloadBuilder\` filtert für den Task \`basis\` (Sammler) aktiv alle Interessen heraus, die Services betreffen (Food, Hotel).
*Grund:* Der Prompt verbietet Restaurants ("ABSOLUTELY FORBIDDEN"), aber das User-Profil enthält sie. Dies führt zu Halluzinationen. Der Filter löst diesen Konflikt an der Wurzel.

**C. Hintergrund-Agenten**
Modell-Wahl via Matrix. \`geoAnalyst\`, \`durationEstimator\`, \`foodEnricher\`, \`countryScout\`.

**D. The Orchestrator**
Kapselt \`Select -> Resolve -> Execute -> Validate\`.
Stellt sicher, dass das "Silence Protocol" (Prompt) und der "Native JSON Mode" (API) Hand in Hand arbeiten.

---

### 9. File Inventory (Complete Overview)

Übersicht aller relevanten Projektdateien und ihrer Aufgaben.

#### Core Logic & Services (Das Gehirn)
* **\`src/services/ResultProcessor.ts\`**: Der "Bibliothekar". Nimmt KI-Antworten entgegen, validiert sie, führt IDs zusammen (Fuzzy Matching) und sortiert Daten in \`places\` oder \`content\`.
* **\`src/services/orchestrator.ts\`**: Der "Manager". Steuert den Ablauf (Select Model -> Build Prompt -> Call API -> Process Result).
* **\`src/core/prompts/PayloadBuilder.ts\`**: Die "Weiche". Verbindet jeden Task mit seinem spezifischen Preparer und Template.
* **\`src/core/prompts/PromptBuilder.ts\`**: Fluent API zum Zusammenbauen von Prompts (OS, Context, Instructions, Schema).
* **\`src/services/gemini.ts\`**: Die Schnittstelle zur Google AI API.
* **\`src/services/validation.ts\`**: Zod-Schemas zur Validierung aller KI-Antworten.
* **\`src/services/security.ts\`**: API-Key Management und Verschlüsselung.

#### Documentation & Specs (SSOT)
* **\`src/data/Texts/briefing.ts\`**: Diese Datei. Die Architekturbeschreibung.
* **\`src/data/Texts/prompt_architecture.ts\`**: **[NEU]** Die detaillierte Spezifikation aller Prompts, Agenten, Input-Payloads und Quellen-Matrix (Food Scout). **Verbindlich für alle Prompt-Änderungen.**
* **\`src/data/Texts/agent_manifest.ts\`**: Das "Manifest" der KI-Persönlichkeiten.

#### Preparers (Business Logic Layer) - \`src/core/prompts/preparers/\`
* **\`prepareInfoAutorPayload.ts\`**: Filtert Logistik-Infos (Heimatort, Inlandsreise) und stellt Text-Aufgaben zusammen.
* **\`prepareChefPlanerPayload.ts\`**: Bereitet User-Inputs und Interessen für die Erstanalyse vor.
* **\`prepareAnreichererPayload.ts\`**: Kümmert sich um das Batching und Slicing von Orten für die Detail-Suche.
* **\`prepareBasisPayload.ts\`**: Extrahiert relevante Interessen für die POI-Suche.
* **\`prepareChefredakteurPayload.ts\`**: Wählt Orte für die detaillierte Beschreibung aus.

#### Templates (Text Generation Layer) - \`src/core/prompts/templates/\`
* **\`infoAutor.ts\`**: Rendert die Anweisungen für den Info-Autor (ohne eigene Logik).
* **\`chefPlaner.ts\`**: Prompt für die Fundamentalanalyse.
* **\`basis.ts\`**: Prompt für die POI-Suche ("Sight Collector").
* **\`anreicherer.ts\`**: Prompt für Detailsuche ("Enricher").
* **\`chefredakteur.ts\`**: Prompt für ausführliche Beschreibungen.
* **\`foodScout.ts\` / \`hotelScout.ts\`**: Prompts für die Suche nach Restaurants und Hotels.
* **\`routeArchitect.ts\`**: Prompt für die Routenberechnung.
* **\`tourGuide.ts\`**: Prompt für die Touren-Planung.
* **\`geoAnalyst.ts\`**: Prompt für geografische Analysen.
* **\`initialTagesplaner.ts\`**: Prompt für die erste Tagesplanung.

#### Store & Data (Das Gedächtnis)
* **\`src/store/useTripStore.ts\`**: Der zentrale Zustand (Zustand Assembler).
* **\`src/store/slices/createProjectSlice.ts\`**: Verwaltet Projektdaten (Laden/Speichern).
* **\`src/store/slices/createUISlice.ts\`**: Steuert UI-Zustände (Views, Modale).
* **\`src/store/slices/createSystemSlice.ts\`**: System-Settings und Logging.
* **\`src/data/interests.ts\`**: Die zentrale Datenbank für Interessen, Labels und redaktionelle Anweisungen (V30 Quality).
* **\`src/data/Texts/agent_manifest.ts\`**: Die "Living Documentation". Enthält das Goldene Prompt-Protokoll und die Definition aller Agenten-Rollen. Wird vom PromptBuilder zur Laufzeit referenziert (Self-Reflection).
* **\`src/core/types.ts\`**: TypeScript-Interfaces für das gesamte Projekt.

#### UI Features (Das Gesicht) - \`src/features/Cockpit/\`
* **\`SightsView.tsx\`**: Hauptansicht für Orte (Liste/Karte).
* **\`SightsMapView.tsx\`**: Die Kartenkomponente.
* **\`src/features/Cockpit/SightCard/\`**: Modularisierter Ordner (Header, Meta, Body, Index).
* **\`CockpitWizard.tsx\`**: Der Assistent, der den User durch den Prozess führt.
* **\`SettingsModal.tsx\`**: Einstellungen für KI-Modelle.
* **\`ExportModal.tsx\` / \`PrintModal.tsx\`**: Export-Funktionen.
* **\`SightFilterModal.tsx\`**: Filterung der Orte.

#### UI Features - Steps (\`src/features/Cockpit/steps/\`)
* **\`ProfileStep.tsx\`**: Eingabe des Reiseprofils (Pace, Budget).
* **\`InterestsStep.tsx\`**: Auswahl der Interessen.
* **\`LogisticsStep.tsx\`**: Eingabe von Reisedaten und Orten.
* **\`TravelerStep.tsx\`**: Eingabe der Reisenden.

#### UI Features - Info (\`src/features/info/\`)
* **\`InfoView.tsx\`**: Ansicht für Text-Kapitel (Reiseinfos, Budget). Zeigt Daten aus \`data.content.infos\`.

---

### 10. The Orchestrator Core & Chunking Strategy
Der \`TripOrchestrator\` ist das Gehirn der Anwendung. Er verwaltet nicht nur API-Calls, sondern implementiert komplexe Business-Logik.

**A. Intelligent Sequencing (The Magic Chain)**
Agenten arbeiten nicht isoliert. Der Orchestrator kennt Abhängigkeiten:
* **Auto-Trigger:** Erkennt der Orchestrator einen \`foodScout\` Task, startet er automatisch im Anschluss den \`foodEnricher\`.
* **Resultat:** Wir erhalten nicht nur Namen, sondern angereicherte Details (Öffnungszeiten, Awards) in einem Fluss.

**B. The Chunking Engine (Scaling)**
Das System verarbeitet große Datenmengen (z.B. 50 Sights) stabil durch "Smart Chunking":
* **Hybrid-Modus:**
    * *Auto (API-Key):* Sequenzielle Abarbeitung im Hintergrund mit Rate-Limit-Schutz (500ms Delay).
    * *Manual:* Fallback auf UI-Loop für Copy-Paste ohne Key.
* **Incremental Saving:** Ergebnisse werden sofort gespeichert (\`ResultProcessor\`), der User sieht den Fortschritt live.
* **Smart Merge:** Arrays (Tagespläne) werden angehängt, Objekte (Places) werden intelligent zusammengeführt.

**C. Defense Layer (Zero Error)**
* **Model Matrix:** Dynamische Wahl des Modells (Pro vs. Flash) basierend auf Task-Komplexität und User-Settings.
* **Zod Firewall:** Jede KI-Antwort wird *nach* dem Empfang gegen das \`validation.ts\` Schema geprüft. Invalide Daten erreichen niemals den Store.

---

### 11. Gemini Developer Protocols (Strict Implementation Rules)
Dieses Protokoll gilt für jeden Entwickler (Mensch oder KI), der Code für Papatours V40 generiert.

#### A. Separation of Concerns (Core vs. UI)
* **Keine UI in Core-Logik:** Dateien in \`src/core/workflow\` oder \`src/services\` dürfen niemals JSX zurückgeben. Sie dürfen nicht auf \`document\` oder \`window\` zugreifen. Sie müssen Node-kompatibel und testbar sein.
* **Keine Business-Logik in der UI:** React-Komponenten (\`src/features/...\`) sind reine "dumme" Views. Sie dürfen Daten nur anzeigen und User-Events feuern. Komplexe Berechnungen (z.B. Routen-Optimierung) sind verboten.

#### B. State Management (SSOT)
* **The Only Truth:** \`src/store/useTripStore.ts\` ist die einzige Quelle der Wahrheit.
* **Mutation Ban:** UI-Komponenten dürfen den State niemals direkt mutieren (kein \`state.value = x\`). Sie müssen definierte Actions aus dem Store aufrufen.
* **Reactive Rendering:** Kein manuelles \`updateUI()\`. React kümmert sich automatisch um das Re-Rendering bei State-Änderungen.

#### C. Type Safety & Integrity
* **Zero Any Policy:** Verwende keine \`any\`-Typen, es sei denn, es ist explizit genehmigt.
* **Interface Usage:** Greife immer auf die zentralen Interfaces aus \`src/core/types.ts\` zurück.
* **Module Boundaries:** Ein Prompt-Template importiert keine UI-Komponenten. Eine UI-Komponente ruft niemals direkt die Gemini-API auf (nutze \`useTripGeneration\` oder \`GeminiService\`).

#### D. The "Strict Code Integrity Protocol" (Process Rules)
Jeder Eingriff in den Code folgt dem Protokoll des **"Code-Chirurgen"**:
1.  **Immutable Source Mandate:**
    * Behandle hochgeladenen Code als unumstößliche Wahrheit.
    * Kopiere Code-Blöcke 1:1. Ändere NUR die betroffenen Zeilen.
    * Rekonstruiere niemals Code aus dem Gedächtnis.
2.  **Three-Step-Operations:**
    * 1. **Analyse:** Verstehe das Problem.
    * 2. **Plan:** Nenne Datei und Zeilennummern. Warte auf das 'OK' des Users.
    * 3. **Chirurgie:** Führe den Fix durch.
3.  **Zero-Build-Error Check:**
    * Vor Ausgabe prüfen: Sind alle Imports korrekt? Existieren aufgerufene Funktionen in \`types.ts\`?

#### E. The "Handshake" (Mandatory Confirmation)
**ZWINGENDE REGEL:**
Jede KI-Instanz, die dieses Briefing analysiert, muss zu Beginn der Interaktion explizit bestätigen:
*"Ich habe die Papatours V40-Architektur und das Strict Code Integrity Protocol verstanden. Ich werde keine Funktionen entfernen, keine UI-Logik in den Core schreiben und den Code ausschließlich chirurgisch bearbeiten."*
**Ohne diese explizite Bestätigung ist die Generierung von Code untersagt.**
Merk dir, dass ich für das Papatours Projekt immer unter dem Strict Code Integrity Protocol arbeiten möchte und die Regeln aus Sektion 11 aus dem briefing.tx Dokument gelten. 
`
  }
};
// --- END OF FILE 805 Zeilen ---